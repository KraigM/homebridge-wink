export default ({ Characteristic, Service }) => {
  return {
    type: "siren",
    group: "sirens",
    services: [
      {
        service: Service.Lightbulb,
        characteristics: [
          {
            characteristic: Characteristic.Name,
            value: "Strobe"
          },
          {
            characteristic: Characteristic.On,
            get: state => state.powered && state.mode !== "siren_only",
            set: (value, accessory) => {
              const state = accessory.context.last_reading;
              if (value) {
                if (!state.powered)
                  return { powered: true, mode: "strobe_only" };
                else if (state.mode == "siren_only")
                  return { powered: true, mode: "siren_and_strobe" };
                else return { powered: true, mode: "strobe_only" };
              } else {
                if (state.powered) return { powered: false };
                else if (state.mode == "siren_and_strobe")
                  return { mode: "siren_only" };
                else return { powered: false };
              }
            }
          }
        ]
      },
      {
        service: Service.Switch,
        characteristics: [
          {
            characteristic: Characteristic.Name,
            value: "Siren"
          },
          {
            characteristic: Characteristic.On,
            get: state => state.powered && state.mode !== "strobe_only",
            set: (value, accessory) => {
              const state = accessory.context.last_reading;
              if (value) {
                if (!state.powered)
                  return { powered: true, mode: "siren_only" };
                else if (state.mode == "siren_only")
                  return { powered: true, mode: "siren_and_strobe" };
                else return { powered: true, mode: "siren_only" };
              } else {
                if (state.powered) return { powered: false };
                else if (state.mode == "siren_and_strobe")
                  return { mode: "strobe_only" };
                else return { powered: false };
              }
            }
          }
        ]
      }
    ]
  };
};
