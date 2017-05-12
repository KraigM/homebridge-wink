export default class AccessoryHelper {
  constructor(options) {
    this.config = options.config;
    this.definitions = options.definitions;
    this.hap = options.hap;
    this.onChange = options.onChange;
  }

  getOrAddService(accessory, service) {
    return accessory.getService(service) || accessory.addService(service);
  }

  getOrAddCharacteristic(service, characteristic) {
    return (
      service.getCharacteristic(characteristic) ||
      service.addCharacteristic(characteristic)
    );
  }

  getDefinition(accessory) {
    const definition = this.definitions[accessory.context.object_type];
    const last_reading = accessory.context.last_reading;
    return {
      ...definition,
      services: definition.services
        .filter(
          service =>
            !service.supported ||
            service.supported(last_reading, accessory.context, this.config)
        )
        .map(service => ({
          ...service,
          characteristics: service.characteristics.filter(
            characteristic =>
              !characteristic.supported ||
              characteristic.supported(
                last_reading,
                accessory.context,
                this.config
              )
          )
        }))
    };
  }

  configureAccessory(accessory, reachability) {
    this.configureAccessoryCharacteristics(accessory);
    this.updateAccessoryState(accessory, reachability);
  }

  configureAccessoryCharacteristics(accessory) {
    const { Characteristic, Service } = this.hap;
    const device = accessory.context;

    accessory
      .getService(Service.AccessoryInformation)
      .setCharacteristic(
        Characteristic.Manufacturer,
        device.device_manufacturer
      )
      .setCharacteristic(Characteristic.Model, device.model_name)
      .setCharacteristic(Characteristic.SerialNumber, device.object_id);

    const services = accessory.definition.services;

    services.forEach(definition => {
      const service = this.getOrAddService(accessory, definition.service);

      definition.characteristics.forEach(c => {
        if (c.value) {
          service.setCharacteristic(c.characteristic, c.value);
          return;
        }

        const characteristic = service.getCharacteristic(c.characteristic);

        if (c.get) {
          characteristic.on(
            "get",
            this.readAccessory.bind(this, accessory, c.get)
          );
        }

        if (c.set) {
          characteristic.on(
            "set",
            this.writeAccessory.bind(this, accessory, c.set)
          );
        }
      });
    });
  }

  readAccessory(accessory, get, callback) {
    // First argument is current state
    // Second argument is desired state (merged state)
    const value = get(accessory.context.last_reading, accessory.merged_state);
    callback(null, value);
  }

  writeAccessory(accessory, set, value, callback) {
    const state = set(value, accessory.merged_state);

    this.onChange(accessory, state)
      .then(response => {
        if (response) {
          accessory.context.desired_state = {
            ...accessory.context.desired_state,
            ...response.data.desired_state
          };
          this.updateAccessoryState(accessory);
        }
        callback();
      })
      .catch(e => {
        this.log("error", `Failed to update device: ${accessory.context.name} (${accessory.context.object_type}/${accessory.context.object_id})`, e);
        callback(e);
      });
  }

  updateAccessoryState(accessory, reachability = true) {
    accessory.definition.services.forEach(definition => {
      const service = accessory.getService(definition.service);

      definition.characteristics.forEach(c => {
        if (c.available && !c.available(accessory.context.last_reading)) {
          return;
        }

        const characteristic = service.getCharacteristic(c.characteristic);

        characteristic && c.get && characteristic.getValue();
      });
    });

    if (
      reachability &&
      accessory.context.last_reading.connection !== undefined
    ) {
      accessory.updateReachability(accessory.context.last_reading.connection);
    }
  }
}
