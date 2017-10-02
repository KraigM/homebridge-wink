# homebridge-wink

Yet another Wink plugin for [homebridge](https://github.com/nfarina/homebridge).

* Uses Wink API v2, and local control.
* Subscribes to Wink push notifications, instead of polling for device updates.
* Written in ES7 (arrow functions, async/await, classes).
* Accessory services and characteristics are defined declaratively.
* Supports 3 methods of [authentication](#authentication) including API tokens obtained from [developer.wink.com](https://developer.wink.com)

## Contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Authentication](#authentication)
    1. [OAuth Authorization Code](#oauth-authorization-code)
    2. [OAuth Password Grant](#oauth-password-grant)
    3. [Android client ID](#android-client-id)
4. [Device support](#device-support)
4. [FAQ](#faq)
5. [Acknowledgements](#acknowledgements)

## Installation

Requires Node.js 6 or later.

1. Install homebridge: `npm install -g homebridge`
2. Install this plugin: `npm install -g homebridge-wink`
3. Update your configuration file. See sample config.json snippet below.

## Configuration

```json
"platforms": [
  {
    "platform": "Wink",
    "name": "Wink",
    "username": "your@email.com",
    "password": "WINK_PASSWORD",
    "hide_groups": [
      "garage_door",
      "thermostat"
    ]
  }
]
```

| Parameter       | Required | Notes                                          |
| --------------- | -------- | ---------------------------------------------- |
| `platform`      | X        | Must always be "Wink".                         |
| `name`          | X        | Can be anything.                               |
| `client_id`     | *        | See [Authentication](#authentication) |
| `client_secret` | *        | See [Authentication](#authentication) |
| `username`     | *        | See [Authentication](#authentication) |
| `password` | *        | See [Authentication](#authentication) |
| `hide_groups`   |          | List of Wink Device Groups/Types that will be hidden from Homebridge. (see Device Support table below) |
| `hide_ids`      |          | List of Wink IDs that will be hidden from Homebridge. |
| `fan_ids`       |          | List of Wink IDs (for binary switches or light switches/dimmers) that will be added as fans to Homebridge. |
| `window_ids`    |          | List of Wink IDs that will be added as windows (instead of doors) to Homebridge. |
| `direct_access` |          | Attempt to establish direct communication with the Wink hub. Defaults to `true`. |

## Authentication

homebridge-wink supports 3 methods of authentication.

* [OAuth Authorization Code](#oauth-authorization-code) (Preferred)
* [OAuth Password Grant](#oauth-password-grant)
* [Android client ID](#android-client-id)

#### OAuth Authorization Code

This is the method of authentication preferred by Wink. Using API credentials obtained from [developer.wink.com](https://developer.wink.com), the plugin will direct the user to authenticate via the wink.com at startup.

You need to provide the following configuration options: `client_id` and `client_secret`

Note: DO NOT use use `username` and `password` configuration options.

##### Obtaining a Client ID and secret

1. Create an account at [developer.wink.com](https://developer.wink.com)
2. [Create an application](https://developer.wink.com/clients/new), with the following information:
  * Name: Homebridge
  * Website: https://github.com/kraigm/homebridge-wink
  * Redirect URI: http://<HOMEBRIDGE_IP>:8888
  * Check "I agree to the terms and conditions"
3. Wait for the application to be approved (may take hours)
4. Once approved, the Client ID and Secret can be seen [here](https://developer.wink.com/clients).

#### OAuth Password Grant

If you have old Wink API credentials that support OAuth password grant.

You need to provide the following configuration options: `client_id`, `client_secret`, `username` and `password`

#### Android client ID

If you'd prefer to use the client ID and secret associated with Wink's Android app.

You need to provide the following configuration options: `username` and `password`

## Device support

See [DEVICES.md](DEVICES.md) for more detailed information.

| Category                                        | Device Type       | Device Group       |
|-------------------------------------------------|-------------------|--------------------|
| [Air Conditioners](DEVICES.md#air-conditioners) | `air_conditioner` | `air_conditioners` |
| [Binary Switches](DEVICES.md#binary-switches)   | `binary_switch`   | `binary_switches`  |
| [Cameras](DEVICES.md#cameras)                   | `camera`          | `cameras`          |
| [Fans](DEVICES.md#fans)                         | `fan`             | `fans`             |
| [Garage Doors](DEVICES.md#garage-doors)         | `garage_door`     | `garage_doors`     |
| [Light Bulbs](DEVICES.md#light-bulbs)           | `light_bulb`      | `light_bulbs`      |
| [Locks](DEVICES.md#locks)                       | `lock`            | `locks`            |
| [Propane Tanks](DEVICES.md#propane-tanks)       | `propane_tank`    | `propane_tanks`    |
| [Sensors](DEVICES.md#sensors)                   | `sensor_pod`      | `sensor_pods`      |
| [Shades](DEVICES.md#shades)                     | `shade`           | `shades`           |
| [Sirens](DEVICES.md#sirens)                     | `siren`           | `sirens`           |
| [Smoke Detectors](DEVICES.md#smoke-detectors)   | `smoke_detector`  | `smoke_detectors`  |
| [Thermostats](DEVICES.md#thermostats)           | `thermostat`      | `thermostats`      |


## FAQ

#### Chamberlain garage opener does not seem to response to commands

Unfortunately, Chamberlain garage openers are only controllable when using [Android client ID authentication](#android-client-id). ([Source](https://github.com/python-wink/python-wink/issues/23#issuecomment-197431701))

#### GoControl garage opener does not seem to response to commands

It has been reported that GoControl garage openers do not respond when using OAuth Password Grant, instead I recommend using [OAuth Authorization Code](#oauth-authorization-code). ([Source](https://github.com/sibartlett/homebridge-wink3/issues/21))

#### Is Pivot Power Genius supported?

No, but checkout this other [plugin](https://www.npmjs.com/package/homebridge-pivot-power-genius).

## Acknowledgements

This plugin is a crazy rewrite of those that came before:

* The original [homebridge-wink](https://github.com/KraigM/homebridge-wink) plugin, maintained by [KraigM](https://github.com/KraigM)
* A [fork](https://github.com/pdlove/homebridge-wink), maintained by [pdlove](https://github.com/pdlove)
