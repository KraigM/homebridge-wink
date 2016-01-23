var wink = require('wink-js');
var inherits = require('util').inherits;
var Service, Characteristic, Accessory, uuid;

module.exports = function (oAccessory, oService, oCharacteristic, ouuid) {
	if (oAccessory) {
		Accessory = oAccessory;
		Service = oService;
		Characteristic = oCharacteristic;
		uuid = ouuid;

		inherits(WinkAccessory, Accessory);
		WinkAccessory.prototype.updateWinkProperty = updateWinkProperty;
		WinkAccessory.prototype.refreshUntil = refreshUntil;
		WinkAccessory.prototype.getServices = getServices;
		WinkAccessory.prototype.handleResponse = handleResponse;
	}
	return WinkAccessory;
};
module.exports.WinkAccessory = WinkAccessory;

function WinkAccessory(platform, device, deviceId) {
	this.platform = platform;
	this.device = device;
	this.deviceId = deviceId;
	this.name = device.name;
	this.log = platform.log;

	var idKey = 'hbdev:wink:' + this.deviceGroup + ':' + this.deviceId;
	var id = uuid.generate(idKey);
	Accessory.call(this, this.name, id);
	this.uuid_base = id;

	this.control = wink.device_group(this.deviceGroup).device_id(this.deviceId);
	var that = this;

	// set some basic properties (these values are arbitrary and setting them is optional)
	this
		.getService(Service.AccessoryInformation)
		.setCharacteristic(Characteristic.Manufacturer, this.device.device_manufacturer)
		.setCharacteristic(Characteristic.Model, this.device.model_name);
		
}

var refreshUntil = function (maxTimes, predicate, callback, interval, incrementInterval, sProperty) {
	var that = this;
	if (!interval) {
		interval = 500;
	}
	if (!incrementInterval) {
		incrementInterval = 500;
	}
	setTimeout(function () {
		that.control.get(function (device) {
			that.device = device.data; //Add an error trap
			if (predicate == undefined || predicate(sProperty) == true) {
				if (callback) callback(true, that.device, sProperty);
			} else if (maxTimes > 0) {
				maxTimes = maxTimes - 1;
				interval += incrementInterval;
				that.refreshUntil(maxTimes, predicate, callback, interval, incrementInterval, sProperty);
			} else {
				if (callback) callback(false, that.device, sProperty);
			}
		});
	}, interval);
};

var updateWinkProperty = function (callback, sProperty, sTarget, bIgnoreFeedback) {
	this.log("Changing target property '" + sProperty + "' of the " + this.device.device_group + " called " + this.device.name + " to " + sTarget);
	if (this.device.desired_state == undefined) {
		callback(Error("Unsupported"));
		return;
	}

	if (sProperty instanceof Array) {
		for (var i = 0; i < sProperty.length; i++) {
			if (this.device.desired_state[sProperty[i]] == undefined) {
				callback(Error("Unsupported"));
				return;
			}
		}
	} else if (this.device.desired_state[sProperty] == undefined) {
		callback(Error("Unsupported"));
		return;
	}

	if (!this.device.last_reading.connection) {
		callback(Error("Unconnected"));
		return;
	}

	var data = {
		"desired_state": {}
	};

	if (sProperty instanceof Array) {
		for (var i = 0; i < sProperty.length; i++) {
			data.desired_state[sProperty[i]] = sTarget[i];
		}
	} else {
		data.desired_state[sProperty] = sTarget;
	}

	var that = this;
	var update = function (retry) {
		that.control.update(data,
			function (res) {
				var err = that.handleResponse(res);
				if (callback) {
					callback(err);
					callback = null;
				}
				if (!err) {
					that.refreshUntil(8,
						function (sProperty) {
								if (sProperty instanceof Array) {
									for (var i = 0; i < sProperty.length; i++) {
										return ((that.device.last_reading[sProperty[i]] == that.device.desired_state[sProperty[i]]) || bIgnoreFeedback);
									}
								} else {
									return ((that.device.last_reading[sProperty] == that.device.desired_state[sProperty]) || bIgnoreFeedback);
								}
							
						},
						function (completed, device, sProperty) {
							if (completed) {
								that.log("Successfully changed target property '" + sProperty + "' of the " + that.device.device_group + " called " + that.device.name + " to " + sTarget);
								err = null;
							} else if (retry) {
								that.log("Unable to determine if update was successful. Retrying update.");
								retry();
							} else {
								that.log("Unable to determine if update was successful.");
								err = "Unknown Issue Ecountered";
							}
						}, 800, 150, sProperty);
				}
			});
	};
	update(update);
};

var getServices = function () {
	return this.services;
};

var handleResponse = function (res) {
	if (!res) {
		return Error("No response from Wink");
	} else if (res.errors && res.errors.length > 0) {
		return res.errors[0];
	} else if (res.data) {
		this.device = res.data;
		if (this.loadData) this.loadData();
	}
};
