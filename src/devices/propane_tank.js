import { batteryService } from "./_shared";

export default ({ Characteristic, Service }) => {
  return {
    type: "propane_tank",
    group: "propane_tanks",
    services: [
      batteryService({
        Characteristic,
        Service,
        field: "remaining"
      })
    ]
  };
};
