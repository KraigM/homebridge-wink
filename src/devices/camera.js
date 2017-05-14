import { batteryService } from "./_shared";

export default ({ Characteristic, Service }) => {
  return {
    type: "camera",
    group: "cameras",
    services: [
      {
        service: Service.MotionSensor,
        supported: state => state.motion !== undefined,
        characteristics: [
          {
            characteristic: Characteristic.MotionDetected,
            get: state => state.motion
          }
        ]
      },
      {
        service: Service.SecuritySystem,
        supported: (state, device) =>
          state.mode !== undefined && device.device_manufacturer === "canary",
        characteristics: [
          {
            characteristic: Characteristic.SecuritySystemCurrentState,
            get: state => {
              switch (state.mode) {
                case "away":
                  return Characteristic.SecuritySystemCurrentState.AWAY_ARM;
                case "night":
                  return Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
                case "home":
                  return Characteristic.SecuritySystemCurrentState.STAY_ARM;
                default:
                  return Characteristic.SecuritySystemCurrentState.DISARMED;
              }
            }
          },
          {
            characteristic: Characteristic.SecuritySystemTargetState,
            get: (state, desired_state) => {
              switch (desired_state.mode) {
                case "away":
                  return Characteristic.SecuritySystemTargetState.AWAY_ARM;
                case "night":
                  return Characteristic.SecuritySystemTargetState.NIGHT_ARM;
                case "home":
                  return Characteristic.SecuritySystemTargetState.STAY_ARM;
                default:
                  return Characteristic.SecuritySystemTargetState.DISARMED;
              }
            },
            set: value => {
              switch (value) {
                case Characteristic.SecuritySystemTargetState.AWAY_ARM:
                  return { powered: true, mode: "away" };
                case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
                  return { powered: true, mode: "night" };
                case Characteristic.SecuritySystemTargetState.STAY_ARM:
                  return { powered: true, mode: "home" };
                case Characteristic.SecuritySystemTargetState.DISARMED:
                  return { powered: false };
              }
            }
          }
        ]
      },
      batteryService({
        Characteristic,
        Service,
        notCharging: true
      })
    ]
  };
};
