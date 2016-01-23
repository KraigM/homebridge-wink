var wink = require('wink-js');
var inherits = require('util').inherits;
var events = require('events');
var eventEmitter = new events.EventEmitter();

var WinkAccessory, Accessory, Service, Characteristic, uuid;
var setH, setS, setB;

/*
 *   Light Accessory
 */

module.exports = function (oWinkAccessory, oAccessory, oService, oCharacteristic, ouuid) {
	if (oWinkAccessory) {
		WinkAccessory = oWinkAccessory;
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(WinkLightAccessory, WinkAccessory);
		WinkLightAccessory.prototype.loadData = loadData;
		WinkLightAccessory.prototype.deviceGroup = 'light_bulbs';
	}
	return WinkLightAccessory;
};
module.exports.WinkLightAccessory = WinkLightAccessory;

function WinkLightAccessory(platform, device) {
	WinkAccessory.call(this, platform, device, device.light_bulb_id);

	var that = this;
	
	this.hue = undefined;
	this.saturation = undefined;
	this.brightness = undefined;
	
	//Items specific to Light Bulbs Locks:
	this
		.addService(Service.Lightbulb)
		.getCharacteristic(Characteristic.On)
		.on('get', function (callback) {
			callback(null, that.device.last_reading.powered);
		})
		.on('set', function (value, callback) {
			that.updateWinkProperty(callback, "powered", value);
		});

	if (that.device.desired_state.brightness !== undefined)
		this
			.getService(Service.Lightbulb)
			.getCharacteristic(Characteristic.Brightness)
			.on('get', function (callback) {
				that.brightness=Math.floor(that.device.last_reading.brightness * 100);
				callback(null, that.brightness);
			})
			.on('set', function (value, callback) {
				that.brightness=value / 100;
				that.updateWinkProperty(callback, "brightness", that.brightness);
			});

	if (that.device.desired_state.hue !== undefined)
		this
			.getService(Service.Lightbulb)
			.getCharacteristic(Characteristic.Hue)
			.on('get', function (callback) {
				that.hue = Math.floor(that.device.last_reading.hue*360);
				callback(null, that.hue);
			})
			.on('set', function (value, callback) {
				that.hue = value/360;
				that.updateWinkProperty(callback, ["hue","saturation","brightness","color_model"], 
											[that.hue, that.saturation, that.brightness, 'hsb']);				
			});

	if (that.device.desired_state.saturation !== undefined)
		this
			.getService(Service.Lightbulb)
			.getCharacteristic(Characteristic.Saturation)
			.on('get', function (callback) {
				that.saturation = Math.floor(that.device.last_reading.saturation*100);
				callback(null, that.saturation);
			})
			.on('set', function (value, callback) {
				that.saturation = value/100;
				that.updateWinkProperty(callback, ["hue","saturation","brightness","color_model"], 
											[that.hue, that.saturation, that.brightness, 'hsb']);				
			});

	this.loadData();
}

var loadData = function () {
	this.getService(Service.Lightbulb)
		.getCharacteristic(Characteristic.On)
		.getValue();

	if (this.device.desired_state.brightness !== undefined)
		this.getService(Service.Lightbulb)
			.getCharacteristic(Characteristic.Brightness)
			.getValue();

	if (this.device.desired_state.hue !== undefined)
		this.getService(Service.Lightbulb)
			.getCharacteristic(Characteristic.Hue)
			.getValue();

	if (this.device.desired_state.saturation !== undefined)
		this.getService(Service.Lightbulb)
			.getCharacteristic(Characteristic.Saturation)
			.getValue();
};
