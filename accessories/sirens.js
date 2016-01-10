var wink = require('wink-js');
var inherits = require('util').inherits;

var WinkAccessory, Service, Characteristic, Accessory, uuid;

/*
 *   Binary Switch Accessory
 */

module.exports = function (oWinkAccessory, oAccessory, oService, oCharacteristic, ouuid) {
	if (oWinkAccessory) {
		WinkAccessory = oWinkAccessory;
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(WinkSirenAccessory, WinkAccessory);
		WinkSirenAccessory.prototype.loadData = loadData;
		WinkSirenAccessory.prototype.deviceGroup = 'sirens';
	}
	return WinkSirenAccessory;
};
module.exports.WinkSirenAccessory = WinkSirenAccessory;

function WinkSirenAccessory(platform, device) {
	WinkAccessory.call(this, platform, device, device.siren_id);

	var that = this;

	//Strobe as a light
	this
		.addService(Service.Lightbulb)
		.setCharacteristic(Characteristic.Name, "Strobe");

	this
		.getService(Service.Lightbulb)
		.getCharacteristic(Characteristic.On)
		.on('get', function (callback) {
			if (!that.device.last_reading.powered)
				callback(null, false);
			else if (that.device.last_reading.mode == 'siren_only')
				callback(null, false);
			else
				callback(null, true);
		})

		.on('set', function (value, callback) {
			if (value) {
				if (!that.device.last_reading.powered)
					that.updateWinkProperty(callback, ["powered", "mode"], [true, "strobe_only"]);
				else if (that.device.last_reading.mode == 'siren_only')
					that.updateWinkProperty(callback, ["powered", "mode"], [true, "siren_and_strobe"]);
				else
					that.updateWinkProperty(callback, ["powered", "mode"], [true, "strobe_only"]);
			} else {
				if (that.device.last_reading.powered)
					that.updateWinkProperty(callback, "powered", false);
				else if (that.device.last_reading.mode == "siren_and_strobe")
					that.updateWinkProperty(callback, "mode", "siren_only");
				else
					that.updateWinkProperty(callback, "powered", false);
			}
		});

	//Siren as a switch
	this
		.addService(Service.Switch)
		.setCharacteristic(Characteristic.Name, "Siren");

	this
		.getService(Service.Switch)
		.getCharacteristic(Characteristic.On)
		.on('get', function (callback) {
			if (!that.device.last_reading.powered)
				callback(null, false);
			else if (that.device.last_reading.mode == 'strobe_only')
				callback(null, false);
			else
				callback(null, true);
		})

		.on('set', function (value, callback) {
			if (value) {
				if (!that.device.last_reading.powered)
					that.updateWinkProperty(callback, ["powered", "mode"], [true, "siren_only"]);
				else if (that.device.last_reading.mode == 'siren_only')
					that.updateWinkProperty(callback, ["powered", "mode"], [true, "siren_and_strobe"]);
				else
					that.updateWinkProperty(callback, ["powered", "mode"], [true, "siren_only"]);
			} else {
				if (that.device.last_reading.powered)
					that.updateWinkProperty(callback, "powered", false);
				else if (that.device.last_reading.mode == "siren_and_strobe")
					that.updateWinkProperty(callback, "mode", "strobe_only");
				else
					that.updateWinkProperty(callback, "powered", false);
			}
		});

	this.loadData();
}

var loadData = function () {
	if (this.device.last_reading.consumption == undefined) {
		this.getService(Service.Lightbulb)
			.getCharacteristic(Characteristic.On)
			.getValue();
	} else {
		this.getService(Service.Outlet)
			.getCharacteristic(Characteristic.On)
			.getValue();
		this.getService(Service.Outlet)
			.getCharacteristic(Characteristic.OutletInUse)
			.getValue();

	}
};