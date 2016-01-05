//

var wink = require('wink-js');
var inherits = require('util').inherits;

//NEWMODULE: Add the object reference here
var WinkLockAccessory = require('./accessories/locks');
var WinkLightAccessory = require('./accessories/light_bulbs');
var WinkSwitchAccessory = require('./accessories/binary_switches');
var WinkGarageDoorAccessory = require('./accessories/garage_doors');
process.env.WINK_NO_CACHE = true;

var Service, Characteristic, Accessory, uuid;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    uuid = homebridge.hap.uuid;
    homebridge.registerPlatform("homebridge-wink", "Wink", WinkPlatform);

    var copyInherit = function(orig, base){
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
};
function WinkPlatform(log, config){
  

  
  // auth info
  this.client_id = config["client_id"];
  this.client_secret = config["client_secret"];

  this.username = config["username"];
  this.password = config["password"];

  this.log = log;
  this.deviceLookup = {};
}

WinkPlatform.prototype = {
  reloadData: function(callback) {
    this.log("Refreshing Wink Data");
    var that = this;
    wink.user().devices(function(devices) {
      if (devices && devices.data && devices.data instanceof Array) {
        for (var i=0; i<devices.data.length; i++){
          var device = devices.data[i];
          //NEWMODULE: Add the id here. I'm planning to redesign this section.
          var accessory = that.deviceLookup[device.lock_id | device.light_bulb_id | ""];
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

    var refreshLoop = function(){
      setInterval(that.reloadData.bind(that), 30000);
    };

    wink.init({
        "client_id": this.client_id,
        "client_secret": this.client_secret,
        "username": this.username,
        "password": this.password
    }, function(auth_return) {
      if ( auth_return === undefined ) {
        that.log("There was a problem authenticating with Wink.");
      } else {
        // success
        wink.user().devices(function(devices) {
          for (var i=0; i<devices.data.length; i++){
            var device = devices.data[i];
            var accessory = null;
            
              //Get Device Type
//NEWMODULE: Uncomment and complete the appropriate lines here.
  if (device.light_bulb_id !== undefined)
    accessory = new WinkLightAccessory(that, device, Service, Characteristic, Accessory, uuid);
  else if (device.garage_door_id !== undefined) 
    accessory = new WinkGarageDoorAccessory(that, device, Service, Characteristic, Accessory, uuid);
  else if (device.lock_id !== undefined) 
    accessory = new WinkLockAccessory(that, device, Service, Characteristic, Accessory, uuid);
  else if (device.binary_switch_id !== undefined) 
    accessory = new WinkSwitchAccessory(that, device, Service, Characteristic, Accessory, uuid);
  //else i (device.sensor_id !== undefined) { this.device_group='sensor'; this.device_id=this.device.sensor_id; }
  //else i (device.smoke_detector_id !== undefined) { this.device_group='smoke_detector'; this.device_id=this.device.smoke_detector_id; }
  //else i (device.thermostat_id !== undefined) { this.device_group='thermostat'; this.device_id=this.device.thermostat_id; }
  
  
  //else i (device.power_strip_id !== undefined) { this.device_group='power_strip'; this.device_id=this.device.power_strip_id; }
  //else i (device.outlet_id !== undefined) { this.device_group='outlet'; this.device_id=this.device.outlet_id; }
  //else i (device.air_conditioner_id !== undefined) { this.device_group='air_conditioner'; this.device_id=this.device.air_conditioner_id; }
  //else i (device.shade_id !== undefined) { this.device_group='shade'; this.device_id=this.device.shade_id; }
  //else i (device.camera_id !== undefined) { this.device_group='camera'; this.device_id=this.device.camera_id; }
  //else i (device.doorbell_id !== undefined) { this.device_group='doorbell'; this.device_id=this.device.doorbell_id; }
  //else i (device.cloud_clock_id !== undefined) { this.device_group='cloud_clock'; this.device_id=this.device.cloud_clock_id; }
  //else i (device.alarm_id !== undefined) { this.device_group='alarm'; this.device_id=this.device.alarm_id; }
  //else i (device.piggy_bank_id !== undefined) { this.device_group='piggy_bank'; this.device_id=this.device.piggy_bank_id; }
  //else i (device.deposit_id !== undefined) { this.device_group='deposit'; this.device_id=this.device.deposit_id; }
  //else i (device.refrigerator_id !== undefined) { this.device_group='refrigerator'; this.device_id=this.device.refrigerator_id; }
  //else i (device.propane_tank_id !== undefined) { this.device_group='propane_tank'; this.device_id=this.device.propane_tank_id; }
  //else i (device.remote_id !== undefined) { this.device_group='remote'; this.device_id=this.device.remote_id; }
  //else i (device.siren_id !== undefined) { this.device_group='siren'; this.device_id=this.device.siren_id; }
  //else i (device.sprinkler_id !== undefined) { this.device_group='sprinkler'; this.device_id=this.device.sprinkler_id; }
  //else i (device.water_heater_id !== undefined) { this.device_group='water_heater'; this.device_id=this.device.water_heater_id; }
  //else i (device.unknown_device_id !== undefined) { this.device_group='unknown_device'; this.device_id=this.device.unknown_device_id; }
  //else i (device.hub_id !== undefined) { this.device_group='hub'; this.device_id=this.device.hub_id; }
  
            
            if (accessory != undefined) {
              that.deviceLookup[accessory.deviceId] = accessory;
              foundAccessories.push(accessory);
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
    if (WinkAccessory.device.desired_state == undefined) { callback(Error("Unsupported")); return; };
    if (WinkAccessory.device.desired_state[sProperty] == undefined) { callback(Error("Unsupported")); return; };

    var myvariable = { "desired_state": {  } };
    myvariable.desired_state[sProperty]=sTarget;
    WinkAccessory.control.update(myvariable, callback);
  },
  refreshUntil: function(that, maxTimes, predicate, callback, interval, incrementInterval, sProperty) {
    if (!interval) {
      interval = 500;
    }
    if (!incrementInterval) {
      incrementInterval = 500;
    }
    setTimeout(function() {
      that.reloadData(function() {
        if (predicate == undefined || predicate(that.device, sProperty) == true) {
          if (callback) callback(true, that.device, sProperty);
        } else if (maxTimes > 0) {
          maxTimes = maxTimes - 1;
          interval += incrementInterval;
          this.refreshUntil(that, maxTimes, predicate, callback, interval, incrementInterval, sProperty);
        } else {
          if (callback) callback(false, that.device, sProperty);
        }
      });
    }, interval);
  },
  UpdateWinkProperty_withFeedback: function(WinkAccessory, callback, sProperty, sTarget) {
    this.log("Changing target property '" + sProperty + "' of the " + WinkAccessory.device.device_group + " called " + WinkAccessory.device.name + " to " + sTarget);
    if (WinkAccessory.device.desired_state == undefined) { callback(Error("Unsupported")); return; };
    if (WinkAccessory.device.desired_state[sProperty] == undefined) { callback(Error("Unsupported")); return; };

    var myvariable = { "desired_state": {  } };
    myvariable.desired_state[sProperty]=sTarget;
    
    var update = function(retry) {
          WinkAccessory.control.update(myvariable, 
            function(res) {
              var err = WinkAccessory.handleResponse(res);
              if (!err) {
                this.refreshUntil(WinkAccessory.device, 5,
                  function(sProperty) { return WinkAccessory.device.last_reading[sProperty] == WinkAccessory.device.desired_state[sProperty]; },
                  function(completed, device, sProperty) {
                    if (completed) {
                      this.log("Successfully changed target property '" + sProperty + "' of the " + WinkAccessory.device.device_group + " called " + WinkAccessory.device.name + " to " + sTarget);
                    } else if (retry) {
                      this.log("Unable to determine if update was successful. Retrying update.");
                      retry();
                    } else {
                      this.log("Unable to determine if update was successful.");
                    }
                  });
            }
            if (callback)
            {
              callback(err);
              callback = null;
            }
          });
        };
        update(update);
  }
};
