import { batteryService } from "./_shared";

export default ({ Characteristic, Service }) => {
  return {
    type: "thermostat",
    group: "thermostats",
    services: [
      {
        service: Service.Thermostat,
        characteristics: [
          {
            characteristic: Characteristic.CurrentHeatingCoolingState,
            get: state => {
              if (!state.powered) {
                return Characteristic.CurrentHeatingCoolingState.OFF;
              }

              switch (state.mode) {
                case "cool_only":
                  return Characteristic.CurrentHeatingCoolingState.COOL;
                case "heat_only":
                  return Characteristic.CurrentHeatingCoolingState.HEAT;
                case "auto": //HomeKit only accepts HEAT/COOL, so we have to determine if we are Heating or Cooling.
                  if (state.temperature < state.min_set_point)
                    return Characteristic.CurrentHeatingCoolingState.HEAT;
                  else return Characteristic.CurrentHeatingCoolingState.COOL;
                case "aux": //This assumes aux is always heat. Wink doesn't support aux with my thermostat even though I have aux mode, so I'm not 100%.
                  return Characteristic.CurrentHeatingCoolingState.HEAT;
                default:
                  //The above list should be inclusive, but we need to return something if they change stuff.
                  return Characteristic.CurrentHeatingCoolingState.OFF;
              }
            }
          },
          {
            characteristic: Characteristic.TargetHeatingCoolingState,
            get: (state, desired_state) => {
              if (!desired_state.powered) {
                return Characteristic.TargetHeatingCoolingState.OFF;
              }

              switch (desired_state.mode) {
                case "cool_only":
                  return Characteristic.TargetHeatingCoolingState.COOL;
                case "heat_only":
                  return Characteristic.TargetHeatingCoolingState.HEAT;
                case "auto":
                  return Characteristic.TargetHeatingCoolingState.AUTO;
                case "aux": //This assumes aux is always heat. Wink doesn't support aux with my thermostat even though I have aux mode, so I'm not 100%.
                  return Characteristic.TargetHeatingCoolingState.HEAT;
                default:
                  //The above list should be inclusive, but we need to return something if they change stuff.
                  return Characteristic.TargetHeatingCoolingState.OFF;
              }
            },
            set: value => {
              switch (value) {
                case Characteristic.TargetHeatingCoolingState.COOL:
                  return { powered: true, mode: "cool_only" };
                case Characteristic.TargetHeatingCoolingState.HEAT:
                  return { powered: true, mode: "heat_only" };
                case Characteristic.TargetHeatingCoolingState.AUTO:
                  return { powered: true, mode: "auto" };
                case Characteristic.TargetHeatingCoolingState.OFF:
                  return { powered: false };
              }
            }
          },
          {
            characteristic: Characteristic.CurrentTemperature,
            get: state => state.temperature
          },
          {
            characteristic: Characteristic.TargetTemperature,
            get: (state, desired_state) => desired_state.min_set_point,
            set: value => ({
              min_set_point: value,
              max_set_point: value + 0.5555556
            })
          },
          {
            characteristic: Characteristic.TemperatureDisplayUnits,
            get: state =>
              state.units.temperature === "c"
                ? Characteristic.TemperatureDisplayUnits.CELSIUS
                : Characteristic.TemperatureDisplayUnits.FAHRENHEIT
          },
          {
            characteristic: Characteristic.HeatingThresholdTemperature,
            get: state => state.min_set_point,
            set: value => ({ min_set_point: value })
          },
          {
            characteristic: Characteristic.CoolingThresholdTemperature,
            get: state => state.max_set_point,
            set: value => ({ max_set_point: value })
          },
          {
            characteristic: Characteristic.CurrentRelativeHumidity,
            supported: state => state.humidity !== undefined,
            get: state => state.humidity
          }
        ]
      },
      batteryService({
        Characteristic,
        Service
      })
    ]
  };
};
