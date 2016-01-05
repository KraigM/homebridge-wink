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
  this.deviceGroup='binary_switches';
  this.deviceId=this.device.binary_switch_id;

 Service = oService;
 Characteristic = oCharacteristic;
 Accessory = oAccessory;
 uuid = ouuid;

  var idKey = 'hbdev:wink:' + this.device.name + ':' + this.deviceGroup + ':' + this.deviceId;
  var id = uuid.generate(idKey);
  Accessory.call(this, this.name, id);
  this.uuid_base = id;

  this.control = wink.device_group(this.deviceGroup).device_id(this.deviceId);

  this.log(idKey);
  var that = this;
  // set some basic properties (these values are arbitrary and setting them is optional)
  this
      .getService(Service.AccessoryInformation)
      .setCharacteristic(Characteristic.Manufacturer, this.device.device_manufacturer)
      .setCharacteristic(Characteristic.Model, this.device.model_name)
      .setCharacteristic(Characteristic.Name, this.device.name);
      
  //Items specific to Light Bulbs Locks:
     this
      .addService(Service.Lightbulb)
      .getCharacteristic(Characteristic.On)
      .on('get', function(callback) {
        callback(null, that.device.last_reading.powered);
      })
      .on('set', function(value, callback) {
        platform.UpdateWinkProperty_noFeedback(that, callback, "powered", value);
      });
}

WinkSwitchAccessory.prototype = {
  loadData: function() {
    this.getService(Service.Lightbulb)
      .getCharacteristic(Characteristic.On)
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
module.exports = WinkSwitchAccessory;