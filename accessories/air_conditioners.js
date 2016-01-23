var wink = require('wink-js');
var inherits = require('util').inherits;

var WinkAccessory, Accessory, Service, Characteristic, uuid;

/*
 *   Air Conditioner Accessory
 */

module.exports = function (oWinkAccessory, oAccessory, oService, oCharacteristic, ouuid) {
	if (oWinkAccessory) {
		WinkAccessory = oWinkAccessory;
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(WinkAirConditionerAccessory, WinkAccessory);
		WinkAirConditionerAccessory.prototype.loadData = loadData;
		WinkAirConditionerAccessory.prototype.deviceGroup = 'air_conditioners';
	}
	return WinkAirConditionerAccessory;
};
module.exports.WinkAirConditionerAccessory = WinkAirConditionerAccessory;

function WinkAirConditionerAccessory(platform, device) {
	WinkAccessory.call(this, platform, device, device.air_conditioner_id);

	var that = this;

	//Items specific to Thermostats:

	//Handle the Current State
	this
		.addService(Service.Thermostat)
		.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
		.on('get', function (callback) {
			if (that.device.last_reading.powered) { //I need to verify this changes when the thermostat clicks on.
				switch (that.device.last_reading.mode) {
					case "cool_only":
						callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
						break;
					case "auto_eco": //HomeKit only accepts HEAT/COOL, so we have to determine if we are Heating or Cooling.
						if (that.device.last_reading.temperature > that.device.last_reading.max_set_point)
							callback(null, Characteristic.CurrentHeatingCoolingState.COOL);
						else
							callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
						break;
					default: //If it is fan_only or anything else then we'll report the thermostat as off.
						callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
						break;
				}
			} else //For now, powered being false means it is off
				callback(null, Characteristic.CurrentHeatingCoolingState.OFF);
		});

	this
		.getService(Service.Thermostat)
		.getCharacteristic(Characteristic.TargetHeatingCoolingState)
		.on('get', function (callback) {
			if (that.device.desired_state.powered) { //I need to verify this changes when the thermostat clicks on.
				switch (that.device.desired_state.mode) {
					case "cool_only":
						callback(null, Characteristic.TargetHeatingCoolingState.COOL);
						break;
					case "auto_eco":
						callback(null, Characteristic.TargetHeatingCoolingState.AUTO);
						break;
					default: //The above list should be inclusive, but we need to return something if they change stuff.
						callback(null, Characteristic.TargetHeatingCoolingState.OFF);
						break;
				}
			} else //For now, powered being false means it is off
				callback(null, Characteristic.TargetHeatingCoolingState.OFF);
		})
		.on('set', function (value, callback) {
			switch (value) {
				case Characteristic.TargetHeatingCoolingState.COOL:
					that.updateWinkProperty(callback, ["powered", "mode"], [true, "cool_only"]);
					break;
				case Characteristic.TargetHeatingCoolingState.AUTO:
					that.updateWinkProperty(callback, ["powered", "mode"], [true, "auto_eco"]);
					break;
				case Characteristic.TargetHeatingCoolingState.OFF:
					that.updateWinkProperty(callback, "powered", false);
					break;
			}
		});

	this
		.getService(Service.Thermostat)
		.getCharacteristic(Characteristic.CurrentTemperature)
		.on('get', function (callback) {
			callback(null, that.device.last_reading.temperature);
		});

	this
		.getService(Service.Thermostat)
		.getCharacteristic(Characteristic.TargetTemperature)
		.on('get', function (callback) {
			callback(null, that.device.desired_state.max_set_point);
		})
		.on('set', function (value, callback) {
			that.updateWinkProperty(callback, "max_set_point", value);
		});

	this
		.getService(Service.Thermostat)
		.getCharacteristic(Characteristic.TemperatureDisplayUnits)
		.on('get', function (callback) {
			if (platform.temperature_unit == "C")
				callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
			else
				callback(null, Characteristic.TemperatureDisplayUnits.FAHRENHEIT);
		});

	this
		.getService(Service.Thermostat)
		.addCharacteristic(Characteristic.RotationSpeed)
		.on('get', function (callback) {
			callback(null, Math.floor(that.device.last_reading.fan_speed * 100));
		})
		.on('set', function (value, callback) {
			that.updateWinkProperty(callback, "fan_speed", value / 100);
		});

	this.loadData();
}

var loadData = function () {
	this
		.getService(Service.Thermostat)
		.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
		.getValue();

	this
		.getService(Service.Thermostat)
		.getCharacteristic(Characteristic.TargetHeatingCoolingState)
		.getValue();

	this
		.getService(Service.Thermostat)
		.getCharacteristic(Characteristic.CurrentTemperature)
		.getValue();

	this
		.getService(Service.Thermostat)
		.getCharacteristic(Characteristic.TargetTemperature)
		.getValue();

	this
		.getService(Service.Thermostat)
		.getCharacteristic(Characteristic.TemperatureDisplayUnits)
		.getValue();

	this
		.getService(Service.Thermostat)
		.getCharacteristic(Characteristic.RotationSpeed)
		.getValue();

};
