var inherits = require('util').inherits;

var WinkAccessory, Accessory, Service, Characteristic, uuid;

/*
 *   Propane Tank Accessory
 */

module.exports = function (oWinkAccessory, oAccessory, oService, oCharacteristic, ouuid) {
	if (oWinkAccessory) {
		WinkAccessory = oWinkAccessory;
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(WinkPropaneTankAccessory, WinkAccessory);
		WinkPropaneTankAccessory.prototype.loadData = loadData;
		WinkPropaneTankAccessory.prototype.deviceGroup = 'propane_tanks';
	}
	return WinkPropaneTankAccessory;
};
module.exports.WinkPropaneTankAccessory = WinkPropaneTankAccessory;

function WinkPropaneTankAccessory(platform, device) {
	WinkAccessory.call(this, platform, device, device.propane_tank_id);

	var that = this;

	//The level of the propane tank is being expressed like a Battery because there isn't any other kind of tank level available in HomeKit.
	if (that.device.last_reading.battery !== undefined) {
		this.addService(Service.BatteryService)
			.getCharacteristic(Characteristic.BatteryLevel)
			.on('get', function (callback) {
				callback(null, Math.floor(that.device.last_reading.remaining * 100));
			});

		this.getService(Service.BatteryService)
			.getCharacteristic(Characteristic.StatusLowBattery)
			.on('get', function (callback) {
				if (that.device.last_reading.remaining < 0.25) //Indicate Low Battery for the battery AND the propane level
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
	this.getService(Service.BatteryService)
		.getCharacteristic(Characteristic.BatteryLevel)
		.getValue();
	this.getService(Service.BatteryService)
		.getCharacteristic(Characteristic.StatusLowBattery)
		.getValue();
};
