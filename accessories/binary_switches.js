var wink = require('wink-js');
var inherits = require('util').inherits;

var Service, Characteristic, Accessory, uuid;

/*
 *   Binary Switch Accessory
 */

function WinkSwitchAccessory(platform, device, oService, oCharacteristic, oAccessory, ouuid) {
    // Common Base Items
    this.device = device;
    this.name = device.name;
    this.log = platform.log;
    this.platform = platform;
    this.deviceGroup = 'binary_switches';
    this.deviceId = this.device.binary_switch_id;

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

    if (that.device.last_reading.consumption == undefined) {
        //If consumption is undefined then we will treat this like a lightbulb
        this
            .addService(Service.Lightbulb)
            .getCharacteristic(Characteristic.On)
            .on('get', function(callback) {
                callback(null, that.device.last_reading.powered);
            })
            .on('set', function(value, callback) {
                platform.UpdateWinkProperty_noFeedback(that, callback, "powered", value);
            });
    } else {
        //If consumption is defined then we will treat this as an Outlet.
        //This covers the Outlink Wall Plug.
        this
            .addService(Service.Outlet)
            .getCharacteristic(Characteristic.On)
            .on('get', function(callback) {
                callback(null, that.device.last_reading.powered);
            })
            .on('set', function(value, callback) {
                platform.UpdateWinkProperty_noFeedback(that, callback, "powered", value);
            });
        this
            .getService(Service.Outlet)
            .getCharacteristic(Characteristic.OutletInUse)
            .on('get', function(callback) {
                callback(null, (that.device.last_reading.consumption > 0.1));
            });
    }
}

WinkSwitchAccessory.prototype = {
    loadData: function() {
        if (this.device.last_reading.consumption == undefined) {
            this.getService(Service.Lightbulb)
                .getCharacteristic(Characteristic.On)
                .getValue();
        } else {
            this.getService(Service.Outlet)
                .getCharacteristic(Characteristic.On)
                .getValue();
            this.getService(Service.Outlet)
                .getCharacteristic(Characteristic.OutletInUse)
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
module.exports = WinkSwitchAccessory;