# homebridge-wink
[Homebridge](https://github.com/nfarina/homebridge) platform plugin for the Wink hub

This repository contains the Wink plugin for homebridge that was previously bundled in the main `homebridge` repository.

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
			"client_id": "YOUR_WINK_API_CLIENT_ID",
			"client_secret": "YOUR_WINK_API_CLIENT_SECRET",
			"username": "your@email.com",
			"password": "WINK_PASSWORD",
			"hide_groups": ["garage_doors", "thermostats"],
			"hide_ids": [],
			"fan_ids": []
		}
	],

```

Fields:

* "platform": Must always be "Wink" (required)
* "name": Can be anything (required)
* "client_id": Wink API client id, must be obtained from questions@wink.com (required)
* "client_secret": Wink API client id, must be obtained from questions@wink.com (required)
* "username": Wink login username, same as app (required)
* "password": Wink login password, same as app (required)
* "hide_groups": List of Wink groups that will be hidden from Homebridge. Accepted values are:  
  * air_contidioners  
  * binary_switches  
  * garage_doors  
  * light_bulbs  
  * locks  
  * outlets  
  * sensor_pods  
  * smoke_detectors  
  * thermostats
* "hide_ids": List of Wink IDs that will be hidden from Homebridge. These ID can easily be seen in the initialization portion of Homebridge.
* "fan_ids": List of Wink IDs (for binary switches) that will be added as fans to Homebridge.
* "temperature_unit" : Identifies the display unit for thermostats. F or C. Defaults to F
* "unregister_disconnected" : Blocks devices that are currently disconnected from the Wink hub. true/false. Defaults to true.

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
* Light Bulbs - Light Bulbs and dimmable switches.
  * On/Off and Dimming.
  * Bulbs with support allow Hue and Saturation.
* Locks
  * Lock/Unlock and report current status.
  * Report Battery Status.
  * Does not support tampering due to limitation in developer's locks and possibly Wink API.
* Outlets - The controllable outlets on the Quirky Power Strip.
  * On/Off
  * Does not group the outlets by power strip due to limitation in HomeKit Interface.
* Sensor Pods - Spotter, Tripper and other PIR and Door Sensors.
  * PIR reports as Motion Detector
  * Tripper and other Door Sensors report as Doors. Tamper Detection is not available in HomeKit for these.
  * Spotter reports Temperature and Humidity to HomeKit.
  * Spotter Reports Battery Level.
  * Spotter does not report brightness, vibration or loudness to HomeKit. Apple expects values and these are simply reported as yes/no concerning if it changed.
* Smoke Detectors - I believe only Kiddie detectors are supported
  * Reports Battery Level.
  * Reports CO and Smoke Alarms as available by the detector
* Thermostats
  * Should be full functionality.

Not Yet Supported Devices In Consideration

* Cameras

Not Supported Due to HomeKit Limitations

* Eggtrays - No compatible device in HomeKit
* Piggy Banks - No compatible device in HomeKit
* Hubs - Redundant the way homebridge platform plugins are designed
* Remotes - Only displays what it is linked to and doesn't allow as remote
* Buttons - The TAPT and Wink Relay buttons. I expect these are too time-delayed to be useful.
* "Unknown Devices" - Wink doesn't even know what these are.

If you disagree with any of my "limitations in HomeKit", feel free to create and issue for a feature request that reveals what I'm missing.
