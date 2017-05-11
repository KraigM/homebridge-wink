import { batteryService } from "./_shared";

export default ({ Characteristic, Service }) => {
  return {
    type: "lock",
    group: "locks",
    services: [
      {
        service: Service.LockMechanism,
        characteristics: [
          {
            characteristic: Characteristic.LockCurrentState,
            get: state => {
              switch (state.locked) {
                case true:
                  return Characteristic.LockCurrentState.SECURED;
                case false:
                  return Characteristic.LockCurrentState.UNSECURED;
                default:
                  return Characteristic.LockCurrentState.UNKNOWN;
              }
            }
          },
          {
            characteristic: Characteristic.LockTargetState,
            get: (state, desired_state) => {
              switch (desired_state.locked) {
                case true:
                  return Characteristic.LockCurrentState.SECURED;
                case false:
                  return Characteristic.LockCurrentState.UNSECURED;
                default:
                  return Characteristic.LockCurrentState.UNKNOWN;
              }
            },
            set: value => ({
              locked: value === true ||
                value === Characteristic.LockTargetState.SECURED
            })
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
