var wink = require('wink-js');
var inherits = require('util').inherits;

var Service, Characteristic, Accessory, uuid;

/*
 *   Garage Door Accessory
 */

function WinkSmokeDetectorAccessory(platform, device, oService, oCharacteristic, oAccessory, ouuid) {
  // Common Base Items
  this.device = device;
  this.name = device.name;
  this.log = platform.log;
  this.platform = platform;
  this.deviceGroup='smoke_detectors';
  this.deviceId=this.device.smoke_detector_id;

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
      
  //Items specific to Smoke Detectors:
  if (this.device.last_reading.co_detected !== undefined) {
    this.addService(Service.CarbonMonoxideSensor)  
      .getCharacteristic(Characteristic.CarbonMonoxideDetected)
      .on('get', function(callback) {
        if (that.device.last_reading.co_detected)
          callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL);
        else
          callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
      });
  if (this.device.last_reading.battery !== undefined)    
    this.getService(Service.CarbonMonoxideSensor)  
      .getCharacteristic(Characteristic.StatusLowBattery)
      .on('get', function(callback) {
        if (that.device.last_reading.battery<0.25)
          callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
        else
          callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      });
   }
      
  if (this.device.last_reading.smoke_detected !== undefined) {
    this.addService(Service.SmokeSensor)  
      .getCharacteristic(Characteristic.SmokeDetected)
      .on('get', function(callback) {
        if (that.device.last_reading.smoke_detected)
          callback(null, Characteristic.SmokeDetected.SMOKE_DETECTED);
        else
          callback(null, Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
      });
  if (this.device.last_reading.battery !== undefined)    
    this.getService(Service.SmokeSensor)  
      .getCharacteristic(Characteristic.StatusLowBattery)
      .on('get', function(callback) {
        if (that.device.last_reading.battery<0.25)
          callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
        else
          callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      });
    }
  
  //Track the Battery Level
  if (that.device.last_reading.battery !== undefined) {
    this.addService(Service.BatteryService)  
      .getCharacteristic(Characteristic.BatteryLevel)
      .on('get', function(callback) {
        callback(null, Math.floor(that.device.last_reading.battery*100));
      });

    this.getService(Service.BatteryService)  
      .getCharacteristic(Characteristic.StatusLowBattery)
      .on('get', function(callback) {
        if (that.device.last_reading.battery<0.25)
          callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
        else
          callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
      });
      
    this.getService(Service.BatteryService)  
      .setCharacteristic(Characteristic.ChargingState, Characteristic.ChargingState.NOT_CHARGING);
  }
//End Battery Level Tracking     
}

WinkSmokeDetectorAccessory.prototype = {
  loadData: function() {
    
  if (this.device.last_reading.co_detected !== undefined) {
    this.getService(Service.CarbonMonoxideSensor)  
      .getCharacteristic(Characteristic.CarbonMonoxideDetected)
      .getValue();
  if (this.device.last_reading.battery !== undefined)    
    this.getService(Service.CarbonMonoxideSensor)  
      .getCharacteristic(Characteristic.StatusLowBattery)
      .getValue();
   }
      
  if (this.device.last_reading.smoke_detected !== undefined) {
    this.getService(Service.SmokeSensor)  
      .getCharacteristic(Characteristic.SmokeDetected)
      .getValue();
  if (this.device.last_reading.battery !== undefined)    
    this.getService(Service.SmokeSensor)  
      .getCharacteristic(Characteristic.StatusLowBattery)
      .getValue();
    }
  
  
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
module.exports = WinkSmokeDetectorAccessory;