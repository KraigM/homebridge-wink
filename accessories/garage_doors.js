var wink = require('wink-js');
var inherits = require('util').inherits;

var Service, Characteristic, Accessory, uuid;

/*
 *   Garage Door Accessory
 */

function WinkGarageDoorAccessory(platform, device, oService, oCharacteristic, oAccessory, ouuid) {
    // Common Base Items
    this.device = device;
    this.name = device.name;
    this.log = platform.log;
    this.platform = platform;
    this.deviceGroup = 'garage_doors';
    this.deviceId = this.device.garage_door_id;

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
        .setCharacteristic(Characteristic.Model, this.device.model_name)
        .setCharacteristic(Characteristic.Name, this.device.name);

    //Items specific to Garage Doors:
    this
        .addService(Service.GarageDoorOpener)
        .getCharacteristic(Characteristic.TargetDoorState)
        .on('get', function(callback) {
            if (that.device.desired_state.position == 0)
                callback(null, Characteristic.TargetDoorState.CLOSED);
            else if (that.device.desired_state.position == 1)
                callback(null, Characteristic.TargetDoorState.OPEN);
        })
        .on('set', function(value, callback) {
            if (value == Characteristic.TargetDoorState.OPEN)
                platform.UpdateWinkProperty_withFeedback(that, callback, "position", 1);
            else if (value == Characteristic.TargetDoorState.CLOSED)
                platform.UpdateWinkProperty_withFeedback(that, callback, "position", 0);
        });

    this
        .getService(Service.GarageDoorOpener)
        .getCharacteristic(Characteristic.CurrentDoorState)
        .on('get', function(callback) {
            if (that.device.last_reading.position == 0)
                callback(null, Characteristic.CurrentDoorState.CLOSED);
            else if (that.device.last_reading.position == 1)
                callback(null, Characteristic.CurrentDoorState.OPEN);
        })
    this
        .getService(Service.GarageDoorOpener)
        .setCharacteristic(Characteristic.ObstructionDetected, false);

    //Track the Battery Level
    if (that.device.last_reading.battery !== undefined) {
        this.addService(Service.BatteryService)
            .getCharacteristic(Characteristic.BatteryLevel)
            .on('get', function(callback) {
                callback(null, Math.floor(that.device.last_reading.battery * 100));
            });

        this.getService(Service.BatteryService)
            .getCharacteristic(Characteristic.StatusLowBattery)
            .on('get', function(callback) {
                if (that.device.last_reading.battery < 0.25)
                    callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
                else
                    callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
            });

        this.getService(Service.BatteryService)
            .setCharacteristic(Characteristic.ChargingState, Characteristic.ChargingState.NOT_CHARGING);
    }
    //End Battery Level Tracking     
}

WinkGarageDoorAccessory.prototype = {
    loadData: function() {
        this.getService(Service.GarageDoorOpener)
            .getCharacteristic(Characteristic.CurrentDoorState)
            .getValue();
        this.getService(Service.GarageDoorOpener)
            .getCharacteristic(Characteristic.TargetDoorState)
            .getValue();
        if (this.device.last_reading.battery !== undefined) {
            this.getService(Service.BatteryService)
                .getCharacteristic(Characteristic.BatteryLevel)
                .getValue
            this.getService(Service.BatteryService)
                .getCharacteristic(Characteristic.StatusLowBattery)
                .getValue
        }
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
module.exports = WinkGarageDoorAccessory;