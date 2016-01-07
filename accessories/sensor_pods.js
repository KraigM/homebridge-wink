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
    this.deviceGroup = 'sensor_pods';
    this.deviceId = this.device.sensor_pod_id;

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


    //brightness <- This is change in brightness. No similar HomeKit Service.
    //external_power
    //loudness 0/1
    //vibration 0/1

    //opened true/false
    //tamper_detected true/false

    //Motion detector with PIR
    if (that.device.last_reading.motion !== undefined) {
        this
            .addService(Service.MotionSensor)
            .getCharacteristic(Characteristic.MotionDetected)
            .on('get', function(callback) {
                callback(null, that.device.last_reading.motion);
            });
        if (that.device.last_reading.tamper_detected !== undefined)
            this
            .getService(Service.MotionSensor)
            .getCharacteristic(Characteristic.StatusTampered)
            .on('get', function(callback) {
                callback(null, that.device.last_reading.tamper_detected);
            });
    }

    //Humidity Detection
    if (that.device.last_reading.humidity !== undefined)
        this
        .addService(Service.HumiditySensor)
        .getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .on('get', function(callback) {
            callback(null, that.device.last_reading.humidity);
        });

    //Temperature Detection
    if (that.device.last_reading.temperature !== undefined)
        this
        .addService(Service.TemperatureSensor)
        .getCharacteristic(Characteristic.CurrentTemperature)
        .on('get', function(callback) {
            callback(null, that.device.last_reading.temperature);
        });

    //Open/Close Sensor
    if (that.device.last_reading.opened !== undefined)
        this
        .addService(Service.Door)
        .getCharacteristic(Characteristic.CurrentPosition)
        .on('get', function(callback) {
            if (that.device.last_reading.opened)
                callback(null, 100);
            else
                callback(null, 0);
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
        if (this.device.last_reading.battery !== undefined) {
            this.getService(Service.BatteryService)
                .getCharacteristic(Characteristic.BatteryLevel)
                .getValue();
            this.getService(Service.BatteryService)
                .getCharacteristic(Characteristic.StatusLowBattery)
                .getValue();
        }

        //Motion detector with PIR
        if (this.device.last_reading.motion !== undefined) {
            this
                .getService(Service.MotionSensor)
                .getCharacteristic(Characteristic.MotionDetected)
                .getValue();
            if (this.device.last_reading.tamper_detected !== undefined)
                this
                .getService(Service.MotionSensor)
                .getCharacteristic(Characteristic.StatusTampered)
                .getValue();
        }

        //Humidity Detection
        if (this.device.last_reading.humidity !== undefined)
            this
            .getService(Service.HumiditySensor)
            .getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .getValue();

        //Temperature Detection
        if (this.device.last_reading.temperature !== undefined)
            this
            .getService(Service.TemperatureSensor)
            .getCharacteristic(Characteristic.CurrentTemperature)
            .getValue();

        //Open/Close Sensor
        if (this.device.last_reading.opened !== undefined)
            this
            .getService(Service.Door)
            .getCharacteristic(Characteristic.CurrentPosition)
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
module.exports = WinkLockAccessory;