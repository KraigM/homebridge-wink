//
var wink = require('wink-js');
var inherits = require('util').inherits;

//NEWMODULE: Add the object reference here
var WinkLockAccessory = require('./accessories/locks');
var WinkLightAccessory = require('./accessories/light_bulbs');
var WinkSwitchAccessory = require('./accessories/binary_switches');
var WinkGarageDoorAccessory = require('./accessories/garage_doors');
var WinkOutletAccessory = require('./accessories/outlets');
var WinkSmokeDetectorAccessory = require('./accessories/smoke_detectors');
var WinkThermostatAccessory = require('./accessories/thermostats');
var WinkAirConditionerAccessory = require('./accessories/air_conditioners');
var WinkSensorAccessory = require('./accessories/sensor_pods');
var WinkPropaneTankAccessory = require('./accessories/propane_tanks');

process.env.WINK_NO_CACHE = true;

var Service, Characteristic, Accessory, uuid;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    uuid = homebridge.hap.uuid;
    homebridge.registerPlatform("homebridge-wink", "Wink", WinkPlatform);

    var copyInherit = function(orig, base) {
        var acc = orig.prototype;
        inherits(orig, base);
        orig.prototype.parent = base.prototype;
        for (var mn in acc) {
            orig.prototype[mn] = acc[mn];
        }
    }

    //NEWMODULE: Add a line for inheriting the Accessory class
    copyInherit(WinkLockAccessory, Accessory);
    copyInherit(WinkLightAccessory, Accessory);
    copyInherit(WinkSwitchAccessory, Accessory);
    copyInherit(WinkGarageDoorAccessory, Accessory);
    copyInherit(WinkOutletAccessory, Accessory);
    copyInherit(WinkSmokeDetectorAccessory, Accessory);
    copyInherit(WinkThermostatAccessory, Accessory);
    copyInherit(WinkAirConditionerAccessory, Accessory);
    copyInherit(WinkSensorAccessory, Accessory);
    copyInherit(WinkPropaneTankAccessory, Accessory);
};

function WinkPlatform(log, config) {
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

    this.log = log;
    this.deviceLookup = {};
}

WinkPlatform.prototype = {
    reloadData: function(callback) {
        //This is called when we need to refresh all Wink device information.
        this.log("Refreshing Wink Data");
        var that = this;
        wink.user().devices(function(devices) { //TODO: Add the ability to detect new devices and unregister newly disconnected devices.
            if (devices && devices.data && devices.data instanceof Array) {
                for (var i = 0; i < devices.data.length; i++) {
                    var device = devices.data[i];
                    //NEWMODULE: Add the id here. I'm planning to redesign this section.
                    var accessory = that.deviceLookup[device.lock_id | device.light_bulb_id | device.binary_switch_id | device.garage_door_id | device.outlet_id | device.smoke_detector_id | device.thermostat_id | device.air_conditioner_id | device.sensor_pod_id | device.propane_tank_id | ""];
                    if (accessory != undefined) {
                        accessory.device = device;
                        accessory.loadData();
                    }
                }
            }
            if (callback) callback();
        });
    },
    accessories: function(callback) {
        this.log("Fetching Wink devices.");

        var that = this;
        var foundAccessories = [];
        this.deviceLookup = {};

        var refreshLoop = function() {
            setInterval(that.reloadData.bind(that), 30000);
        };

        wink.init({
            "client_id": this.client_id,
            "client_secret": this.client_secret,
            "username": this.username,
            "password": this.password
        }, function(auth_return) {
            if (auth_return === undefined) {
                that.log("There was a problem authenticating with Wink.");
            } else {
                // success
                wink.user().devices(function(devices) {
                    for (var i = 0; i < devices.data.length; i++) {
                        var device = devices.data[i];
                        var accessory = null;
                        //Get Device Type
                        //NEWMODULE: Add Appropriate Lines Here
                        if (device.light_bulb_id !== undefined)
                            accessory = new WinkLightAccessory(that, device, Service, Characteristic, Accessory, uuid);

                        else if (device.garage_door_id !== undefined)
                            accessory = new WinkGarageDoorAccessory(that, device, Service, Characteristic, Accessory, uuid);

                        else if (device.lock_id !== undefined)
                            accessory = new WinkLockAccessory(that, device, Service, Characteristic, Accessory, uuid);

                        else if (device.binary_switch_id !== undefined)
                            accessory = new WinkSwitchAccessory(that, device, Service, Characteristic, Accessory, uuid);

                        else if (device.powerstrip_id !== undefined) {
                            for (var j = 0; j < device.outlets.length; j++) {
                                accessory = new WinkOutletAccessory(that, device.outlets[j], Service, Characteristic, Accessory, uuid);
                                if (accessory != undefined) {
                                    that.deviceLookup[accessory.deviceId] = accessory;
                                    foundAccessories.push(accessory);
                                }
                                accessory = undefined;
                            }

                        } else if (device.smoke_detector_id !== undefined)
                            accessory = new WinkSmokeDetectorAccessory(that, device, Service, Characteristic, Accessory, uuid);

                        else if (device.thermostat_id !== undefined)
                            accessory = new WinkThermostatAccessory(that, device, Service, Characteristic, Accessory, uuid);

                        else if (device.air_conditioner_id !== undefined)
                            accessory = new WinkAirConditionerAccessory(that, device, Service, Characteristic, Accessory, uuid);

                        else if (device.sensor_pod_id !== undefined)
                            accessory = new WinkSensorAccessory(that, device, Service, Characteristic, Accessory, uuid);

						else if (device.propane_tank_id !== undefined)
                            accessory = new WinkPropaneTankAccessory(that, device, Service, Characteristic, Accessory, uuid);

                        //These are here to prevent Unknown Device Groups in the logs when we know what the device is and can't represent it 
                        //with a HomeKit service yet.
                        else if (device.manufacturer_device_model = "wink_hub")
                            that.log("Device Ignored Not In HomeKit - Group hubs, ID " + device.hub_id + ", Name " + device.name);
                        else if (device.remote_id !== undefined)
                            that.log("Device Ignored Not In HomeKit - Group remotes, ID " + device.remote_id + ", Name " + device.name);
                        else if (device.unknown_device_id !== undefined)
                            that.log("Device Ignored Not In HomeKit - Group unknown_devices, ID " + device.unknown_device_id + ", Name " + device.name);
                        else if (device.eggtray_id !== undefined)
                            that.log("Device Ignored Not In HomeKit - Group eggtrays, ID " + device.eggtray_id + ", Name " + device.name);
                        else if (device.piggy_bank_id !== undefined)
                            that.log("Device Ignored Not In HomeKit - Group piggy_banks, ID " + device.piggy_bank_id + ", Name " + device.name);

                        else that.log("Unknown Device Group: " + JSON.stringify(device));

                        if (accessory != undefined) {
                            if (that.hidegroups.indexOf(accessory.deviceGroup) >= 0) { //Make sure the group isn't supposed to be hidden
                                that.log("Device Ignored By Group - Group " + accessory.deviceGroup + ", ID " + accessory.deviceId + ", Name " + accessory.name);
                            } else if (that.hideids.indexOf(accessory.deviceId) >= 0) { //Make sure the ID isn't supposed to be hidden
                                that.log("Device Ignored By ID - Group " + accessory.deviceGroup + ", ID " + accessory.deviceId + ", Name " + accessory.name);
                            } else if (that.unregister_disconnected && !accessory.device.last_reading.connection) {
                                that.log("Device Ignored By Disconnection - Group " + accessory.deviceGroup + ", ID " + accessory.deviceId + ", Name " + accessory.name);
                            } else {
                                that.log("Device Added - Group " + accessory.deviceGroup + ", ID " + accessory.deviceId + ", Name " + accessory.name);
                                that.deviceLookup[accessory.deviceId] = accessory;
                                foundAccessories.push(accessory);
                            }
                        }
                    }
                    refreshLoop();
                    callback(foundAccessories);
                });
            }
        });
    },
    UpdateWinkProperty_noFeedback: function(WinkAccessory, callback, sProperty, sTarget) {
        this.log("Changing target property '" + sProperty + "' of the " + WinkAccessory.device.device_group + " called " + WinkAccessory.device.name + " to " + sTarget);
        if (WinkAccessory.device.desired_state == undefined) {
            callback(Error("Unsupported"));
            return;
        };


        var myvariable = {
            "desired_state": {}
        };

        if (sProperty instanceof Array) {
            for (var i = 0; i < sProperty.length; i++) {
                myvariable.desired_state[sProperty[i]] = sTarget[i];
            }
        } else {
            if (WinkAccessory.device.desired_state[sProperty] == undefined) {
                callback(Error("Unsupported"));
                return;
            };
            myvariable.desired_state[sProperty] = sTarget;
        }


        WinkAccessory.control.update(myvariable, callback);

    },
    UpdateWinkProperty_withFeedback: function(WinkAccessory, callback, sProperty, sTarget) {
        this.log("Changing target property '" + sProperty + "' of the " + WinkAccessory.device.device_group + " called " + WinkAccessory.device.name + " to " + sTarget);
        if (WinkAccessory.device.desired_state == undefined) {
            callback(Error("Unsupported"));
            return;
        };
        if (WinkAccessory.device.desired_state[sProperty] == undefined) {
            callback(Error("Unsupported"));
            return;
        };

        var myvariable = {
            "desired_state": {}
        };
        myvariable.desired_state[sProperty] = sTarget;
        var that = this;
        var update = function(retry) {
            WinkAccessory.control.update(myvariable,
                function(res) {
                    var err = WinkAccessory.handleResponse(res);
                    if (!err) {
                        that.refreshUntil(WinkAccessory, 5,
                            function(sProperty) {
                                return WinkAccessory.device.last_reading[sProperty] == WinkAccessory.device.desired_state[sProperty];
                            },
                            function(completed, device, sProperty) {
                                if (completed) {
                                    that.log("Successfully changed target property '" + sProperty + "' of the " + WinkAccessory.device.device_group + " called " + WinkAccessory.device.name + " to " + sTarget);
                                } else if (retry) {
                                    that.log("Unable to determine if update was successful. Retrying update.");
                                    retry();
                                } else {
                                    that.log("Unable to determine if update was successful.");
                                }
                            }, 1000, 500, sProperty);
                    }
                    if (callback) {
                        callback(err);
                        callback = null;
                    }
                });
        };
        update(update);
    },
    refreshUntil: function(that, maxTimes, predicate, callback, interval, incrementInterval, sProperty) {
        if (!interval) {
            interval = 500;
        }
        if (!incrementInterval) {
            incrementInterval = 500;
        }
        setTimeout(function() {
            that.control.refresh(function() {
                if (predicate == undefined || predicate(sProperty) == true) {
                    if (callback) callback(true, that.device, sProperty);
                } else if (maxTimes > 0) {
                    maxTimes = maxTimes - 1;
                    interval += incrementInterval;
                    that.platform.refreshUntil(that, maxTimes, predicate, callback, interval, incrementInterval, sProperty);
                } else {
                    if (callback) callback(false, that.device, sProperty);
                }
            });
        }, interval);
    }

};