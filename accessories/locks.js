var wink = require('wink-js');
var inherits = require('util').inherits;

/*
 *   Generic Accessory
 */
var Service, Characteristic, Accessory, uuid;

/*
 *   Lock Accessory
 */

function WinkLockAccessory(platform, device, oService, oCharacteristic, oAccessory, ouuid) {
    // Common Base Items
    this.device = device;
    this.name = device.name;
    this.log = platform.log;
    this.platform = platform;
    this.deviceGroup = 'locks';
    this.deviceId = this.device.lock_id;

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

    //Items specific to Door Locks:
    this
        .addService(Service.LockMechanism)
        .getCharacteristic(Characteristic.LockCurrentState)
        .on('get', function(callback) {
            switch (that.device.last_reading.locked) {
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
        });

    this
        .getService(Service.LockMechanism)
        .getCharacteristic(Characteristic.LockTargetState)
        .on('get', function(callback) {
            switch (that.device.desired_state.locked) {
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
        })
        .on('set', function(value, callback) {
            switch (value) {
                case Characteristic.LockTargetState.SECURED:
                    platform.UpdateWinkProperty_withFeedback(that, callback, "locked", true);
                    break;
                case Characteristic.LockTargetState.UNSECURED:
                    platform.UpdateWinkProperty_withFeedback(that, callback, "locked", false);
                    break;
            }
        });

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

WinkLockAccessory.prototype = {
    loadData: function() {
        this.getService(Service.LockMechanism)
            .getCharacteristic(Characteristic.LockCurrentState)
            .getValue();
        this.getService(Service.LockMechanism)
            .getCharacteristic(Characteristic.LockTargetState)
            .getValue();
        if (this.device.last_reading.battery !== undefined) {
            this.getService(Service.BatteryService)
                .getCharacteristic(Characteristic.BatteryLevel)
                .getValue();
            this.getService(Service.BatteryService)
                .getCharacteristic(Characteristic.StatusLowBattery)
                .getValue();
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
module.exports = WinkLockAccessory;