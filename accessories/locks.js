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
  this.deviceGroup='locks';
  this.deviceId=this.device.lock_id;

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
        switch(value) {
          case Characteristic.LockTargetState.SECURED:
            platform.UpdateWinkProperty_noFeedback(that, callback, "locked", true);
            break;
          case Characteristic.LockTargetState.UNSECURED:
            platform.UpdateWinkProperty_noFeedback(that, callback, "locked", false);
            break;
        }
      });  
}

WinkLockAccessory.prototype = {
  loadData: function() {
    this.getService(Service.LockMechanism)
      .getCharacteristic(Characteristic.LockCurrentState)
      .getValue();
    this.getService(Service.LockMechanism)
      .getCharacteristic(Characteristic.LockTargetState)
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