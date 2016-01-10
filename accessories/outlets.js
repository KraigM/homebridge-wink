var wink = require('wink-js');
var inherits = require('util').inherits;

var WinkAccessory, Accessory, Service, Characteristic, uuid;

/*
 *   Outlet Accessory (Sub Accessory of the Powerstrip)
 */

module.exports = function (oWinkAccessory, oAccessory, oService, oCharacteristic, ouuid) {
	if (oWinkAccessory) {
		WinkAccessory = oWinkAccessory;
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(WinkOutletAccessory, WinkAccessory);
		WinkOutletAccessory.prototype.loadData = loadData;
		WinkOutletAccessory.prototype.deviceGroup = 'outlets';
	}
	return WinkOutletAccessory;
};
module.exports.WinkOutletAccessory = WinkOutletAccessory;

function WinkOutletAccessory(platform, device) {
	WinkAccessory.call(this, platform, device, device.outlet_id);

	var that = this;

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
		.setCharacteristic(Characteristic.OutletInUse, false);

	this.loadData();
}

var loadData = function () {
	this.getService(Service.Outlet)
		.getCharacteristic(Characteristic.On)
		.getValue();
};
