# Device support

## Air Conditioners

_Wink Aros_

* Change between cool, auto and off.
* Set temperature.

Limitations:

* Direct fan control is not yet available.

## Binary Switches

_Z-Wave non-dimming switches, Wink Outlink, Wink Relay_

* On/Off Functions.
* For the Outlink, uses the power usage to determine if on or off.
* Can be added to HomeKit as a fan:
  * using `fan_ids` optional configuration field, or
  * automatically if device's name contains the word "fan" (such as "Living Room Fan")

Limitations:

* Does not report actual power usage due to limitation in HomeKit Interface.

## Cameras

_Arlo, Canary, Nest Cam_

* Added to HomeKit as motion detector.
* Canary is added to HomeKit as security system:
  * Allows user to set the operating mode (armed, disarmed, etc).

Limitations:

* Can not view video feed.
* Cameras other than Canary are not added as a security system (as I'm not sure which modes each camera supports and how they map to HomeKit states).

## Garage Doors

* Open/Close Wink-connected garage doors.
* Reports Battery Level (where available).

Limitations:

* Does not identify blocked doors due to limitation in Wink Interface.

## Light Bulbs

_Light Bulbs and dimmable switches_

* On/Off and Dimming.
* Bulbs with support allow Hue and Saturation.

## Locks

* Lock/Unlock and report current status.
* Reports Battery Level (where available).

Limitations:

* Does not support tamper detection due to limitation in developer's locks and/or Wink API.

## Propane Tank

  * Reports as a battery

## Sensors

_Spotter, Tripper and other PIR and Door/Window Sensors_

* The following sensors are supported:
  * Humidity sensor
  * Motion sensor (PIR reports as Motion Detector)
  * Occupancy sensor
  * Temperature sensor
  * Water sensor (leak detector)
* Door Sensors report as Doors by default. However, can be added to HomeKit as a window:
  * using `window_ids` optional configuration field, or
  * automatically if device's name contains the word "window" (such as "Living Room Window")
* Reports Battery Level (where available).

Limitations:

* Spotter does not report brightness, vibration or loudness to HomeKit. Apple expects values and these are simply reported as yes/no concerning if it changed.
* Door/Window Tamper Detection is not available in HomeKit.

## Shades

* Open and close.
* Reports Battery Level (where available).

## Siren

_GoControl Siren_

* Enable/disable siren and strobe independently of each other.

## Smoke Detectors

* Reports CO and Smoke Alarms as available by the detector
* Reports Battery Level.

Limitations:

* Only Kiddie detectors are supported?

## Thermostats

* Should be fully functional.
* Reports Battery Level (where available).
