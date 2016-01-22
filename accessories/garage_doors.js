var inherits = require('util').inherits;

var WinkAccessory, Accessory, Service, Characteristic, uuid;

/*
 *   Garage Door Accessory
 */

module.exports = function (oWinkAccessory, oAccessory, oService, oCharacteristic, ouuid) {
	if (oWinkAccessory) {
		WinkAccessory = oWinkAccessory;
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(WinkGarageDoorAccessory, WinkAccessory);
		WinkGarageDoorAccessory.prototype.loadData = loadData;
		WinkGarageDoorAccessory.prototype.deviceGroup = 'garage_doors';
	}
	return WinkGarageDoorAccessory;
};
module.exports.WinkGarageDoorAccessory = WinkGarageDoorAccessory;

function WinkGarageDoorAccessory(platform, device) {
	WinkAccessory.call(this, platform, device, device.garage_door_id);

	var that = this;

	//Items specific to Garage Doors:
	this
		.addService(Service.GarageDoorOpener)
		.getCharacteristic(Characteristic.TargetDoorState)
		.on('get', function (callback) {
			if (that.device.desired_state.position == 0)
				callback(null, Characteristic.TargetDoorState.CLOSED);
			else if (that.device.desired_state.position == 1)
				callback(null, Characteristic.TargetDoorState.OPEN);
		})
		.on('set', function (value, callback) {
			if (value == Characteristic.TargetDoorState.OPEN)
				that.updateWinkProperty(callback, "position", 1);
			else if (value == Characteristic.TargetDoorState.CLOSED)
				that.updateWinkProperty(callback, "position", 0);
		});

	this
		.getService(Service.GarageDoorOpener)
		.getCharacteristic(Characteristic.CurrentDoorState)
		.on('get', function (callback) {
			if (that.device.last_reading.position == 0)
				callback(null, Characteristic.CurrentDoorState.CLOSED);
			else if (that.device.last_reading.position == 1)
				callback(null, Characteristic.CurrentDoorState.OPEN);
		});

	this
		.getService(Service.GarageDoorOpener)
		.setCharacteristic(Characteristic.ObstructionDetected, false);

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
	this.getService(Service.GarageDoorOpener)
		.getCharacteristic(Characteristic.CurrentDoorState)
		.getValue();
	this.getService(Service.GarageDoorOpener)
		.getCharacteristic(Characteristic.TargetDoorState)
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