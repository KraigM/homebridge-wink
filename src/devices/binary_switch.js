const isFan = (state, device, config) =>
  config.fan_ids.indexOf(device.object_id) !== -1;

const isLightBulb = (state, device, config) =>
  !isFan(state, device, config) && state.consumption === undefined;

const isOutlet = (state, device, config) =>
  !isFan(state, device, config) && state.consumption !== undefined;

export default ({ Characteristic, Service }) => {
  return {
    type: "binary_switch",
    group: "binary_switches",
    services: [
      {
        service: Service.Fan,
        supported: isFan,
        characteristics: [
          {
            characteristic: Characteristic.On,
            get: state => state.powered,
            set: value => ({ powered: !!value })
          }
        ]
      },
      {
        service: Service.Lightbulb,
        supported: isLightBulb,
        characteristics: [
          {
            characteristic: Characteristic.On,
            get: state => state.powered,
            set: value => ({ powered: !!value })
          }
        ]
      },
      {
        service: Service.Outlet,
        supported: isOutlet,
        characteristics: [
          {
            characteristic: Characteristic.On,
            get: state => state.powered,
            set: value => ({ powered: !!value })
          },
          {
            characteristic: Characteristic.OutletInUse,
            get: state => state.consumption > 0.1
          }
        ]
      }
    ]
  };
};
