//
var wink = require('wink-js');

process.env.WINK_NO_CACHE = true;

var Service, Characteristic, Accessory, uuid;

var WinkAccessory;
var WinkLockAccessory;
var WinkLightAccessory;
var WinkSwitchAccessory;
var WinkGarageDoorAccessory;
var WinkOutletAccessory;
var WinkSmokeDetectorAccessory;
var WinkThermostatAccessory;
var WinkAirConditionerAccessory;
var WinkSensorAccessory;
var WinkPropaneTankAccessory;
var WinkSirenAccessory;
var WinkShadeAccessory;

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Accessory = homebridge.hap.Accessory;
	uuid = homebridge.hap.uuid;

	WinkAccessory = require('./lib/wink-accessory')(Accessory, Service, Characteristic, uuid);
	WinkLockAccessory = require('./accessories/locks')(WinkAccessory, Accessory, Service, Characteristic, uuid);
	WinkLightAccessory = require('./accessories/light_bulbs')(WinkAccessory, Accessory, Service, Characteristic, uuid);
	WinkSwitchAccessory = require('./accessories/binary_switches')(WinkAccessory, Accessory, Service, Characteristic, uuid);
	WinkGarageDoorAccessory = require('./accessories/garage_doors')(WinkAccessory, Accessory, Service, Characteristic, uuid);
	WinkOutletAccessory = require('./accessories/outlets')(WinkAccessory, Accessory, Service, Characteristic, uuid);
	WinkSmokeDetectorAccessory = require('./accessories/smoke_detectors')(WinkAccessory, Accessory, Service, Characteristic, uuid);
	WinkThermostatAccessory = require('./accessories/thermostats')(WinkAccessory, Accessory, Service, Characteristic, uuid);
	WinkAirConditionerAccessory = require('./accessories/air_conditioners')(WinkAccessory, Accessory, Service, Characteristic, uuid);
	WinkSensorAccessory = require('./accessories/sensor_pods')(WinkAccessory, Accessory, Service, Characteristic, uuid);
	WinkPropaneTankAccessory = require('./accessories/propane_tanks')(WinkAccessory, Accessory, Service, Characteristic, uuid);
	WinkSirenAccessory = require('./accessories/sirens')(WinkAccessory, Accessory, Service, Characteristic, uuid);
	WinkShadeAccessory = require('./accessories/shades')(WinkAccessory, Accessory, Service, Characteristic, uuid);
	
	homebridge.registerPlatform("homebridge-wink", "Wink", WinkPlatform);
};

function WinkPlatform(log, config) {
	// Load Wink Authentication From Config File
	this.client_id = config["client_id"];
	this.client_secret = config["client_secret"];

	this.username = config["username"];
	this.password = config["password"];

	// Load Groups or IDs that should be hidden from the Config File.
	this.hidegroups = config["hide_groups"];
	this.hideids = config["hide_ids"];
	if (this.hidegroups == undefined) this.hidegroups = [];
	if (this.hideids == undefined) this.hideids = [];

	// If this is true then devices that the Wink hub cannot communicate with will not be registered.
	// In addition, any devices that lose communication will be unregistered which will allow HomeKit to know the device is not accessible.
	this.unregister_disconnected = config["unregister_disconnected"] | false;

	//For Temperatures, what Display unit should we report (C or F)
	this.temperature_unit = config["temperature_unit"];
	if (this.temperature_unit === undefined) this.temperature_unit = "F";

	//Allows specific positional sensors to be treated as Windows instead of Doors
	this.windowsensors = config["window_ids"];
	if (this.windowsensors == undefined) this.windowsensors = [];

	
	this.log = log;
	this.deviceLookup = {};
}

WinkPlatform.prototype = {
	reloadData: function (callback) {
		//This is called when we need to refresh all Wink device information.
		this.log.debug("Refreshing Wink Data");
		var that = this;
		wink.user().devices(function (devices) { //TODO: Add the ability to detect new devices and unregister newly disconnected devices.
			if (devices && devices.data && devices.data instanceof Array) {
				for (var i = 0; i < devices.data.length; i++) {
					var device = devices.data[i];
					//NEWMODULE: Add the id here. I'm planning to redesign this section.
					var accessory = that.deviceLookup[device.lock_id | device.light_bulb_id | device.binary_switch_id | device.garage_door_id | device.outlet_id | device.smoke_detector_id | device.thermostat_id | device.air_conditioner_id | device.sensor_pod_id | device.propane_tank_id | device.siren_id | ""];
					if (accessory != undefined) {
						accessory.device = device;
						accessory.loadData();
					}
				}
			}
			if (callback) callback();
		});
	},
	accessories: function (callback) {
		this.log("Fetching Wink devices.");

		var that = this;
		var foundAccessories = [];
		this.deviceLookup = {};

		var refreshLoop = function () {
			setInterval(that.reloadData.bind(that), 30000);
		};

		wink.init({
			"client_id": this.client_id,
			"client_secret": this.client_secret,
			"username": this.username,
			"password": this.password
		}, function (auth_return) {
			if (auth_return === undefined) {
				that.log("There was a problem authenticating with Wink.");
			} else {
				// success
				wink.user().devices(function (devices) {
					for (var i = 0; i < devices.data.length; i++) {
						var device = devices.data[i];
						var accessory = null;
						//Get Device Type
						//NEWMODULE: Add Appropriate Lines Here
						if (device.light_bulb_id !== undefined)
							accessory = new WinkLightAccessory(that, device);

						else if (device.garage_door_id !== undefined)
							accessory = new WinkGarageDoorAccessory(that, device);

						else if (device.lock_id !== undefined)
							accessory = new WinkLockAccessory(that, device);

						else if (device.binary_switch_id !== undefined)
							accessory = new WinkSwitchAccessory(that, device);

						else if (device.powerstrip_id !== undefined) {
							for (var j = 0; j < device.outlets.length; j++) {
								accessory = new WinkOutletAccessory(that, device.outlets[j]);
								if (accessory != undefined) {
									that.deviceLookup[accessory.deviceId] = accessory;
									foundAccessories.push(accessory);
								}
								accessory = undefined;
							}

						} else if (device.smoke_detector_id !== undefined)
							accessory = new WinkSmokeDetectorAccessory(that, device);

						else if (device.thermostat_id !== undefined)
							accessory = new WinkThermostatAccessory(that, device);

						else if (device.air_conditioner_id !== undefined)
							accessory = new WinkAirConditionerAccessory(that, device);

						else if (device.sensor_pod_id !== undefined)
							accessory = new WinkSensorAccessory(that, device);

						else if (device.propane_tank_id !== undefined)
							accessory = new WinkPropaneTankAccessory(that, device);

						else if (device.siren_id !== undefined)
							accessory = new WinkSirenAccessory(that, device);

						else if (device.shade_id !== undefined)
							accessory = new WinkShadeAccessory(that, device);

						//These are here to prevent Unknown Device Groups in the logs when we know what the device is and can't represent it
						//with a HomeKit service yet.
						else if (device.manufacturer_device_model = "wink_hub")
							that.log("Device Ignored Not In HomeKit - Group hubs, ID " + device.hub_id + ", Name " + device.name);
						else if (device.remote_id !== undefined)
							that.log("Device Ignored Not In HomeKit - Group remotes, ID " + device.remote_id + ", Name " + device.name);
						else if (device.unknown_device_id !== undefined)
							that.log("Device Ignored Not In HomeKit - Group unknown_devices, ID " + device.unknown_device_id + ", Name " + device.name);
						else if (device.eggtray_id !== undefined)
							that.log("Device Ignored Not In HomeKit - Group eggtrays, ID " + device.eggtray_id + ", Name " + device.name);
						else if (device.piggy_bank_id !== undefined)
							that.log("Device Ignored Not In HomeKit - Group piggy_banks, ID " + device.piggy_bank_id + ", Name " + device.name);

						else that.log("Unknown Device Group: " + JSON.stringify(device));

						if (accessory != undefined) {
							if (that.hidegroups.indexOf(accessory.deviceGroup) >= 0) { //Make sure the group isn't supposed to be hidden
								that.log("Device Ignored By Group - Group " + accessory.deviceGroup + ", ID " + accessory.deviceId + ", Name " + accessory.name);
							} else if (that.hideids.indexOf(accessory.deviceId) >= 0) { //Make sure the ID isn't supposed to be hidden
								that.log("Device Ignored By ID - Group " + accessory.deviceGroup + ", ID " + accessory.deviceId + ", Name " + accessory.name);
							} else if (that.unregister_disconnected && !accessory.device.last_reading.connection) {
								that.log("Device Ignored By Disconnection - Group " + accessory.deviceGroup + ", ID " + accessory.deviceId + ", Name " + accessory.name);
							} else {
								that.log("Device Added - Group " + accessory.deviceGroup + ", ID " + accessory.deviceId + ", Name " + accessory.name);
								that.deviceLookup[accessory.deviceId] = accessory;
								foundAccessories.push(accessory);
							}
						}
					}
					refreshLoop();
					callback(foundAccessories);
				});
			}
		});
	}
};