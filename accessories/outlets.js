var wink = require('wink-js');
var inherits = require('util').inherits;

var Service, Characteristic, Accessory, uuid;

/*
 *   Outlet Accessory (Sub Accessory of the Powerstrip)
 */

function WinkOutletAccessory(platform, device, oService, oCharacteristic, oAccessory, ouuid) {
  // Common Base Items
  this.device = device;
  this.name = device.name;
  this.log = platform.log;
  this.platform = platform;
  this.deviceGroup='outlets';
  this.deviceId=this.device.outlet_id;

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
   .setCharacteristic(Characteristic.OutletInUse, false); 
}

WinkOutletAccessory.prototype = {
  loadData: function() {
    this.getService(Service.Outlet)
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
module.exports = WinkOutletAccessory;