var wink = require('wink-js');
var inherits = require('util').inherits;

/*
 *   Generic Accessory
 */
var WinkAccessory, Accessory, Service, Characteristic, uuid;

/*
 *   Lock Accessory
 */

module.exports = function (oWinkAccessory, oAccessory, oService, oCharacteristic, ouuid) {
	if (oWinkAccessory) {
		WinkAccessory = oWinkAccessory;
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(WinkLockAccessory, WinkAccessory);
		WinkLockAccessory.prototype.loadData = loadData;
		WinkLockAccessory.prototype.deviceGroup = 'locks';
	}
	return WinkLockAccessory;
};
module.exports.WinkLockAccessory = WinkLockAccessory;

function WinkLockAccessory(platform, device) {
	WinkAccessory.call(this, platform, device, device.lock_id);

	var that = this;

	//Items specific to Door Locks:
	this
		.addService(Service.LockMechanism)
		.getCharacteristic(Characteristic.LockCurrentState)
		.on('get', function (callback) {
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
		.on('get', function (callback) {
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
		.on('set', function (value, callback) {
			switch (value) {
				case Characteristic.LockTargetState.SECURED:
					that.updateWinkProperty(callback, "locked", true);
					break;
				case Characteristic.LockTargetState.UNSECURED:
					that.updateWinkProperty(callback, "locked", false);
					break;
			}
		});

	//Track the Battery Level
	if (that.device.last_reading.battery !== undefined) {
		this.addService(Service.BatteryService)
			.getCharacteristic(Characteristic.BatteryLevel)
			.on('get', function (callback) {
				callback(null, Math.floor(that.device.last_reading.battery * 100));
			});

		this.getService(Service.BatteryService)
			.getCharacteristic(Characteristic.StatusLowBattery)
			.on('get', function (callback) {
				if (that.device.last_reading.battery < 0.25)
					callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
				else
					callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
			});

		this.getService(Service.BatteryService)
			.setCharacteristic(Characteristic.ChargingState, Characteristic.ChargingState.NOT_CHARGING);
	}
	//End Battery Level Tracking

	this.loadData();
}

var loadData = function () {
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
};
