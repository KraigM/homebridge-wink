import { batteryService } from "./_shared";

export default ({ Characteristic, Service }) => {
  return {
    type: "shade",
    group: "shades",
    services: [
      {
        service: Service.WindowCovering,
        characteristics: [
          {
            characteristic: Characteristic.TargetPosition,
            get: (state, desired_state) => desired_state.position * 100,
            set: value => value / 100
          },
          {
            characteristic: Characteristic.CurrentPosition,
            get: state => state.position * 100
          },
          {
            characteristic: Service.WindowCovering,
            value: Characteristic.PositionState.STOPPED
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
