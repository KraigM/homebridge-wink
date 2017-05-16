import Accessories from "./Accessories";
import AccessoryHelper from "./AccessoryHelper";
import devices from "./devices";
import Subscriptions from "./Subscriptions";
import WinkClient from "./WinkClient";

export const pluginName = "homebridge-wink";
export const platformName = "Wink";

export default class WinkPlatform {
  constructor(log, config, api) {
    if (!config) {
      log("Plugin not configured.");
      return;
    }

    this.log = log;
    this.config = this.cleanConfig(config);
    this.api = api;

    this.definitions = devices(api.hap);
    this.accessories = new Accessories();
    this.accessoryHelper = new AccessoryHelper({
      config: this.config,
      definitions: this.definitions,
      hap: api.hap,
      onChange: this.handleAccessoryStateChange.bind(this)
    });
    this.client = new WinkClient(log, this.config);
    this.interval = null;
    this.subscriptions = new Subscriptions();

    this.subscriptions.on("device-list", () => this.refreshDevices());
    this.subscriptions.on("device-update", device => {
      this.log(
        `Received update notification: ${device.name} (${device.object_type}/${device.object_id})`
      );
      this.updateDevice(device);
    });

    this.api.on("didFinishLaunching", this.didFinishLaunching.bind(this));
  }

  cleanConfig(config) {
    const newConfig = {
      client_id: "quirky_wink_android_app",
      client_secret: "e749124ad386a5a35c0ab554a4f2c045",
      direct_access: true,
      fan_ids: [],
      hide_groups: [],
      hide_ids: [],
      window_ids: [],
      ...config
    };

    ["fan_ids", "hide_ids", "window_ids"].forEach(field => {
      newConfig[field] = newConfig[field].map(id => id.toString());
    });

    return newConfig;
  }

  handleAccessoryStateChange(accessory, state) {
    return this.client.updateDevice(accessory, state);
  }

  configureAccessory(accessory) {
    this.patchAccessory(accessory);
    this.accessories.add(accessory);
    this.log(
      `Loaded from cache: ${accessory.context.name} (${accessory.context.object_type}/${accessory.context.object_id})`
    );
  }

  patchAccessory(accessory) {
    accessory.definition = this.accessoryHelper.getDefinition(accessory);
    Object.defineProperty(accessory, "merged_state", {
      get: function() {
        return {
          ...this.context.last_reading,
          ...this.context.desired_state
        };
      }
    });
  }

  async didFinishLaunching() {
    const authenticated = await this.client.authenticate();

    if (authenticated) {
      this.accessories.forEach(accessory => {
        this.accessoryHelper.configureAccessory(accessory, false);
      });

      this.interval = setInterval(() => this.refreshDevices(), 60 * 60 * 1000);

      this.refreshDevices();
    }
  }

  addDevice(device) {
    const accessory = new this.api.platformAccessory(device.name, device.uuid);
    this.patchAccessory(accessory);
    this.accessoryHelper.configureAccessory(accessory);
    this.api.registerPlatformAccessories(pluginName, platformName, [accessory]);
    this.accessories.add(accessory);
    this.log(
      `Added: ${accessory.context.name} (${accessory.context.object_type}/${accessory.context.object_id})`
    );
  }

  updateDevice(device) {
    const accessory = this.accessories.get(device);
    this.accessoryHelper.updateAccessoryState(accessory, device);
    this.subscriptions.subscribe(device.subscription);
  }

  async refreshDevices() {
    try {
      this.log("Refreshing devices...");

      const response = await this.client.getDevices();

      const data = this.annotateDevices(response.data);
      const devices = data.filter(x => x.valid).map(x => x.device);

      const toRemove = this.accessories.diffRemove(devices);
      const toUpdate = this.accessories.intersection(devices);
      const toAdd = this.accessories.diffAdd(devices);
      const toIgnore = data.filter(x => !x.valid);

      this.subscriptions.subscribe(response.subscription);

      toRemove.forEach(this.removeAccessory, this);
      toUpdate.forEach(this.updateDevice, this);
      toAdd.forEach(this.addDevice, this);
      toIgnore.forEach(this.ignoreDevice, this);

      this.log("Devices refreshed");
    } catch (e) {
      this.log("error", "Failed to refresh devices.", e);
    }
  }

  annotateDevices(devices) {
    return devices
      .filter(device => device.object_type !== "hub")
      .map(device => {
        const definition = this.definitions[device.object_type];
        const isSupported = !!definition;

        const hide_groups =
          isSupported &&
          (this.config.hide_groups.indexOf(definition.group) !== -1 ||
            this.config.hide_groups.indexOf(definition.type) !== -1);

        const hide_ids =
          isSupported && this.config.hide_ids.indexOf(device.object_id) !== -1;

        return {
          device,
          definition,
          isSupported,
          hide_groups,
          hide_ids,
          valid: isSupported && !(hide_groups || hide_ids)
        };
      });
  }

  ignoreDevice(data) {
    if (!this.accessories.ignore(data.device)) {
      return;
    }

    let reason = null;

    if (!data.isSupported) {
      reason = "Not supported by HomeKit";
    } else if (data.hide_groups) {
      reason = "Hidden by hide_groups config option";
    } else if (data.hide_ids) {
      reason = "Hidden by hide_ids config option";
    }

    if (reason) {
      this.log(
        `${reason}: ${data.device.name} (${data.device.object_type}/${data.device.object_id})`
      );
    }
  }

  removeAccessory(accessory) {
    if (this.accessories.remove(accessory)) {
      this.api.unregisterPlatformAccessories(pluginName, platformName, [
        accessory
      ]);
      this.log(
        `Removed: ${accessory.context.name} (${accessory.context.object_type}/${accessory.context.object_id})`
      );
    }
  }
}
