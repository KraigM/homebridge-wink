var https = require('https');
var url = require('url');
var PubNub = require('pubnub')

var winkapiv2 = function () {
    //Items considered Public
    this.seconds_full_refresh = 60;// * 60; //60 minutes * 60 seconds 
    this.debug = false;
    this.platform = null;
    this._cachedDevices = {};
    this._cachedDevices_awaitingsecondcall = {}; //These are devices that are waiting on the second call which should contain the desired_state object.
    this._pubNubSubscriptions = {};
    this._authorizationKey = '';
    this._refreshKey = '';
    this._clientid = '';
    this._clientsecret = '';
    this._httpsQueue = [];
    this._hubTokens = {};
    this._hubObjects = {};
    this._directAccessAllowed = false;
    this._directCommandNum = 1000000;
}
//Events
winkapiv2.prototype.event_DeviceAdded = function (device) { console.log("Wink Device Added: " + device.name + " " + device.uuid); };
winkapiv2.prototype.event_DeviceRemoved = function (device) { console.log("Wink Device Removed: " + device.name); };
winkapiv2.prototype.event_DeviceChanged = function (deviceUUID, changeGroup, changedField, oldValue, newValue, fullDeviceData) { console.log("Device Change Detected for " + fullDeviceData.name + "-" + changeGroup + " value of " + changedField + " from " + oldValue + " to " + newValue); };
winkapiv2.prototype.event_ErrorOccurred = function (err) { console.log("General Error: " + err); };

winkapiv2.prototype.init = function (winkConfig, callback, errcallback) {
    this.platform = winkConfig.platform;
    if (!winkConfig.client_id)
        winkConfig.client_id = "quirky_wink_android_app";
    this._clientid = winkConfig.client_id
    if (!winkConfig.client_secret)
        winkConfig.client_secret = "e749124ad386a5a35c0ab554a4f2c045";
    this._clientsecret = winkConfig.client_secret

    if (winkConfig.platform.config.direct_access != null)
        this._directAccessAllowed = winkConfig.platform.config.direct_access;
    var loginData = {
        client_id: winkConfig.client_id,
        client_secret: winkConfig.client_secret,
        username: winkConfig.username,
        password: winkConfig.password,
        grant_type: "password"
    };
    this._POST("https://api.wink.com/oauth2/token", {}, loginData, function (data) {
        //This is the callback for the authentication mechanism.
        if (data) {
        if (data.errors.length != 0) {
            if (callback) callback(false, data);
            return;

        }
        this._authorizationKey = data.access_token;
        this._refreshKey = data.refresh_token;
        this.deviceRefreshFull();
        setInterval(function () { this.deviceRefreshFull(); }.bind(this), this.seconds_full_refresh * 1000);
        } else {
            console.log("Unable to authenticate to Wink. No error returned.")
        }
        if (callback) callback(true, data);
    }.bind(this));
};
winkapiv2.prototype.getHubTokens = function () {
    if (!this._directAccessAllowed) return;
    //Eliminate Invalid Hub Token Requests
    for (hub_id in this._hubTokens)
        if (!this._hubObjects[hub_id]) delete this._hubTokens[hub_id];

    //Look through the remaining hub tokens
    for (hub_id in this._hubTokens) {
        //If this hub token is marked as needed and the object is found
        if (this._hubTokens[hub_id] === 'needed') {
            //If we have an IP
            if (this._hubObjects[hub_id].last_reading.ip_address) {
                //Generate and send the token request
                var loginData = {
                    local_control_id: this._hubObjects[hub_id].last_reading.local_control_id,
                    scope: "local_control",
                    grant_type: "refresh_token",
                    refresh_token: this._refreshKey,
                    client_id: this._clientid,
                    client_secret: this._clientsecret
                };
                this._POST("https://api.wink.com/oauth2/token", {}, loginData, function (data) {
                    //This is the callback for the authentication mechanism.
                    if (!data) { //If there is no data then we have a serious error
                        this.platform.log("No valid reply with call to https://api.wink.com/oauth2/token with the following data: " + JSON.stringify(loginData));
                        this._hubTokens[hub_id] = 'unavailable';
                    } else if (data.errors.length != 0) { //If an actual error is reported then just assume local control is unavailable.
                        this._hubTokens[hub_id] = 'unavailable'
                        this.platform.log("Unable to Establish Local Control. Error Received: " + JSON.stringify(data.errors));
                    } else {
                        //Store the key and the potentially new refresh token.
                        this._hubTokens[hub_id] = data.access_token;
                        this.platform.log("Hub Link Established: Hub ID " + hub_id)
                        this._refreshKey = data.refresh_token;
                    }
                    //Call ourselves to loop through everything.
                    this.getHubTokens();
                }.bind(this));
            } else {
                //If there is no IP address then just flag the key as unavailable
                this._hubTokens[hub_id] = 'unavailable';
            }
        }
    }
}

winkapiv2.prototype.deviceRefreshFull = function (callback) {
    //This refetches all devices from Wink and updates the device cache.
    this._GET("https://api.wink.com/users/me/wink_devices", { "Authorization": "Bearer " + this._authorizationKey }, {},
        function (data) {
            if (data) this._deviceReceiptProcessor(data, 'all', this);
            if (callback) callback(data);
        }.bind(this));
};
winkapiv2.prototype.deviceSetDesiredValue = function (uuid, desired_parameter, desired_value, callback) {
    var desired_state = {};
    desired_state[desired_parameter] = desired_value;
    this.deviceSetDesired(uuid, desired_state);
};
winkapiv2.prototype.deviceSetDesired = function (uuid, desired_keyvalues, callback) {
    var that = this;
    var device = this._cachedDevices[uuid];
    var device_path = device.object_type;
    if (device_path.endsWith("h")) device_path += "e";
    device_path += "s";
    this._directCommandNum += 5;
    var data = {
        "desired_state": desired_keyvalues,
        "nonce": this._directCommandNum++//Add a nonce for tracking the request
    };


    if ((device.local_id) && (this._hubTokens[device.hub_id]) && (this._hubTokens[device.hub_id] !== 'needed') && (this._hubTokens[device.hub_id] !== 'unavailable')) {
        //Send the command locally
        this._PUT("https://" + this._hubObjects[device.hub_id].last_reading.ip_address + ":8888/" + device_path + "/" + device.local_id, { "Authorization": "Bearer " + this._hubTokens[device.hub_id] }, data, function (data) {
            if (data) {
                if (data.data) {
                    //this._deviceReceiptProcessor({data:[data.data]}, 'partial', this);
                    this.platform.log("Command Sent To Local Hub: " + device.name + "." + JSON.stringify(desired_keyvalues));
                }
            }
            if (callback) {
                callback();
                callback = null;
            }

        }.bind(this));
        //Since we sent this locally, we need to make sure the API knows that.
        data.locally_activated_objects = [{
            "object_type": device.object_type,
            "object_id": device.object_id
        }];
    }
    //We send commands to the cloud if the hub link hasn't been established
    this._PUT("https://api.wink.com/" + device_path + "/" + device.object_id, { "Authorization": "Bearer " + this._authorizationKey }, data, function (data) {
        if (data) {
            if (data.data) {
                this._deviceReceiptProcessor({ data: [data.data] }, 'partial', this);
                this.platform.log("Command Sent To Cloud: " + device.name + "." + JSON.stringify(desired_keyvalues));
            }
        }
        if (callback) {
            callback();
            callback = null;
        }
    }.bind(this));

};
//Items considered Private
//Wink API Management
winkapiv2.prototype._deviceReceiptProcessor = function (devices, fetchType) {
    var foundIDList = [];

    if ((!devices) && (fetchType === 'all')) {
        //It appears we didn't get any devices. Wait 1 second and try again.
        setInterval(function () { this.deviceRefreshFull(); }.bind(this), 1000);
        return;
    }
    // if ((fetchType === 'all') && (!devices.data[0].object_type))
    //     this.platform.log("API Version 1 Request Detected");
    // if ((fetchType === 'all') && (devices.data[0].object_type))
    //     this.platform.log("API Version 2 Request Detected");

    for (var i = 0; i < devices.data.length; i++) {
        var device = devices.data[i];

        //If we haven't already obtained an ID or specified it as needed then specify it as needed.
        if ((device.local_id) && (device.hub_id)) {
            if (!this._hubTokens[device.hub_id]) {
                this._hubTokens[device.hub_id] = 'needed';
            }
        }
        if ((device.manufacturer_device_model) && (device.manufacturer_device_model.startsWith('wink_hub'))) {
            this._hubObjects[device.object_id] = device;
        }

        foundIDList[device.uuid] = 1;
        if (this._cachedDevices[device.uuid] !== undefined) {
            //The cached device has been found so we'll process and see what has changed.
            this._deviceChangeProcessor(device)
        } else {
            //My API key currently isn't returning the proper desired_state object for API call from Node (But is from hurl.it)
            //If we encounter an empty desired_state object on a fetchType of "all" then we need to call the deviceRefreshSpecific and use that data.
            //This only needs to happen when the device is first found because we can assume our desired_state is up to date enough on all other requests.
            //This also doesn't apply to object_type that don't have a desired_state to begin with.
            if (device.desired_state)
                if (Object.keys(device.desired_state).length == 0)
                    this.fixup_Winkv2_response(device);


            //Set the new Device up in the cache and send the Event.
            this._cachedDevices[device.uuid] = device;
            if (fetchType !== 'preload') {
                this.event_DeviceAdded(device);
            }
        }
        //Register PubNub for device changes
        var pubnub_key = device.subscription.pubnub.subscribe_key;
        var pubnub_channel = device.subscription.pubnub.channel;
        if (this._pubNubSubscriptions[pubnub_key] === undefined) {
            this._pubNubSubscriptions[pubnub_key] = new PubNub({ subscribeKey: pubnub_key });
            this._pubNubSubscriptions[pubnub_key].addListener({
                message: function (message, env, channel) {
                    var newDeviceData = JSON.parse(message.message);
                    if (newDeviceData.uuid)
                        this._deviceChangeProcessor(newDeviceData);
                    else
                        this.platform.log("Odd Pubnub Received: " + message.message);
                }.bind(this)
            });

        }
        this._pubNubSubscriptions[pubnub_key].subscribe({ channels: [pubnub_channel] });
    }

    //If we received all devices, we need to look for any that are missing.
    if (fetchType == 'all') {
        //Fetch the hub tokens for direct access
        this.getHubTokens();
        //Loop through all of the cachedDevices
        for (key in this._cachedDevices) {
            //Check to see if this Device ID was loaded from the list.
            if (foundIDList[key] === undefined) {
                //Call the Removal Event
                this.event_DeviceRemoved(this._cachedDevices[key]);
                //Remove the Cached Device
                this._cachedDevices[key] = undefined;
            }
        }
    }
};
winkapiv2.prototype.fixup_Winkv2_response = function (newDeviceData) {
    //Some API calls (v2 in Node) return the desired state in the last_reading as "desired_"
    //It doesn't always put the desired value there, so I'm just grabbing the last_reading 
    for (key in newDeviceData.last_reading) {
        if (key.startsWith('desired_')) {
            myKey = key.substring(8, key.length);
            if (myKey.endsWith('updated_at') || myKey.endsWith('changed_at'))
                myKey = myKey.substring(0, myKey.length - 11);
            newDeviceData.desired_state[myKey] = newDeviceData.last_reading[myKey]
        }
    }
};
winkapiv2.prototype._deviceChangeProcessor = function (newDeviceData) {
    if (!newDeviceData) return;
    this.fixup_Winkv2_response(newDeviceData);
    if (!this._cachedDevices[newDeviceData.uuid])
        this.platform.log("Impossible Scenario. Device not found: " + newDeviceData.name);
    var oldDevice = JSON.parse(JSON.stringify(this._cachedDevices[newDeviceData.uuid]));
    for (key in newDeviceData.last_reading) {
        if (key.startsWith("desired_")) {
            var newkey = key.substring(8, key.length);
            newDeviceData.desired_state[newkey] = newDeviceData.last_reading[key];
            newDeviceData.last_reading[key] = undefined;
        }
    }

    for (key in newDeviceData.desired_state)
        //If there was a change
        if (oldDevice.desired_state[key] !== newDeviceData.desired_state[key]) {
            //Update the value in the cached device
            this._cachedDevices[newDeviceData.uuid].desired_state[key] = newDeviceData.desired_state[key];
            //Call the DeviceChanged event
            if (!key.endsWith('_at'))
                this.event_DeviceChanged(oldDevice.uuid, "desired_state", key, oldDevice.desired_state[key], newDeviceData.desired_state[key], this._cachedDevices[newDeviceData.uuid]);
        }

    for (key in newDeviceData.last_reading)
        //If there was a change
        if (oldDevice.last_reading[key] !== newDeviceData.last_reading[key]) {
            //Update the value in the cached device
            this._cachedDevices[newDeviceData.uuid].last_reading[key] = newDeviceData.last_reading[key];
            //Call the DeviceChanged event
            if (!(key.endsWith('_at') || key.startsWith('desired_'))) {
                this.event_DeviceChanged(oldDevice.uuid, "last_reading", key, oldDevice.last_reading[key], newDeviceData.last_reading[key], this._cachedDevices[newDeviceData.uuid]);
            }

        }
};
//Web Access Items
winkapiv2.prototype._https_queueRequest = function (inUrl, headers, data, inMethod, callback) {
    var myCall = { url: inUrl, head: headers, d: data, meth: inMethod, call: callback };
    this._httpsQueue.push(myCall)
};
winkapiv2.prototype._https_processQueue = function (that) {
    //Only start a new call if we're not doing an existing call.
    if (this._httpsQueue.length !== 0) {
        var myCall = this._httpsQueue.pop();
        this._https(myCall.url, myCall.head, myCall.d, myCall.meth, myCall.call);
    }
};
winkapiv2.prototype._https = function (inUrl, headers, data, inMethod, callback) {
    var apiURL = url.parse(inUrl);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    var options = {
        hostname: apiURL.hostname,
        port: apiURL.port || "443",
        path: apiURL.path,
        method: inMethod,
        headers: headers || {}
    };
    var outData = null;
    if (inMethod != 'GET') {
        options.headers['Content-Type'] = "application/json";
        //options.headers['User-Agent'] = "APICaller";
        if (data) {
            outData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(outData);
        }
    }

    options.headers['Accept'] = '*/*';
    options.headers['User-Agent'] = 'Manufacturer/Apple-iPhone8_1 iOS/10.2 WinkiOS/5.5.0.20-production-release (Scale/2.00)';
    var str = '';
    var req = https.request(options, function (response) {

        response.on('data', function (chunk) {
            str += chunk;
        });

        response.on('end', function () {
            if (this.debug) this.platform.log("response in http:", str);
            try {
                str = JSON.parse(str);
            } catch (e) {
                if (this.debug) {
                    this.debug.log("raw message", str);
                }
                str = undefined;
            }

            if (callback) {
                callback(str);
                callback = undefined;
            };
        }.bind(this));
    });

    if (outData) {
        req.write(outData);
    }

    req.end();

    req.on('error', function (e) {
        this.platform.log("Error occurred communicating with " + apiURL.hostname + ": ", e.message);
        if (callback) {
            callback();
            callback = undefined;
        };
    }.bind(this));
};
winkapiv2.prototype._POST = function (url, headers, data, callback) {
    this._https(url, headers, data, "POST", callback);
};
winkapiv2.prototype._PUT = function (url, headers, data, callback) {
    data.method = "PUT";
    this._https(url, headers, data, "PUT", callback);
};
winkapiv2.prototype._GET = function (url, headers, data, callback) {
    this._https(url, headers, data, "GET", callback);
};
winkapiv2.prototype._DELETE = function (url, headers, data, callback) {
    this._https(url, headers, data, "DELETE", callback);
};

module.exports = winkapiv2;