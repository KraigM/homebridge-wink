export default ({ Characteristic, Service }) => {
  return {
    type: "fan",
    group: "fans",
    services: [
      {
        service: Service.Fan,
        characteristics: [
          {
            characteristic: Characteristic.On,
            get: state => state.powered,
            set: value => ({ powered: !!value })
          },
          {
            characteristic: Characteristic.RotationDirection,
            supported: state => state.direction !== undefined,
            get: state =>
              state.direction === "forward"
                ? Characteristic.RotationDirection.CLOCKWISE
                : Characteristic.RotationDirection.COUNTER_CLOCKWISE,
            set: value => ({
              direction:
                value === Characteristic.RotationDirection.CLOCKWISE
                  ? "forward"
                  : "reverse"
            })
          },
          {
            characteristic: Characteristic.RotationSpeed,
            supported: state => state.mode !== undefined,
            get: state => {
              switch (state.mode) {
                case "auto":
                  return 50;
                case "high":
                  return 100;
                case "medium":
                  return 75;
                case "low":
                  return 50;
                case "lowest":
                  return 25;
                default:
                  return 0;
              }
            },
            set: value => {
              const stepped = 25 * Math.round(value / 25);
              let mode = "lowest";
              if (stepped > 25) {
                mode = "low";
              }
              if (stepped > 50) {
                mode = "medium";
              }
              if (stepped > 75) {
                mode = "high";
              }
              return { mode };
            }
          }
        ]
      }
    ]
  };
};
