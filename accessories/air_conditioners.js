var wink = require('wink-js');
var inherits = require('util').inherits;

var Service, Characteristic, Accessory, uuid;

/*
 *   Air Conditioner Accessory
 */

function WinkAirConditionerAccessory(platform, device, oService, oCharacteristic, oAccessory, ouuid) {
    // Common Base Items
    this.device = device;
    this.name = device.name;
    this.log = platform.log;
    this.platform = platform;
    this.deviceGroup = 'air_conditioners';
    this.deviceId = this.device.air_conditioner_id;

    Service = oService;
    Characteristic = oCharacteristic;
    Accessory = oAccessory;
    uuid = ouuid;

    var idKey = 'hbdev:wink:' + this.deviceGroup + ':' + this.deviceId;
    var id = uuid.generate(idKey);
    Accessory.call(this, this.name, id);
    this.uuid_base = id;

    this.control = wink.device_group(this.deviceGroup).device_id(this.deviceId);

    //this.log(idKey+' '+ JSON.stringify(device));
    var that = this;
    // set some basic properties (these values are arbitrary and setting them is optional)
    this
        .getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, this.device.device_manufacturer)
        .setCharacteristic(Characteristic.Model, this.device.model_name);

    //Items specific to Thermostats:

    //Handle the Current State
    this
        .addService(Service.Thermostat)
        .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
        .on('get', function(callback) {
            if (that.device.last_reading.powered) { //I need to verify this changes when the thermostat clicks on.
                switch (that.device.last_reading.mode) {
                    case "cool_only":
                        callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
                        break;
                    case "auto_eco": //HomeKit only accepts HEAT/COOL, so we have to determine if we are Heating or Cooling.
                        if (that.device.last_reading.temperature > that.device.last_reading.max_set_point)
                            callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
                        else
                            callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
                        break;
                    default: //If it is fan_only or anything else then we'll report the thermostat as off.
                        callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
                        break;
                }
            } else //For now, powered being false means it is off
                callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
        });

    //Handle the Target State
    //Handle the Current State
    this
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .on('get', function(callback) {
            if (that.device.desired_state.powered) { //I need to verify this changes when the thermostat clicks on.
                switch (that.device.desired_state.mode) {
                    case "cool_only":
                        callback(null, Characteristic.TargetHeatingCoolingState.COOL);
                        break;
                    case "auto_eco":
                        callback(null, Characteristic.TargetHeatingCoolingState.AUTO);
                        break;
                    default: //The above list should be inclusive, but we need to return something if they change stuff.
                        callback(null, Characteristic.TargetHeatingCoolingState.OFF);
                        break;
                }
            } else //For now, powered being false means it is off
                callback(null, Characteristic.TargetHeatingCoolingState.OFF);
        })
        .on('set', function(value, callback) {
            switch (value) {
                case Characteristic.TargetHeatingCoolingState.COOL:
                    platform.UpdateWinkProperty_noFeedback(that, callback, ["powered", "mode"], [true, "cool_only"]);
                    break;
                case Characteristic.TargetHeatingCoolingState.AUTO:
                    platform.UpdateWinkProperty_noFeedback(that, callback, ["powered", "mode"], [true, "auto_eco"]);
                    break;
                case Characteristic.TargetHeatingCoolingState.OFF:
                    platform.UpdateWinkProperty_noFeedback(that, callback, "powered", false);
                    break;
            }
        });

    this
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.CurrentTemperature)
        .on('get', function(callback) {
            callback(null, that.device.last_reading.temperature);
        });

    this
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.TargetTemperature)
        .on('get', function(callback) {
            callback(null, that.device.desired_state.max_set_point);
        })
        .on('set', function(value, callback) {
            platform.UpdateWinkProperty_noFeedback(that, callback, "max_set_point", value);
        });

    this
        .getService(Service.Thermostat)
        .getCharacteristic(Characteristic.TemperatureDisplayUnits)
        .on('get', function(callback) {
            if (platform.temperature_unit == "C")
                callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
            else
                callback(null, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
        });

}

WinkAirConditionerAccessory.prototype = {
    loadData: function() {
        this
            .getService(Service.Thermostat)
            .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
            .getValue();

        this
            .getService(Service.Thermostat)
            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .getValue();

        this
            .getService(Service.Thermostat)
            .getCharacteristic(Characteristic.CurrentTemperature)
            .getValue();

        this
            .getService(Service.Thermostat)
            .getCharacteristic(Characteristic.TargetTemperature)
            .getValue();

        this
            .getService(Service.Thermostat)
            .getCharacteristic(Characteristic.TemperatureDisplayUnits)
            .getValue();

    },

    getServices: function() {
        return this.services;
    },

    handleResponse: function(res) {
        if (!res) {
            return Error("No response from Wink");
        } else if (res.errors && res.errors.length > 0) {
            return res.errors[0];
        } else if (res.data) {
            this.device = res.data;
            this.loadData();
        }
    }
}
module.exports = WinkAirConditionerAccessory;