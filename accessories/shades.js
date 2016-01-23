var inherits = require('util').inherits;

var WinkAccessory, Accessory, Service, Characteristic, uuid;

/*
 *   Shade Accessory
 */

module.exports = function (oWinkAccessory, oAccessory, oService, oCharacteristic, ouuid) {
	if (oWinkAccessory) {
		WinkAccessory = oWinkAccessory;
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(WinkShadeAccessory, WinkAccessory);
		WinkShadeAccessory.prototype.loadData = loadData;
		WinkShadeAccessory.prototype.deviceGroup = 'shades';
	}
	return WinkShadeAccessory;
};
module.exports.WinkShadeAccessory = WinkShadeAccessory;

function WinkShadeAccessory(platform, device) {
	WinkAccessory.call(this, platform, device, device.shade_id);

	var that = this;

	//Items specific to Shades:
	this
		.addService(Service.WindowCovering)
		.getCharacteristic(Characteristic.TargetPosition)
		.on('get', function (callback) {
			if (that.device.desired_state.position == 0)
				callback(null, 0);
			else if (that.device.desired_state.position == 1)
				callback(null, 100);
		})
		.on('set', function (value, callback) {
			if (value == 100)
				that.updateWinkProperty(callback, "position", 1);
			else if (value == 0)
				that.updateWinkProperty(callback, "position", 0);
		});

	this
		.getService(Service.WindowCovering)
		.getCharacteristic(Characteristic.CurrentPosition)
		.on('get', function (callback) {
			if (that.device.last_reading.position == 0)
				callback(null, 0);
			else if (that.device.last_reading.position == 1)
				callback(null, 100);
		});

	this
		.getService(Service.WindowCovering)
		.setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED)
		
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
	this.getService(Service.WindowCovering)
		.getCharacteristic(Characteristic.CurrentPosition)
		.getValue();
	this.getService(Service.WindowCovering)
		.getCharacteristic(Characteristic.TargetPosition)
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
