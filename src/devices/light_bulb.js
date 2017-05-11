export default ({ Characteristic, Service }) => {
  return {
    type: "light_bulb",
    group: "light_bulbs",
    services: [
      {
        service: Service.Lightbulb,
        characteristics: [
          {
            characteristic: Characteristic.On,
            get: state => state.powered,
            set: value => ({ powered: !!value })
          },
          {
            characteristic: Characteristic.Brightness,
            supported: state => state.brightness !== undefined,
            get: state => Math.floor(state.brightness * 100),
            set: value => ({ brightness: value / 100 })
          },
          {
            characteristic: Characteristic.Hue,
            supported: state => state.hue !== undefined,
            get: state => Math.floor(state.hue * 360),
            set: (value, accessory) => {
              const values = accessory.merged_values;
              return {
                brightness: values.brightness || values.brightness,
                color_model: "hsb",
                hue: value / 360,
                saturation: values.saturation || values.saturation
              };
            }
          },
          {
            characteristic: Characteristic.Saturation,
            supported: state => state.saturation !== undefined,
            get: state => Math.floor(state.saturation * 100),
            set: (value, accessory) => {
              const values = accessory.merged_values;
              return {
                brightness: values.brightness || values.brightness,
                color_model: "hsb",
                hue: values.hue || values.hue,
                saturation: value / 360
              };
            }
          }
        ]
      }
    ]
  };
};