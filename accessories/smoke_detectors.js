var inherits = require('util').inherits;

var WinkAccessory, Accessory, Service, Characteristic, uuid;

/*
 *   Smoke Detector Accessory
 */

module.exports = function (oWinkAccessory, oAccessory, oService, oCharacteristic, ouuid) {
	if (oWinkAccessory) {
		WinkAccessory = oWinkAccessory;
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(WinkSmokeDetectorAccessory, WinkAccessory);
		WinkSmokeDetectorAccessory.prototype.loadData = loadData;
		WinkSmokeDetectorAccessory.prototype.deviceGroup = 'smoke_detectors';
	}
	return WinkSmokeDetectorAccessory;
};
module.exports.WinkSmokeDetectorAccessory = WinkSmokeDetectorAccessory;

function WinkSmokeDetectorAccessory(platform, device) {
	WinkAccessory.call(this, platform, device, device.smoke_detector_id);

	var that = this;

	//Items specific to Smoke Detectors:
	if (this.device.last_reading.co_detected !== undefined) {
		this.addService(Service.CarbonMonoxideSensor)
			.getCharacteristic(Characteristic.CarbonMonoxideDetected)
			.on('get', function (callback) {
				if (that.device.last_reading.co_detected)
					callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL);
				else
					callback(null, Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL);
			});
		if (this.device.last_reading.battery !== undefined)
			this.getService(Service.CarbonMonoxideSensor)
				.getCharacteristic(Characteristic.StatusLowBattery)
				.on('get', function (callback) {
					if (that.device.last_reading.battery < 0.25)
						callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
					else
						callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
				});
	}

	if (this.device.last_reading.smoke_detected !== undefined) {
		this.addService(Service.SmokeSensor)
			.getCharacteristic(Characteristic.SmokeDetected)
			.on('get', function (callback) {
				if (that.device.last_reading.smoke_detected)
					callback(null, Characteristic.SmokeDetected.SMOKE_DETECTED);
				else
					callback(null, Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
			});
		if (this.device.last_reading.battery !== undefined)
			this.getService(Service.SmokeSensor)
				.getCharacteristic(Characteristic.StatusLowBattery)
				.on('get', function (callback) {
					if (that.device.last_reading.battery < 0.25)
						callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW);
					else
						callback(null, Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
				});
	}

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
	if (this.device.last_reading.co_detected !== undefined) {
		this.getService(Service.CarbonMonoxideSensor)
			.getCharacteristic(Characteristic.CarbonMonoxideDetected)
			.getValue();

		if (this.device.last_reading.battery !== undefined) {
			this.getService(Service.CarbonMonoxideSensor)
				.getCharacteristic(Characteristic.StatusLowBattery)
				.getValue();
		}
	}

	if (this.device.last_reading.smoke_detected !== undefined) {
		this.getService(Service.SmokeSensor)
			.getCharacteristic(Characteristic.SmokeDetected)
			.getValue();

		if (this.device.last_reading.battery !== undefined) {
			this.getService(Service.SmokeSensor)
				.getCharacteristic(Characteristic.StatusLowBattery)
				.getValue();
		}
	}

	if (this.device.last_reading.battery !== undefined) {
		this.getService(Service.BatteryService)
			.getCharacteristic(Characteristic.BatteryLevel)
			.getValue();
		this.getService(Service.BatteryService)
			.getCharacteristic(Characteristic.StatusLowBattery)
			.getValue();
	}
};
