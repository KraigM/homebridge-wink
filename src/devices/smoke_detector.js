import { batteryService } from "./_shared";

export default ({ Characteristic, Service }) => {
  return {
    type: "smoke_detector",
    group: "smoke_detectors",
    services: [
      {
        service: Service.CarbonMonoxideSensor,
        characteristics: [
          {
            characteristic: Characteristic.CarbonMonoxideDetected,
            get: state =>
              state.co_detected
                ? Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL
                : Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL
          }
        ]
      },
      {
        service: Service.SmokeSensor,
        characteristics: [
          {
            characteristic: Characteristic.SmokeDetected,
            get: state =>
              state.smoke_detected
                ? Characteristic.SmokeDetected.SMOKE_DETECTED
                : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED
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
