var wink = require('./lib/winkapi');
var http = require('http');
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {
    //console.log("homebridge API version: " + homebridge.version);

    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    // For platform plugin to be considered as dynamic platform plugin,
    // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
    homebridge.registerPlatform("homebridge-wink", "Wink", Wink, true);
}

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function Wink(log, config, api) {
    var pjson = require('./package.json');
    log("Wink Init - Version " + pjson.version);
    if (!config) {
        log("No Wink Config Present");
        return;
    }
    var that = this;
    var platform = this;
    this.log = log;
    this.config = config;
    this.accessories_configured = {};
    this.accessories_unconfigured = {};
    this.attributeLookup = {};

    // This plugin REQUIRES homebridge's version 2 API.
    // Save the API object as plugin needs to register new accessory via this object.
    this.api = api;
    this.winkAPI = new wink();

    // Load Wink Authentication From Config File
    this.client_id = config["client_id"];
    this.client_secret = config["client_secret"];

    this.username = config["username"];
    this.password = config["password"];

    // Load Groups or IDs that should be hidden from the Config File.
    this.hidegroups = config["hide_groups"];
    this.hideids = config["hide_ids"];
    if (this.hidegroups == undefined) this.hidegroups = [];
    if (this.hideids == undefined) this.hideids = [];

    // If this is true then devices that the Wink hub cannot communicate with will not be registered.
    // In addition, any devices that lose communication will be unregistered which will allow HomeKit to know the device is not accessible.
    this.unregister_disconnected = config["unregister_disconnected"] | false;

    //For Temperatures, what Display unit should we report (C or F)
    this.temperature_unit = config["temperature_unit"];
    if (this.temperature_unit === undefined) this.temperature_unit = "F";

    //Allows specific positional sensors to be treated as Windows instead of Doors
    this.windowsensors = config["window_ids"];
    if (this.windowsensors == undefined) this.windowsensors = [];

    //Allows specific binary switches to be treated as fans instead of switchess
    this.fans = config["fan_ids"];
    if (this.fans == undefined) this.fans = [];

    //Setup events from the Wink API
    this.winkAPI.event_DeviceAdded = platform.addAccessory.bind(this);
    this.winkAPI.event_DeviceRemoved = platform.removeAccessory.bind(this);
    this.winkAPI.event_DeviceChanged = platform.changedAccessory.bind(this);

    //When done launching, start the API.
    this.api.on('didFinishLaunching',
        function () {
            for (myKey in this.accessories_unconfigured) {
                this.addAccessoryCharacteristics(this.accessories_unconfigured[myKey], null);
                delete this.accessories_unconfigured[myKey];
            }
            this.winkAPI.init({
                "seconds_full_refresh": 3600,
                "client_id": platform.client_id,
                "client_secret": platform.client_secret,
                "username": platform.username,
                "password": platform.password,
                "platform": this
            }, function (success, auth_return) {
                if (!success)
                    platform.log("There was a problem authenticating with Wink: " + auth_return.error_description);
                else
                    platform.log("Wink Authentication Successful.");
            });
        }.bind(this));
}

Wink.prototype.addAttributeUsage = function (attribute, deviceid, mycharacteristic) {
    if (!this.attributeLookup[deviceid])
        this.attributeLookup[deviceid] = {};
    if (!this.attributeLookup[deviceid][attribute])
        this.attributeLookup[deviceid][attribute] = [];
    this.attributeLookup[deviceid][attribute].push(mycharacteristic);
}

Wink.prototype.getaddService = function (Accessory, Service) {
    var myService = Accessory.getService(Service);
    if (!myService) myService = Accessory.addService(Service);
    return myService
};
Wink.prototype.getaddCharacteristic = function (Accessory, Service, Characteristic) {
    var myService = this.getaddService(Accessory, Service);
    var myCharacteristic = myService.getCharacteristic(Characteristic);
    if (!myCharacteristic) myCharacteristic = myService.addCharacteristic(Characteristic);
    return myCharacteristic;
}

// Sample function to show how developer can add accessory dynamically from outside event
Wink.prototype.addAccessory = function (device) {
    this.addAccessoryCharacteristics(this.accessories_configured[device.uuid], device);
}

Wink.prototype.addAccessoryCharacteristics = function (inAccessory, device) {
    var newAccessory;
    var platform = this;
    if (inAccessory) {
        device = inAccessory.context;
        newAccessory = inAccessory;
    } else {
        newAccessory = new Accessory(device.name, device.uuid);
        //Check for the device in the pending connections
        newAccessory.context = device;
    }

    var isSupported = false;
    var thisCharacteristic = null;
    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.AccessoryInformation, Characteristic.Manufacturer);
    if (newAccessory.context['device_manufacturer'])
        thisCharacteristic.setValue(newAccessory.context['device_manufacturer']);
    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.AccessoryInformation, Characteristic.Model);
    if (newAccessory.context.manufacturer_device_model)
        thisCharacteristic.setValue(newAccessory.context['manufacturer_device_model']);
    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.AccessoryInformation, Characteristic.SerialNumber);
    thisCharacteristic.setValue(newAccessory.context['object_id']);


    switch (newAccessory.context.object_type) {
        case 'light_bulb':
            //Desired
            //powered	boolean	whether device is powered on
            //brightness	float	0.0 to 1.0, dimness level (binary_switch and light_bulb)
            //color_model	(string)	one of: "xy", "hsb", "color_temperature", or "rgb"
            //color_x	(float, precision 4)	the CIE 1931 coordinates of the bulb's color [0.0, 1.0]
            //color_y	(float, precision 6)	he CIE 1931 coordinates of the bulb's color [0.0, 1.0]
            //hue	(float, precision 6)	the 360-degree value of the bulb's color (normalized to 1.0)
            //saturation	(float, precision 6)	the percentage value of the bulb's saturation (normalized to 1.0) [0.0, 1.0]
            //color_temperature	(integer)	the Kelvin value of the bulb's color [2000 .. 6500]
            //color	(string)	the hexadecimal value of the bulb color (without a leading '#')
            //powering_mode	(string)	one of "dumb", "smart", "none" or null
            //Reading
            //connection	Boolean	whether or not the device is reachable remotely
            var fan = !!(platform.fans.indexOf(newAccessory.context.object_id) + 1);

            if (fan) {
                //If id is included in list of fans we treat as a fan
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Fan, Characteristic.On)
                    .on('get', function (callback) {
                        callback(null, newAccessory.context.last_reading['powered']);
                    }.bind(newAccessory))
                    .on('set', function (value, callback) {
                        platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "powered": value }, callback);
                    }.bind(newAccessory));
                platform.addAttributeUsage('powered', newAccessory.context.uuid, thisCharacteristic);


                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Fan, Characteristic.RotationSpeed)
                    .on('get', function (callback) {
                        callback(null, Math.floor(newAccessory.context.last_reading['brightness'] * 100));
                    }.bind(newAccessory))
                    .on('set', function (value, callback) {
                        newAccessory.context.desired_state['brightness'] = value / 100; //THis is update to make it immediately available.
                        platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "brightness": value / 100 }, callback);
                    }.bind(newAccessory));
                platform.addAttributeUsage('brightness', newAccessory.context.uuid, thisCharacteristic);

                newAccessory.fan = true;
            } else {
                //Items specific to Light Bulbs Locks:
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Lightbulb, Characteristic.On)
                    .on('get', function (callback) {
                        callback(null, newAccessory.context.last_reading['powered']);
                    }.bind(newAccessory))
                    .on('set', function (value, callback) {
                        newAccessory.context.desired_state['powered'] = (value == 1); //THis is update to make it immediately available.
                        platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "powered": (value == 1) }, callback);
                    }.bind(newAccessory));
                platform.addAttributeUsage('powered', newAccessory.context.uuid, thisCharacteristic);

                if (newAccessory.context.desired_state['brightness'] !== undefined) {

                    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Lightbulb, Characteristic.Brightness)
                        .on('get', function (callback) {
                            callback(null, Math.floor(newAccessory.context.last_reading['brightness'] * 100));
                        }.bind(newAccessory))
                        .on('set', function (value, callback) {
                            newAccessory.context.desired_state['brightness'] = value / 100; //THis is update to make it immediately available.
                            platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "brightness": value / 100 }, callback);
                        }.bind(newAccessory));
                    platform.addAttributeUsage('brightness', newAccessory.context.uuid, thisCharacteristic);
                }

                if (newAccessory.context.desired_state['hue'] !== undefined) {

                    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Lightbulb, Characteristic.Hue)
                        .on('get', function (callback) {
                            callback(null, Math.floor(newAccessory.context.last_reading['hue'] * 360));
                        }.bind(newAccessory))
                        .on('set', function (value, callback) {
                            newAccessory.context.desired_state['hue'] = value / 360; //THis is update to make it immediately available.
                            platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, {
                                "hue": newAccessory.context.desired_state['hue'],
                                "saturation": newAccessory.context.desired_state['saturation'],
                                "brightness": newAccessory.context.desired_state['brightness'],
                                "color_model": 'hsb'
                            }, callback);
                        }.bind(newAccessory));
                    platform.addAttributeUsage('hue', newAccessory.context.uuid, thisCharacteristic);


                    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Lightbulb, Characteristic.Saturation)
                        .on('get', function (callback) {
                            callback(null, Math.floor(newAccessory.context.last_reading['saturation'] * 100));
                        }.bind(newAccessory))
                        .on('set', function (value, callback) {
                            newAccessory.context.desired_state['saturation'] = value / 100; //THis is update to make it immediately available.
                            platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, {
                                "hue": newAccessory.context.desired_state['hue'],
                                "saturation": newAccessory.context.desired_state['saturation'],
                                "brightness": newAccessory.context.desired_state['brightness'],
                                "color_model": 'hsb'
                            }, callback);
                        }.bind(newAccessory));
                    platform.addAttributeUsage('saturation', newAccessory.context.uuid, thisCharacteristic);
                }
            }
            isSupported = true;
            break;
        case 'lock':
            //Desired
            //locked	boolean	whether or not the lock is locked
            //alarm_mode	string	null, "activity", "tamper", "forced_entry"
            //alarm_sensitivity	float	ercentage 1.0 for Very sensitive, 0.2 for not sensitive, steps in values of 0.2
            //auto_lock_enabled	boolean	whether or not the auto lock feature is enabled
            //beeper_enabled	boolean	whether or not the beeper is enabled
            //vacation_mode	boolean	whether or not the vacation mode is enabled
            //key_code_length	integer	usually betweeen 4 and 8, check for capabilities for allowed units
            //Reading
            //connection	Boolean	whether or not the device is reachable remotely
            //alarm_activated	boolean	becomes true when alarm is triggered on lock


            //Items specific to Door Locks:
            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.LockMechanism, Characteristic.LockCurrentState)
                .on('get', function (callback) {
                    switch (newAccessory.context.last_reading.locked) {
                        case true:
                            callback(null, Characteristic.LockCurrentState.SECURED);
                            break;
                        case false:
                            callback(null, Characteristic.LockCurrentState.UNSECURED);
                            break;
                        default:
                            callback(null, Characteristic.LockCurrentState.UNKNOWN);
                            break;
                    }
                }.bind(newAccessory));
            platform.addAttributeUsage('locked', newAccessory.context.uuid, thisCharacteristic);

            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.LockMechanism, Characteristic.LockTargetState)
                .on('get', function (callback) {
                    switch (newAccessory.context.desired_state.locked) {
                        case true:
                            callback(null, Characteristic.LockCurrentState.SECURED);
                            break;
                        case false:
                            callback(null, Characteristic.LockCurrentState.UNSECURED);
                            break;
                        default:
                            callback(null, Characteristic.LockCurrentState.UNKNOWN);
                            break;
                    }
                }.bind(newAccessory))
                .on('set', function (value, callback) {
                    if (value === false) {
                        value = Characteristic.LockTargetState.UNSECURED;
                    } else if (value === true) {
                        value = Characteristic.LockTargetState.SECURED;
                    }
                    switch (value) {
                        case Characteristic.LockTargetState.SECURED:
                            callback();
                            newAccessory.context.desired_state['locked'] = true; //THis is update to make it immediately available.
                            platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "locked": true }, null);
                            break;
                        case Characteristic.LockTargetState.UNSECURED:
                            callback();
                            newAccessory.context.desired_state['locked'] = false; //THis is update to make it immediately available.
                            platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "locked": false }, null);

                            break;
                    }
                });
            platform.addAttributeUsage('locked', newAccessory.context.uuid, thisCharacteristic);

            //Track the Battery Level
            if (newAccessory.context.last_reading.battery !== undefined) {
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.BatteryLevel)
                    .on('get', function (callback) {
                        callback(null, Math.floor(newAccessory.context.last_reading.battery * 100));
                    }.bind(newAccessory));
                platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.StatusLowBattery)
                    .on('get', function (callback) {
                        if (newAccessory.context.last_reading.battery < 0.25)
                            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                        else
                            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                    }.bind(newAccessory));
                platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.ChargingState);
                thisCharacteristic.setValue(Characteristic.ChargingState.NOT_CHARGING);
            }
            //End Battery Level Tracking
            isSupported = true;
            break;

        case 'air_conditioner':
            //This shows the available values and their uses. Used items have an asterisk.
            //*desired_state['fan_speed']=null	//float	0 - 1
            //*desired_state['mode']=null	//string	"cool_only", "fan_only", "auto_eco"
            //*desired_state['powered']=null	//boolean	whether or not the unit is powered on
            //*desired_state['max_set_point']=null	//float	temperature above which the unit should be cooling
            //last_reading['connection'] //	Boolean	whether or not the device is reachable remotely
            //*last_reading['temperature'] //	float	maps to ambient temperature last read from device itself
            //last_reading['consumption'] //	float	total consumption in watts

            //Items specific to Thermostats:

            //Handle the Current State
            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.CurrentHeatingCoolingState)
                .on('get', function (callback) {
                    if (newAccessory.context.last_reading['powered']) { //I need to verify this changes when the thermostat clicks on.
                        switch (newAccessory.context.last_reading['mode']) {
                            case "cool_only":
                                callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
                                break;
                            case "auto_eco": //HomeKit only accepts HEAT/COOL, so we have to determine if we are Heating or Cooling.
                                if (newAccessory.context.last_reading.temperature > newAccessory.context.last_reading.max_set_point) callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
                                else callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
                                break;
                            default:
                                callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
                                break;
                        }
                    } else callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
                }.bind(newAccessory));
            platform.addAttributeUsage('powered', newAccessory.context.uuid, thisCharacteristic); //Adds characteristic for tracking this value.
            platform.addAttributeUsage('mode', newAccessory.context.uuid, thisCharacteristic); //Adds characteristic for tracking this value.

            //Handle the Target State
            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.TargetHeatingCoolingState)
                .on('get', function (callback) {
                    if (newAccessory.context.desired_state['powered']) {
                        switch (newAccessory.context.desired_state['mode']) {
                            case "cool_only":
                                callback(null, Characteristic.TargetHeatingCoolingState.COOL);
                                break;
                            case "auto_eco":
                                callback(null, Characteristic.TargetHeatingCoolingState.AUTO);
                                break;
                            default:
                                callback(null, Characteristic.TargetHeatingCoolingState.OFF);
                                break;
                        }
                    } else callback(null, Characteristic.TargetHeatingCoolingState.OFF);
                }.bind(newAccessory))
                .on('set', function (value, callback) {
                    switch (value) {
                        case Characteristic.TargetHeatingCoolingState.COOL:
                            platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { powered: true, mode: 'cool_only' }, callback);
                            break;
                        case Characteristic.TargetHeatingCoolingState.AUTO:
                            platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { powered: true, mode: 'auto_eco' }, callback);
                            break;
                        case Characteristic.TargetHeatingCoolingState.OFF:
                            platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { powered: false }, callback);
                    }
                }.bind(newAccessory));

            platform.addAttributeUsage('powered', newAccessory.context.uuid, thisCharacteristic); //Adds characteristic for tracking this value.
            platform.addAttributeUsage('mode', newAccessory.context.uuid, thisCharacteristic); //Adds characteristic for tracking this value.

            //Get the Current Temperature
            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.CurrentTemperature)
                .on('get', function (callback) {
                    callback(null, newAccessory.context.last_reading['temperature']);
                    platform.addAttributeUsage('temperature', newAccessory.context.uuid, this); //Adds characteristic for tracking this value.
                }.bind(newAccessory));
            platform.addAttributeUsage('temperature', newAccessory.context.uuid, thisCharacteristic); //Adds characteristic for tracking this value.

            //Get/Set the Target Temperature
            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.TargetTemperature)
                .on('get', function (callback) {
                    callback(null, newAccessory.context.desired_state['max_set_point']);
                }.bind(newAccessory))
                .on('set', function (value, callback) {
                    platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "max_set_point": value }, callback);
                }.bind(newAccessory));
            platform.addAttributeUsage('max_set_point', newAccessory.context.uuid, thisCharacteristic); //Adds characteristic for tracking this value.

            //Get the Display Units
            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.TemperatureDisplayUnits)
                .on('get', function (callback) {
                    if (platform.temperature_unit == "C") callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
                    else callback(null, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
                }.bind(newAccessory));

            //Get/set the Fan speed
            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.RotationSpeed)
                .on('get', function (callback) {
                    callback(null, Math.floor(newAccessory.context.last_reading.fan_speed * 100));
                }.bind(newAccessory))
                .on('set', function (value, callback) {
                    platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "fan_speed": value / 100 }, callback);
                }.bind(newAccessory));
            platform.addAttributeUsage('fan_speed', newAccessory.context.uuid, thisCharacteristic); //Adds characteristic for tracking this value.
            isSupported = true;
            break;
        case 'binary_switch':
            //*desired['powered']	boolean	whether device is powered on
            //last_reading['connection']	Boolean	whether or not the device is reachable remotely

            var fan = !!(platform.fans.indexOf(newAccessory.context.object_id) + 1);

            if (fan) {
                //If id is included in list of fans we treat as a fan
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Fan, Characteristic.On)
                    .on('get', function (callback) {
                        callback(null, newAccessory.context.last_reading['powered']);
                    }.bind(newAccessory))
                    .on('set', function (value, callback) {
                        platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "powered": value }, callback);
                    }.bind(newAccessory));
                platform.addAttributeUsage('powered', newAccessory.context.uuid, thisCharacteristic);
                newAccessory.fan = true;
            } else if (newAccessory.context.last_reading.consumption == undefined) {
                //If consumption is undefined then we will treat this like a lightbulb
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Lightbulb, Characteristic.On)
                    .on('get', function (callback) {
                        callback(null, newAccessory.context.last_reading['powered']);
                    }.bind(newAccessory))
                    .on('set', function (value, callback) {
                        platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, {
                            "powered": value
                        }, callback);
                    }.bind(newAccessory));
                platform.addAttributeUsage('powered', newAccessory.context.uuid, thisCharacteristic);
            } else {
                //If consumption is defined then we will treat this as an Outlet.
                //This covers the Outlink Wall Plug.
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Lightbulb, Characteristic.On)
                    .on('get', function (callback) {
                        callback(null, newAccessory.context.last_reading['powered']);
                    }.bind(newAccessory))
                    .on('set', function (value, callback) {
                        platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "powered": value }, callback);
                    }.bind(newAccessory));
                platform.addAttributeUsage('powered', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Outlet, Characteristic.OutletInUse)
                    .on('get', function (callback) {
                        callback(null, (newAccessory.context.last_reading['consumption'] > 0.1));
                    }.bind(newAccessory));
                platform.addAttributeUsage('consumption', newAccessory.context.uuid, thisCharacteristic);
            }
            isSupported = true;
            break;
        case 'shade':
            //Desired
            //*position	float	0.0 is completely closed and 1.0 is completely open.
            //Reading
            //connection	Boolean	whether or not the device is reachable remotely
            //this.log("Blinds Detail: "+JSON.stringify(newAccessory.context));
            //Items specific to Shades:
            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.WindowCovering, Characteristic.TargetPosition)
                .on('get', function (callback) {
                    callback(null, Math.floor(newAccessory.context.desired_state.position * 100));
                }.bind(newAccessory))
                .on('set', function (value, callback) {
                    platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "position": value / 100 }, callback);
                }.bind(newAccessory));
            platform.addAttributeUsage('position', newAccessory.context.uuid, thisCharacteristic);

            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.WindowCovering, Characteristic.CurrentPosition)
                .on('get', function (callback) {
                    callback(null, Math.floor(newAccessory.context.last_reading.position * 100));
                }.bind(newAccessory));
            platform.addAttributeUsage('position', newAccessory.context.uuid, thisCharacteristic);

            //Always show the position as stopped because Wink doesn't support indicating that it is moving.
            //If support is desired, this could be update by determining the last time the position changed and reporting it as moving if it was less than 5 seconds ago.
            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.WindowCovering, Characteristic.PositionState);
            thisCharacteristic.setValue(Characteristic.PositionState.STOPPED)

            //Track the Battery Level
            if (newAccessory.context.last_reading.battery !== undefined) {
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.BatteryLevel)
                    .on('get', function (callback) {
                        callback(null, Math.floor(newAccessory.context.last_reading.battery * 100));
                    }.bind(newAccessory));
                platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.StatusLowBattery)
                    .on('get', function (callback) {
                        if (newAccessory.context.last_reading.battery < 0.25)
                            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                        else
                            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                    }.bind(newAccessory));
                platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.ChargingState);
                thisCharacteristic.setValue(Characteristic.ChargingState.NOT_CHARGING);
            }
            //End Battery Level Tracking
            isSupported = true;
            break;
        case 'camera': //Not Implemented
            //Desired
            //capturing_video	boolean	Whether or not the camera is currently capturing video
            //capturing_audio	boolean	Whether or not the camera is currently capturing audio
            //mode	string	one of "armed", "disarmed", "privacy"
            //Reading
            //motion	Boolean	whether or not the dropcam currently detects movement
            //loudness	Boolean	whether or not the dropcam currently detects sound
            //connection	Boolean	whether or not the device is reachable remotely
            break;
        case 'doorbell': //Not Implemented
            //Reading
            //button_pressed	boolean	doorbell button pressed event
            //motion	boolean	motion detected by doorbell event
            //battery	float	battery status
            //connection	boolean	online or offline
            break;
        case 'garage_door':
            //Desired
            //*position	float	0 - 1, while a float, the app should only send up 0 or 1, for security
            //laser	boolean	turn on/off laser
            //calibration_enabled	boolean	turn on/off calibration mode
            //Reading
            //connection	Boolean	whether or not the device is reachable remotely
            //buzzer	boolean	whether or not the buzzer is on
            //led	boolean	whether or not the LED is on
            //moving	boolean	whether or not the garage door is current moving
            //fault	boolean	whether or not there is an error with the garage door
            //disabled	boolean	whether remote control is disabled due to an error
            //error	array	string array of errors
            //control_enabled	boolean	whether or not the unit is capable of remote control
            //controller_error	array,string	errors from the controller unit,putting the garage door into state where remote control is disabled
            //tilt_sensor_error	array,string	whether the tilt sensor has a battery/in range or if that battery is low

            //Items specific to Garage Doors:

            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.GarageDoorOpener, Characteristic.TargetPosition)
                .on('get', function (callback) {
                    if ((newAccessory.context.desired_state.position !== null) && (newAccessory.context.desired_state.position !== undefined))
                        callback(null, Math.floor(newAccessory.context.desired_state.position * 100));
                    else
                        callback(null, Math.floor(newAccessory.context.last_reading.position * 100));
                }.bind(newAccessory))
                .on('set', function (value, callback) {
                    newAccessory.context.desired_state.position = value / 100;
                    platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "position": value / 100 }, callback);
                }.bind(newAccessory));
            platform.addAttributeUsage('position', newAccessory.context.uuid, thisCharacteristic);


            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.GarageDoorOpener, Characteristic.TargetDoorState)
                .on('get', function (callback) {
                    var compareval = 0
                    if ((newAccessory.context.desired_state.position !== null) && (newAccessory.context.desired_state.position !== undefined))
                        compareval = newAccessory.context.desired_state.position;
                    else
                        compareval = newAccessory.context.last_reading.position;

                    if (compareval === 1)
                        callback(null, Characteristic.TargetDoorState.OPEN);
                    else //Report Closed for Null or anything invalid
                        callback(null, Characteristic.TargetDoorState.CLOSED);
                }.bind(newAccessory))
                .on('set', function (value, callback) {
                    if (value == Characteristic.TargetDoorState.OPEN)
                        platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "position": 1 }, callback);
                    else if (value == Characteristic.TargetDoorState.CLOSED)
                        platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "position": 0 }, callback);
                }.bind(newAccessory));
            platform.addAttributeUsage('position', newAccessory.context.uuid, thisCharacteristic);

            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.GarageDoorOpener, Characteristic.CurrentDoorState)
                .on('get', function (callback) {
                    if (newAccessory.context.last_reading.position == 0)
                        callback(null, Characteristic.CurrentDoorState.CLOSED);
                    else if (newAccessory.context.last_reading.position == 1)
                        callback(null, Characteristic.CurrentDoorState.OPEN);
                    else //Report Open for anything other than a known state.
                        callback(null, Characteristic.CurrentDoorState.OPEN);
                }.bind(newAccessory));
            platform.addAttributeUsage('position', newAccessory.context.uuid, thisCharacteristic);

            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.GarageDoorOpener, Characteristic.ObstructionDetected);
            thisCharacteristic.setValue(false);

            //Track the Battery Level
            if (newAccessory.context.last_reading.battery !== undefined) {
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.BatteryLevel)
                    .on('get', function (callback) {
                        callback(null, Math.floor(newAccessory.context.last_reading.battery * 100));
                    }.bind(newAccessory));
                platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.StatusLowBattery)
                    .on('get', function (callback) {
                        if (newAccessory.context.last_reading.battery < 0.25)
                            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                        else
                            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                    }.bind(newAccessory));
                platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.ChargingState);
                thisCharacteristic.setValue(Characteristic.ChargingState.NOT_CHARGING);
            }
            //End Battery Level Tracking
            isSupported = true;
            break;
        case 'hub': //Not Implemented
            break;
        case 'powerstrip': //Not Implemented
            //Complex model...
            break;
        case 'piggy_bank': //Not Implemented
            //Complex model...
            break;
        case 'refrigerator': //Not Implemented
            //Reading
            //min_refrigerator_set_point_allowed	float	minimum allowed set point in celsius
            //max_refrigerator_set_point_allowed	float	maximum allowed set point in celsius
            //min_freezer_set_point_allowed	float	minimum allowed set point in celsius
            //max_freezer_set_point_allowed	float	maximum allowed set point in celsius
            //refrigerator_left_door_ajar	boolean	whether the left refrigerator door is currently ajar
            //refrigerator_right_door_ajar	boolean	whether the right refrigerator door is currently ajar
            //refrigerator_door_ajar	boolean	whether either refrigerator door is currently ajar
            //freezer_door_ajar	boolean	whether the freezer door is currently ajar
            //water_filter_remaining	float	[0 - 1] percentage of water filter remaining
            //firmware_version	string	current firmware version of refrigerator unit
            //update_needed	boolean	whether refrigerator unit needs an update
            //updating_firmware	boolean	whether refrigerator unit is currently updating
            //symbiote_firmware_version	string	current firmware version of wifi module
            //symbiote_update_needed	boolean	whether wifi module needs an update
            //symbiote_updating_firmware	boolean	whether wifi module is currently updating
            break;
        case 'propane_tank':
            //Reading
            //connection	Boolean	whether or not the device is reachable remotely
            //battery	float	0 - 1, battery percentage
            //remaining	float	0 - 1, percent fuel remaining
            //The level of the propane tank is being expressed like a Battery because there isn't any other kind of tank level available in HomeKit.
            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.BatteryLevel)
                .on('get', function (callback) {
                    callback(null, Math.floor(newAccessory.context.last_reading.remaining * 100));
                }.bind(newAccessory));
            platform.addAttributeUsage('remaining', newAccessory.context.uuid, thisCharacteristic);

            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.StatusLowBattery)
                .on('get', function (callback) {
                    if (newAccessory.context.last_reading.remaining < 0.25)
                        callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                    else
                        callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                }.bind(newAccessory));
            platform.addAttributeUsage('remaining', newAccessory.context.uuid, thisCharacteristic);

            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.ChargingState);
            thisCharacteristic.setValue(Characteristic.ChargingState.NOT_CHARGING);
            //End Battery Level Tracking
            isSupported = true;
            break;
        case 'remote': //Not Implemented
            //Reading
            //remote_pairable	boolean	wehter or not the remote is pairing with a device
            //group_id	string	Reference to the Group object linked to the remote
            //button_up_pressed	boolean	up button is pressed
            //button_down_pressed	boolean	down button is pressed
            //button_on_pressed	boolean	on button is pressed
            //button_off_pressed	boolean	off button is pressed


            break;
        case 'sensor_pod': //Not Implemented
            //Reading
            //battery	float	[0 - 1] percentage of battery
            //connection	boolean	whether or not the sensor has connection
            //brightness	boolean	whether or not the sensor currently detects a large delta in light
            //external_power	boolean	whether the sensor is running on AC power or battery
            //humditity	float	[0 - 1] percentage of measured of humidity
            //loudness	boolean	whether the sensor is currently detects a large delta in sound
            //temperature	float	current reported temperature in celsius
            //vibration	boolean	whether the sensor currently detects a large delta in vibration
            //motion	boolean	whether the sensor currently detects a large delta in motion
            //opened	boolean	whether the sensor detects an opened state
            //locked	boolean	whether the sensor detects a locked state
            //liquid_detected	boolean	whether the sensor detects moisture
            //occupied	boolean	whether or not the sensor has detected occupancy in the last 30 minutes


            //Occupancy
            if (newAccessory.context.last_reading.occupied !== undefined) {

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.OccupancySensor, Characteristic.OccupancyDetected)
                    .on('get', function (callback) {
                        callback(null, newAccessory.context.last_reading.occupied);
                    }.bind(newAccessory));
                platform.addAttributeUsage('occupied', newAccessory.context.uuid, thisCharacteristic);

                if (newAccessory.context.last_reading.tamper_detected !== undefined) {
                    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.OccupancySensor, Characteristic.StatusTampered)
                        .on('get', function (callback) {
                            callback(null, newAccessory.context.last_reading.tamper_detected);
                        }.bind(newAccessory));
                    platform.addAttributeUsage('tamper_detected', newAccessory.context.uuid, thisCharacteristic);
                }
            }

            //Motion detector with PIR
            if (newAccessory.context.last_reading.motion !== undefined) {
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.MotionSensor, Characteristic.MotionDetected)
                    .on('get', function (callback) {
                        callback(null, newAccessory.context.last_reading.motion);
                    }.bind(newAccessory));
                platform.addAttributeUsage('motion', newAccessory.context.uuid, thisCharacteristic);

                if (newAccessory.context.last_reading.tamper_detected !== undefined) {
                    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.MotionSensor, Characteristic.StatusTampered)
                        .on('get', function (callback) {
                            callback(null, newAccessory.context.last_reading.tamper_detected);
                        }.bind(newAccessory));
                    platform.addAttributeUsage('tamper_detected', newAccessory.context.uuid, thisCharacteristic);
                }
            }

            //Humidity Detection
            if (newAccessory.context.last_reading.humidity !== undefined) {
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.HumiditySensor, Characteristic.CurrentRelativeHumidity)
                    .on('get', function (callback) {
                        callback(null, newAccessory.context.last_reading.humidity);
                    }.bind(newAccessory));
                platform.addAttributeUsage('humidity', newAccessory.context.uuid, thisCharacteristic);
            }

            //Temperature Detection
            if (newAccessory.context.last_reading.temperature !== undefined) {
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.TemperatureSensor, Characteristic.CurrentTemperature)
                    .on('get', function (callback) {
                        callback(null, newAccessory.context.last_reading.temperature);
                    }.bind(newAccessory));
                platform.addAttributeUsage('temperature', newAccessory.context.uuid, thisCharacteristic);
            }

            //Open/Close Sensor
            if (newAccessory.context.last_reading.opened !== undefined) {
                if (platform.windowsensors.indexOf(newAccessory.context.object_id) >= 0) {
                    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Window, Characteristic.CurrentPosition)
                        .on('get', function (callback) {
                            if (newAccessory.context.last_reading.opened)
                                callback(null, 100);
                            else
                                callback(null, 0);
                        }.bind(newAccessory));
                    platform.addAttributeUsage('opened', newAccessory.context.uuid, thisCharacteristic);

                    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Window, Characteristic.PositionState);
                    thisCharacteristic.setValue(Characteristic.PositionState.STOPPED);
                } else {
                    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Door, Characteristic.CurrentPosition)
                        .on('get', function (callback) {
                            if (newAccessory.context.last_reading.opened)
                                callback(null, 100);
                            else
                                callback(null, 0);
                        }.bind(newAccessory));
                    platform.addAttributeUsage('opened', newAccessory.context.uuid, thisCharacteristic);

                    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Door, Characteristic.PositionState);
                    thisCharacteristic.setValue(Characteristic.PositionState.STOPPED);
                }
            }



            //Track the Battery Level
            if (newAccessory.context.last_reading.battery !== undefined) {
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.BatteryLevel)
                    .on('get', function (callback) {
                        callback(null, Math.floor(newAccessory.context.last_reading.battery * 100));
                    }.bind(newAccessory));
                platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.StatusLowBattery)
                    .on('get', function (callback) {
                        if (newAccessory.context.last_reading.battery < 0.25)
                            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                        else
                            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                    }.bind(newAccessory));
                platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.ChargingState);
                thisCharacteristic.setValue(Characteristic.ChargingState.NOT_CHARGING);
            }
            //End Battery Level Tracking
            isSupported = true;
            break;
        case 'siren': //Not Implemented
            //Desired
            //mode	String	one of [siren_only, strobe_only, siren_and_strobe]
            //powered	boolean	whether or not the siren is on
            //auto_shutoff	Integer	one of [null (never), 30, 60, 120]. Values are in seconds.
            //Reading
            //battery	float	[0 - 1] percentage of battery
            //connection	boolean	whether or not the sensor has connection
            break;
        case 'smoke_detector':
            //Reading
            //smoke_detected	boolean	whether or not smoke is currently detected
            //co_detected	boolean	whether or not carbon monoxide is currently detected
            //test_activated	whether or not a test is currently activated
            //connection	boolean	current connection status
            //battery	float	[0 - 1] battery percentage
            //smoke_severity	float	[0 - 1] if present, severity of smoke detection
            //co_severity	float	[0 - 1] if present, severity of co detection
            //Items specific to Smoke Detectors:
            if (newAccessory.context.last_reading.co_detected !== undefined) {
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.CarbonMonoxideSensor, Characteristic.CarbonMonoxideDetected)
                    .on('get', function (callback) {
                        if (newAccessory.context.last_reading.co_detected)
                            callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL);
                        else
                            callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
                    }.bind(newAccessory));
                platform.addAttributeUsage('co_detected', newAccessory.context.uuid, thisCharacteristic);

                if (newAccessory.context.last_reading.battery !== undefined) {
                    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.CarbonMonoxideSensor, Characteristic.StatusLowBattery)
                        .on('get', function (callback) {
                            if (newAccessory.context.last_reading.battery < 0.25)
                                callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                            else
                                callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                        }.bind(newAccessory));
                    platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);
                }
            }

            if (newAccessory.context.last_reading.smoke_detected !== undefined) {
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.SmokeSensor, Characteristic.SmokeDetected)
                    .on('get', function (callback) {
                        if (newAccessory.context.last_reading.smoke_detected)
                            callback(null, Characteristic.SmokeDetected.SMOKE_DETECTED);
                        else
                            callback(null, Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
                    }.bind(newAccessory));
                platform.addAttributeUsage('smoke_detected', newAccessory.context.uuid, thisCharacteristic);

                if (newAccessory.context.last_reading.battery !== undefined) {
                    thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.SmokeSensor, Characteristic.StatusLowBattery)
                        .on('get', function (callback) {
                            if (newAccessory.context.last_reading.battery < 0.25)
                                callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                            else
                                callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                        }.bind(newAccessory));
                    platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);
                }
            }

            //Track the Battery Level
            if (newAccessory.context.last_reading.battery !== undefined) {
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.BatteryLevel)
                    .on('get', function (callback) {
                        callback(null, Math.floor(newAccessory.context.last_reading.battery * 100));
                    }.bind(newAccessory));
                platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.StatusLowBattery)
                    .on('get', function (callback) {
                        if (newAccessory.context.last_reading.battery < 0.25)
                            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                        else
                            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                    }.bind(newAccessory));
                platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.ChargingState);
                thisCharacteristic.setValue(Characteristic.ChargingState.NOT_CHARGING);
            }
            //End Battery Level Tracking
            isSupported = true;
            break;
        case 'sprinkler': //Not Implemented
            //Complex model...
            break;
        case 'thermostat':
            //////Desired
            //mode	String	One of ["cool_only", "heat_only", "auto", "aux"], allowed value depends in mode.choices in capabilities
            //powered	boolean	whether or not the hvac is on
            //max_set_point	float, in celsius	max set point for cooling in celsius
            //min_set_point	float, in celsius	min set point for heating in celsius
            //override_temperature	float, in celsius	temperature sent to thermostat to override interally read temperature
            //setpoint_increment_value	integer, in tenths of celsius	value that the thermostat will change on tapping
            //accelerometer_enable	boolean	whether or not temperature change on tapping is enabled
            //temperature_override_enable	boolean	whether or not overriding the temperature is enabled
            //fan_duration	integer	Set fan on for duration in seconds
            //users_away	boolean	Set users away -- thermostat will manage temperature at a lower set point
            //cooling_system_stage	String	one of "cool_stage_1", "cool_stage_2"
            //heating_system_stage	String	one of "heat_stage_1", "heat_stage_2"
            //heating_system_type	String	one of "conventional", "heat_pump"
            //heating_fuel_source	String	one of "electric", "gas"
            //humidifier_mode	String	one of "on", "off", "auto"
            //humidifier_set_point	float	[0.0 - 1.0]
            //fan_mode	String	one of "[on,auto]", auto will turn the fan on when heating or cooling is active
            //dehumidifier_mode	string	one of “[on,off]”
            //dehumidifier_set_point	float	the humidity degree in which the thermostat will start to dehumidify
            //dehumidify_overcool_offset	float	cool in x F below cool setpoint in order to reach the dehumidification setpoint, capabilities will express an array of choices from 0 to the equivalent of 5 degrees F in steps of 0.5 degrees F, converted to C
            //profile	string	one of “[home,away,sleep,awake,null]” depends on capabilities]
            //fan_run_time	int	minimum amount of time to circulate air per hour when fan is on AUTO mode, 0-3300 seconds, increments of 300 seconds
            //////Reading
            //connection	boolean	whether or not the device is reachable remotely
            //temperature	float in celsius	[maps to room temperature last read from device itself]
            //smart_temperature	ecobee only, mean temp of all remote sensors and thermostat
            //humidity	float	[0-1] from device readings
            //external_temperature	float in celsius	the outdoor temperature/weather
            //max_max_set_point	float in celsius	highest allowed max set point
            //min_max_set_point	float in celsius	lowest allowed max set point
            //max_min_set_point	float in celsius	highest allowed min set point
            //min_min_set_point	float in celsius	lowest allowed min set point
            //has_fan	boolean	whether or not the thermostat unit has a fan
            //fan_timer_active	boolean	whether or not the fan timer is active
            //eco_target	boolean	whether or not the thermostat is running in an energy efficient mode
            //override_temperature_group_id	string	group id of group used to calculate temperature override
            //deadband	float in celsius	minimum difference between max and min set points
            //technician_name	String	contractor contact data
            //technician_phone	String	contractor contact data
            //aux_active	boolean	Auxiliary heat is actively pumping
            //cool_active	boolean	Cool is actively pumping
            //heat_active	boolean	Heat is actively pumping
            //fan_active	boolean	Fan is actively running
            //last_error	string	the current alert/warning on the thermostat
            //occupied	boolean	Whether or not the thermostat has detected occupancy in the last 30 minutes
            //Handle the Current State
            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.CurrentHeatingCoolingState)
                .on('get', function (callback) {
                    if (newAccessory.context.last_reading.powered) { //I need to verify this changes when the thermostat clicks on.
                        switch (newAccessory.context.last_reading.mode) {
                            case "cool_only":
                                callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
                                break;
                            case "heat_only":
                                callback(null, Characteristic.CurrentHeatingCoolingState.HEAT);
                                break;
                            case "auto": //HomeKit only accepts HEAT/COOL, so we have to determine if we are Heating or Cooling.
                                if (newAccessory.context.last_reading.temperature < newAccessory.context.last_reading.min_set_point)
                                    callback(null, Characteristic.CurrentHeatingCoolingState.HEAT);
                                else
                                    callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
                                break;
                            case "aux": //This assumes aux is always heat. Wink doesn't support aux with my thermostat even though I have aux mode, so I'm not 100%.
                                callback(null, Characteristic.CurrentHeatingCoolingState.HEAT);
                                break;
                            default: //The above list should be inclusive, but we need to return something if they change stuff.
                                callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
                                break;
                        }
                    } else //For now, powered being false means it is off
                        callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
                }.bind(newAccessory));
            platform.addAttributeUsage('mode', newAccessory.context.uuid, thisCharacteristic);
            platform.addAttributeUsage('powered', newAccessory.context.uuid, thisCharacteristic);

            //Handle the Target State
            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.TargetHeatingCoolingState)
                .on('get', function (callback) {
                    if (newAccessory.context.desired_state.powered) { //I need to verify this changes when the thermostat clicks on.
                        switch (newAccessory.context.desired_state.mode) {
                            case "cool_only":
                                callback(null, Characteristic.TargetHeatingCoolingState.COOL);
                                break;
                            case "heat_only":
                                callback(null, Characteristic.TargetHeatingCoolingState.HEAT);
                                break;
                            case "auto":
                                callback(null, Characteristic.TargetHeatingCoolingState.AUTO);
                                break;
                            case "aux": //This assumes aux is always heat. Wink doesn't support aux with my thermostat even though I have aux mode, so I'm not 100%.
                                callback(null, Characteristic.TargetHeatingCoolingState.HEAT);
                                break;
                            default: //The above list should be inclusive, but we need to return something if they change stuff.
                                callback(null, Characteristic.TargetHeatingCoolingState.OFF);
                                break;
                        }
                    } else //For now, powered being false means it is off
                        callback(null, Characteristic.TargetHeatingCoolingState.OFF);
                }.bind(newAccessory))
                .on('set', function (value, callback) {
                    switch (value) {
                        case Characteristic.TargetHeatingCoolingState.COOL:
                            newAccessory.context.desired_state['mode'] = "cool_only"; //THis is update to make it immediately available.
                            newAccessory.context.desired_state['powered'] = true; //THis is update to make it immediately available.
                            platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "mode": "cool_only", "powered": true }, callback);
                            break;
                        case Characteristic.TargetHeatingCoolingState.HEAT:
                            newAccessory.context.desired_state['mode'] = "heat_only"; //THis is update to make it immediately available.
                            newAccessory.context.desired_state['powered'] = true; //THis is update to make it immediately available.
                            platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "mode": "heat_only", "powered": true }, callback);
                            break;
                        case Characteristic.TargetHeatingCoolingState.AUTO:
                            newAccessory.context.desired_state['mode'] = "auto"; //THis is update to make it immediately available.
                            newAccessory.context.desired_state['powered'] = true; //THis is update to make it immediately available.
                            platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "mode": "auto", "powered": true }, callback);
                            break;
                        case Characteristic.TargetHeatingCoolingState.OFF:
                            newAccessory.context.desired_state['powered'] = false; //THis is update to make it immediately available.
                            platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "powered": false }, callback);
                            break;
                    }
                }.bind(newAccessory));
            platform.addAttributeUsage('mode', newAccessory.context.uuid, thisCharacteristic);
            platform.addAttributeUsage('powered', newAccessory.context.uuid, thisCharacteristic);

            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.CurrentTemperature)
                .on('get', function (callback) {
                    callback(null, newAccessory.context.last_reading['temperature']);
                }.bind(newAccessory));
            platform.addAttributeUsage('temperature', newAccessory.context.uuid, thisCharacteristic);


            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.TargetTemperature)
                .on('get', function (callback) {
                    callback(null, newAccessory.context.desired_state['min_set_point']);
                }.bind(newAccessory))
                .on('set', function (value, callback) {
                    newAccessory.context.desired_state['min_set_point'] = value; //THis is update to make it immediately available.
                    newAccessory.context.desired_state['max_set_point'] = value + 0.5555556; //THis is update to make it immediately available.
                    platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "min_set_point": value, "max_set_point": value + 0.5555556 }, callback);
                }.bind(newAccessory));
            platform.addAttributeUsage('min_set_point', newAccessory.context.uuid, thisCharacteristic);
            platform.addAttributeUsage('max_set_point', newAccessory.context.uuid, thisCharacteristic);

            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.TemperatureDisplayUnits)
                .on('get', function (callback) {
                    if (platform.temperature_unit == "C")
                        callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
                    else
                        callback(null, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
                }.bind(newAccessory));

            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.HeatingThresholdTemperature)
                .on('get', function (callback) {
                    callback(null, newAccessory.context.last_reading['min_set_point']);
                }.bind(newAccessory))
                .on('set', function (value, callback) {
                    newAccessory.context.desired_state['min_set_point'] = value; //THis is update to make it immediately available.
                    platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "min_set_point": value }, callback);
                }.bind(newAccessory));
            platform.addAttributeUsage('min_set_point', newAccessory.context.uuid, thisCharacteristic);

            thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.CoolingThresholdTemperature)
                .on('get', function (callback) {
                    callback(null, newAccessory.context.last_reading['max_set_point']);
                }.bind(newAccessory))
                .on('set', function (value, callback) {
                    newAccessory.context.desired_state['max_set_point'] = value; //THis is update to make it immediately available.
                    platform.winkAPI.deviceSetDesired(newAccessory.context.uuid, { "max_set_point": value }, callback);
                }.bind(newAccessory));
            platform.addAttributeUsage('max_set_point', newAccessory.context.uuid, thisCharacteristic);

            if (newAccessory.context.last_reading.humidity !== undefined)
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.Thermostat, Characteristic.CurrentRelativeHumidity)
                    .on('get', function (callback) {
                        callback(null, Math.floor(newAccessory.context.last_reading.humidity * 100));
                    }.bind(newAccessory));
            platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

            //Track the Battery Level
            if (newAccessory.context.last_reading.battery !== undefined) {
                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.BatteryLevel)
                    .on('get', function (callback) {
                        callback(null, Math.floor(newAccessory.context.last_reading.battery * 100));
                    }.bind(newAccessory));
                platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.StatusLowBattery)
                    .on('get', function (callback) {
                        if (newAccessory.context.last_reading.battery < 0.25)
                            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                        else
                            callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                    }.bind(newAccessory));
                platform.addAttributeUsage('battery', newAccessory.context.uuid, thisCharacteristic);

                thisCharacteristic = platform.getaddCharacteristic(newAccessory, Service.BatteryService, Characteristic.ChargingState);
                thisCharacteristic.setValue(Characteristic.ChargingState.NOT_CHARGING);
            }
            //End Battery Level Tracking
            isSupported = true;
            break;
        case 'water_heater': //Not Implemented
            //Desired
            //mode	String	one of "eco", "performance", "heat_pump", "high_demand", "electric_only", "gas"
            //powered	boolean	whether or not the water heater is on
            //set_point	float	set point in celsius
            //vacation_mode	boolean	whether vacation mode is ucrrently enabled
            //Reading
            //min_set_point_allowed	float	minimum set point allowed in celsius
            //max_set_point_allowed	float	maximum set point allowed in celsius
            //modes_allowed	String array	one or many of modes, depends on rheem type
            //scald_message	String	Populated if the set point is above 120F
            //rheem_type	(String)	one of "Electric Water Heater", "Heat Pump Water Heater", "Gas Water Heater"
            break;

        default:
    }
    //Need to have the identify function setup, but not nessisarially to do anything?
    newAccessory.on('identify', function (paired, callback) {
        callback();
    }.bind(newAccessory));

    if (platform.hideids.indexOf(parseInt(newAccessory.context.object_id))>=0)
        isSupported = false;
    if (platform.hidegroups.indexOf(newAccessory.context.object_type)>=0)
        isSupported = false;

    if (!isSupported) {
        //Remove accessory. Make sure it is totally removed from Wink if it already exists there.
        if (inAccessory)
            this.removeAccessory(newAccessory.context);
        return;
    }

    newAccessory.reachable = ((newAccessory.context.last_reading.connection===true)||(newAccessory.context.last_reading.connection==null));
    newAccessory.updateReachability(newAccessory.reachable);

    if (inAccessory) {
        this.log("Reclaiming: " + device.name+" - ID "+device.object_id+" - TYPE "+device.object_type);
        //Preload the device cache in the API with the value we were saved with.
        platform.winkAPI._deviceReceiptProcessor({ data: [newAccessory.context] }, 'preload')
        //Add the accessory to the array for tracking it.
    } else {
        this.log("Adding: " + device.name+" - ID "+device.object_id+" - TYPE "+device.object_type);
        this.api.registerPlatformAccessories("homebridge-Wink", "Wink", [newAccessory]);
    }
    this.accessories_configured[newAccessory.UUID] = newAccessory;
}

Wink.prototype.configureAccessory = function (newAccessory) {
    this.accessories_unconfigured[newAccessory.UUID] = newAccessory;
}

//Updates the Value to HomeKit given the Wink equivilent.
Wink.prototype.changedAccessory = function (WinkUUID, changeGroup, changedField, oldValue, newValue, fullDeviceData) {
    var myDevice = this.accessories_configured[WinkUUID];
    if (myDevice === undefined) return;
    myDevice.context[changeGroup][changedField] = newValue;
    if (changedField==='connection') {
        myDevice.reachable = ((myDevice.context.last_reading.connection===true)||(myDevice.context.last_reading.connection==null));
        myDevice.updateReachability(myDevice.reachable);
    }
    //this.log("Accessory Changed: " + myDevice.displayName + ": " + changeGroup + "." + changedField + " from " + oldValue + " to " + newValue);
    if (this.attributeLookup[WinkUUID] === undefined) return;
    if (this.attributeLookup[WinkUUID][changedField] === undefined) return;
    for (i = 0; i < this.attributeLookup[WinkUUID][changedField].length; i++) {
        this.attributeLookup[WinkUUID][changedField][i].getValue();
    }
    //myDevice.context
}

//Needs work. Should update based on the "connection" value
Wink.prototype.updateAccessoriesReachability = function () {
    this.log("Update Reachability");
    for (var index in this.accessories) {
        var accessory = this.accessories[index];
        accessory.updateReachability(true);
    }
}

//Removes the device from the Homebridge caceh
Wink.prototype.removeAccessory = function (device) {
    this.log("Remove Accessory: " + device.name);
    if (this.accessories_configured[device.uuid]) {
        this.api.unregisterPlatformAccessories("homebridge-Wink", "Wink", [this.accessories_configured[device.uuid]]);
        delete this.accessories_configured[device.uuid]
    }
    if (this.accessories_unconfigured[device.uuid]) {
        this.api.unregisterPlatformAccessories("homebridge-Wink", "Wink", [this.accessories_unconfigured[device.uuid]]);
        delete this.accessories_unconfigured[device.uuid]
    }

}

//Handler will be invoked when user try to config your plugin
//Callback can be cached and invoke when nessary
Wink.prototype.configurationRequestHandler = function (context, request, callback) {
    this.log("Context: ", JSON.stringify(context));
    this.log("Request: ", JSON.stringify(request));

    // Check the request response
    if (request && request.response && request.response.inputs && request.response.inputs.name) {
        this.addAccessory(request.response.inputs.name);

        // Invoke callback with config will let homebridge save the new config into config.json
        // Callback = function(response, type, replace, config)
        // set "type" to platform if the plugin is trying to modify platforms section
        // set "replace" to true will let homebridge replace existing config in config.json
        // "config" is the data platform trying to save
        callback(null, "platform", true, {
            "platform": "Wink",
            "otherConfig": "SomeData"
        });
        return;
    }

    // - UI Type: Input
    // Can be used to request input from user
    // User response can be retrieved from request.response.inputs next time
    // when configurationRequestHandler being invoked

    var respDict = {
        "type": "Interface",
        "interface": "input",
        "title": "Add Accessory",
        "items": [{
            "id": "name",
            "title": "Name",
            "placeholder": "Fancy Light"
        } //,
            // {
            //   "id": "pw",
            //   "title": "Password",
            //   "secure": true
            // }
        ]
    }

    // - UI Type: List
    // Can be used to ask user to select something from the list
    // User response can be retrieved from request.response.selections next time
    // when configurationRequestHandler being invoked

    // var respDict = {
    //   "type": "Interface",
    //   "interface": "list",
    //   "title": "Select Something",
    //   "allowMultipleSelection": true,
    //   "items": [
    //     "A","B","C"
    //   ]
    // }

    // - UI Type: Instruction
    // Can be used to ask user to do something (other than text input)
    // Hero image is base64 encoded image data. Not really sure the maximum length HomeKit allows.

    // var respDict = {
    //   "type": "Interface",
    //   "interface": "instruction",
    //   "title": "Almost There",
    //   "detail": "Please press the button on the bridge to finish the setup.",
    //   "heroImage": "base64 image data",
    //   "showActivityIndicator": true,
    // "showNextButton": true,
    // "buttonText": "Login in browser",
    // "actionURL": "https://google.com"
    // }

    // Plugin can set context to allow it track setup process
    context.ts = "Hello";

    //invoke callback to update setup UI
    callback(respDict);
}
