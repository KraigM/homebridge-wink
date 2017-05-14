# homebridge-wink3

Yet another Wink plugin for [homebridge](https://github.com/nfarina/homebridge).

* Uses Wink API v2, and local control.
* Subscribes to Wink push notifications, instead of polling for device updates.
* Written in ES7 (arrow functions, async/await, classes).
* Accessory services and characteristics are defined declaratively.

## Installation

1. Install homebridge: `npm install -g homebridge`
2. Install this plugin: `npm install -g homebridge-wink3`
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

| Parameter       | Required | Second Header                                  |
| --------------- | -------- | ---------------------------------------------- |
| `platform`      | X        | Must always be "Wink".                         |
| `name`          | X        | Can be anything.                               |
| `username`      | X        |                                                |
| `password`      | X        |                                                |
| `client_id`     |          | Client ID permitted to use password grant.     |
| `client_secret` |          | Only required if you're providing a Client ID. |
| `hide_groups`   |          | List of Wink Device Groups/Types that will be hidden from Homebridge. (see Device Support table below) |
| `hide_ids`      |          | List of Wink IDs that will be hidden from Homebridge. |
| `fan_ids`       |          | List of Wink IDs (for binary switches) that will be added as fans to Homebridge. |
| `window_ids`    |          | List of Wink IDs that will be added as windows (instead of doors) to Homebridge. |
| `direct_access` |          | Attempt to establish direct communication with the Wink hub. Defaults to `true`. |

## Device support

See [DEVICES.md](DEVICES.md) for more detailed information.

| Category                                        | Device Type       | Device Group       |
|-------------------------------------------------|-------------------|--------------------|
| [Air Conditioners](DEVICES.md#air-conditioners) | `air_conditioner` | `air_conditioners` |
| [Binary Switches](DEVICES.md#binary-switches)   | `binary_switch`   | `binary_switches`  |
| [Cameras](DEVICES.md#cameras)                   | `camera`          | `cameras`          |
| [Garage Doors](DEVICES.md#garage-doors)         | `garage_door`     | `garage_doors`     |
| [Light Bulbs](DEVICES.md#light-bulbs)           | `light_bulb`      | `light_bulbs`      |
| [Locks](DEVICES.md#locks)                       | `lock`            | `locks`            |
| [Propane Tanks](DEVICES.md#propane-tanks)       | `propane_tank`    | `propane_tanks`    |
| [Sensors](DEVICES.md#sensors)                   | `sensor_pod`      | `sensor_pods`      |
| [Shades](DEVICES.md#shades)                     | `shade`           | `shades`           |
| [Sirens](DEVICES.md#sirens)                     | `siren`           | `sirens`           |
| [Smoke Detectors](DEVICES.md#smoke-detectors)   | `smoke_detector`  | `smoke_detectors`  |
| [Thermostats](DEVICES.md#thermostats)           | `thermostat`      | `thermostats`      |

## Acknowledgements

This plugin is a crazy rewrite of those that came before:

* The original [homebridge-wink](https://github.com/KraigM/homebridge-wink) plugin, maintained by [KraigM](https://github.com/KraigM)
* A [fork](https://github.com/pdlove/homebridge-wink), maintained by [pdlove](https://github.com/pdlove)
