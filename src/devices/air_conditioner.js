export default ({ Characteristic, Service }) => {
  return {
    type: "air_conditioner",
    group: "air_conditioners",
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
                case "auto_eco": //HomeKit only accepts HEAT/COOL, so we have to determine if we are Heating or Cooling.
                  if (state.temperature > state.max_set_point) {
                    return Characteristic.CurrentHeatingCoolingState.COOL;
                  } else {
                    return Characteristic.CurrentHeatingCoolingState.OFF;
                  }
                default:
                  //If it is fan_only or anything else then we'll report the thermostat as off.
                  return Characteristic.CurrentHeatingCoolingState.OFF;
              }
            }
          },
          {
            characteristic: Characteristic.TargetHeatingCoolingState,
            get: state => {
              if (!state.powered) {
                return Characteristic.TargetHeatingCoolingState.OFF;
              }

              switch (state.mode) {
                case "cool_only":
                  return Characteristic.TargetHeatingCoolingState.COOL;
                case "auto_eco":
                  return Characteristic.TargetHeatingCoolingState.AUTO;
                default:
                  return Characteristic.TargetHeatingCoolingState.OFF;
              }
            },
            set: value => {
              switch (value) {
                case Characteristic.TargetHeatingCoolingState.COOL:
                  return { powered: true, mode: "cool_only" };
                case Characteristic.TargetHeatingCoolingState.AUTO:
                  return { powered: true, mode: "auto_eco" };
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
            get: (state, desired_state) => desired_state.max_set_point,
            set: value => ({ max_set_point: value })
          },
          {
            characteristic: Characteristic.TemperatureDisplayUnits,
            get: state =>
              state.units === "c"
                ? Characteristic.TemperatureDisplayUnits.CELSIUS
                : Characteristic.TemperatureDisplayUnits.FAHRENHEIT
          },
          {
            characteristic: Characteristic.RotationSpeed,
            get: state => state.fan_speed * 100,
            set: value => ({ fan_speed: value / 100 })
          }
        ]
      }
    ]
  };
};
