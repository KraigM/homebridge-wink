# homebridge-wink
[Homebridge](https://github.com/nfarina/homebridge) platform plugin for the Wink hub

This is a complete rewrite of homebridge-wink. The UUID for the devices are now passed through from Wink. This will cause the devices in HomeKit to disassociate from their existing rooms or triggers that you defined under the old plugin.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-wink
3. Update your configuration file. See sample config.json snippet below.

# Configuration

Configuration sample:

 ```
"platforms": [
		{
			"platform": "Wink",
			"name": "Wink",
			"username": "your@email.com",
			"password": "WINK_PASSWORD",
			"client_id": "YOUR_WINK_API_CLIENT_ID",
			"client_secret": "YOUR_WINK_API_CLIENT_SECRET",
			"hide_groups": ["garage_doors", "thermostats"],
			"hide_ids": [],
			"fan_ids": []
		}
	],

```

Fields:

* "platform": Must always be "Wink" (required)
* "name": Can be anything (required)
* "client_id": Wink API client id, must be obtained from questions@wink.com. You are required to get your own key, but one is provided for initial use. Warning! Personal API keys will not allow use of 3rd party garage door openers.
* "client_secret": Wink API client id, must be obtained from questions@wink.com. You are required to get your own key, but one is provided for initial use.
* "username": Wink login username, same as app (required)
* "password": Wink login password, same as app (required)
* "hide_groups": List of Wink groups that will be hidden from Homebridge. Accepted values are:  
  * air_contidioner
  * binary_switch  
  * garage_door  
  * light_bulb  
  * lock  
  * outlet  
  * sensor_pod  
  * shade
  * smoke_detector  
  * thermostat
* "hide_ids": List of Wink IDs that will be hidden from Homebridge. These ID can easily be seen as the accessory's serial number in the IOS Home app..
* "fan_ids": List of Wink IDs (for binary switches or lightbulbs) that will be added as fans to Homebridge.
* "temperature_unit" : Identifies the display unit for thermostats. F or C. Defaults to F
* "direct_access" : Attempt to establish access to the Wink hub. true/false. Defaults to true.

# Device Support

Supported Devices:

* Air Conditioners - Identifies the direct-connected Wink Aros.
  * Change between cool, auto and off.
  * Set temperature.
  * Direct fan control is not yet available.
* Binary Switches - Z-Wave non-dimming switches, Wink Outlink, Wink Relay.
  * On/Off Functions.
  * For the Outlink, uses the power usage to determine if on or off.
  * Does not report actual power usage due to limitation in HomeKit Interface.
  * Can be added to Homekit as a fan using fan_ids optional configuration field.
* Garage Doors
  * Open/Close Wink-connected garage doors.
  * Report battery status to HomeKit.
  * Does not identify blocked doors due to limitation in Wink Interface.
  * 3rd Party openers may require use of the Quirky API key to open/close.
* Light Bulbs - Light Bulbs and dimmable switches.
  * On/Off and Dimming.
  * Bulbs with support allow Hue and Saturation.
  * Able to Convert to a Fan.
* Locks
  * Lock/Unlock and report current status.
  * Report Battery Status.
* <s>Outlets - The controllable outlets on the Quirky Power Strip.</s>
  * <s>On/Off</s>
  * <s>Does not group the outlets by power strip due to limitation in HomeKit Interface.</s>
* Propane Tank
 * Reports as a battery.
* Sensor Pods - Spotter, Tripper and other PIR and Door Sensors.
  * PIR reports as Motion Detector
  * Tripper and other Door Sensors report as Doors. Tamper Detection is not available in HomeKit for these.
  * Spotter reports Temperature and Humidity to HomeKit.
  * Spotter Reports Battery Level.
  * Spotter does not report brightness, vibration or loudness to HomeKit. Apple expects values and these are simply reported as yes/no concerning if it changed.
* Shades
  * Working on Implementation
* Smoke Detectors - I believe only Kiddie detectors are supported
  * Reports Battery Level.
  * Reports CO and Smoke Alarms as available by the detector
* Thermostats
  * Should be full functionality.

Not Yet Supported Devices In Consideration

* Cameras

Log Messages and their meaning:
 
 * <b>Wink Init</b> - Occurs when the plugin is initialized by Homebridge.
 * <b>No Wink Config Present</b> - Occurs if Homebridge initializes the plugin without a configuration.
 * <b>Adding: [Device Name]</b> - Occurs when a new device has been detected from Wink and has been loaded.
 * <b>Reclaiming: [Device Name]</b> - Occurs when Homebridge has sent cached information to the plugin.
 * <b>Remove Accessory: [Device Name]</b> - Occurs when a cached or previously loaded device no longer appears in the Wink API feed.
 * <b>API Version 1 Request Detected</b> - If this occurs then the API key only returns version 1 API data. This will cause problems.
 * <b>API Version 2 Request Detected</b> - Occurs when the API key is returning version 2 API data. This is the proper operation.
 * <b>Wink Authentication Successful.</b> - Occurs when the user authenticates to the API.
 * <b>There was a problem authenticating with Wink: [Error Message]</b> - Occurs when the API is unable to authenticate with the cloud.
 * <b>General Error: [Error Information]</b> - An unknown trapped error has occured.
 * <b>No valid reply with call to https://api.wink.com/oauth2/token with the following data: [JSON Data]</b> - This occurs if Wink's API replies with invalid information when the local hub authentication is requested.
 * <b>Unable to Establish Local Control. Error Received: [Error Message]</b> - Occurs when an error was received while fetching an access token for the local hub
 * <b>Hub Link Established: Hub ID [Wink ID]</b> - Occurs when a local access token is retrieved. 
 * <b>Command Sent To Local Hub: [Device Name] [JSON Data]</b> - Shows Data sent to the local hub. Only visible when deepdebug is true.
 * <b>Command Sent To Cloud: [Device Name] [JSON Data]</b> - Shows Data sent to the Cloud. Only visible when deepdebug is true.
 * <b>Odd Pubnub Received: [Message]</b> - Occurs if PubNub send information that doesn't appear to be valid.
 * <b>Impossible Scenario. Device not found: [Device Name]</b> - Occurs if a change is sent from PubNub for a device the API doesn't know about.
 * <b>Error occurred communicating with the Wink API: [Error Message]</b> - This is an error with the query sent to the Wink API.


Not Supported Due to HomeKit Limitations

* Eggtrays - No compatible device in HomeKit
* Piggy Banks - No compatible device in HomeKit
* Hubs - Redundant the way homebridge platform plugins are designed
* Remotes - Only displays what it is linked to and doesn't allow as remote
* Buttons - The TAPT and Wink Relay buttons. I expect these are too time-delayed to be useful.
* "Unknown Devices" - Wink doesn't even know what these are.

If you disagree with any of my "limitations in HomeKit", feel free to create and issue for a feature request that reveals what I'm missing.

