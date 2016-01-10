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

		inherits(WinkSwitchAccessory, WinkAccessory);
		WinkSwitchAccessory.prototype.loadData = loadData;
		WinkSwitchAccessory.prototype.deviceGroup = 'binary_switches';
	}
	return WinkSwitchAccessory;
};
module.exports.WinkSwitchAccessory = WinkSwitchAccessory;

function WinkSwitchAccessory(platform, device) {
	WinkAccessory.call(this, platform, device, device.binary_switch_id);

	var that = this;

	if (that.device.last_reading.consumption == undefined) {
		//If consumption is undefined then we will treat this like a lightbulb
		this
			.addService(Service.Lightbulb)
			.getCharacteristic(Characteristic.On)
			.on('get', function (callback) {
				callback(null, that.device.last_reading.powered);
			})
			.on('set', function (value, callback) {
				that.updateWinkProperty(callback, "powered", value);
			});
	} else {
		//If consumption is defined then we will treat this as an Outlet.
		//This covers the Outlink Wall Plug.
		this
			.addService(Service.Outlet)
			.getCharacteristic(Characteristic.On)
			.on('get', function (callback) {
				callback(null, that.device.last_reading.powered);
			})
			.on('set', function (value, callback) {
				that.updateWinkProperty(callback, "powered", value);
			});
		this
			.getService(Service.Outlet)
			.getCharacteristic(Characteristic.OutletInUse)
			.on('get', function (callback) {
				callback(null, (that.device.last_reading.consumption > 0.1));
			});
	}

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