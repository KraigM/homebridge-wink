import { batteryService } from "./_shared";

export default ({ Characteristic, Service }) => {
  return {
    type: "garage_door",
    group: "garage_doors",
    services: [
      {
        service: Service.GarageDoorOpener,
        characteristics: [
          {
            characteristic: Characteristic.TargetDoorState,
            get: (state, desired_state) => {
              if (desired_state.position == 0)
                return Characteristic.TargetDoorState.CLOSED;
              else if (desired_state.position == 1)
                return Characteristic.TargetDoorState.OPEN;
            },
            set: value => ({
              position: value == Characteristic.TargetDoorState.OPEN ? 1 : 0
            })
          },
          {
            characteristic: Characteristic.CurrentDoorState,
            get: state => {
              if (state.position == 0)
                return Characteristic.CurrentDoorState.CLOSED;
              else if (state.position == 1)
                return Characteristic.CurrentDoorState.OPEN;
            }
          },
          {
            characteristic: Characteristic.GarageDoorOpener,
            value: false
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
