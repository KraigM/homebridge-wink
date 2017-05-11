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

    this.subscriptions.on("device-list", () => this.reloadAccessories());
    this.subscriptions.on("device-update", this.updateDevice.bind(this));

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

      this.interval = setInterval(
        () => this.reloadAccessories(),
        60 * 60 * 1000
      );

      this.reloadAccessories();
    }
  }

  addDevice(device) {
    const accessory = new this.api.platformAccessory(device.name, device.uuid);
    accessory.context = device;
    this.patchAccessory(accessory);
    this.accessoryHelper.configureAccessory(accessory);
    this.api.registerPlatformAccessories(pluginName, platformName, [accessory]);
    this.accessories.add(accessory);
  }

  updateDevice(device) {
    const accessory = this.accessories.get(device);
    accessory.context = device;
    this.accessoryHelper.updateAccessoryState(accessory);
    this.subscriptions.subscribe(device.subscription);
  }

  async reloadAccessories() {
    const response = await this.client.getDevices();
    const devices = this.filterDevices(response.data);

    const toRemove = this.accessories.diffRemove(devices);
    const toUpdate = this.accessories.intersection(devices);
    const toAdd = this.accessories.diffAdd(devices);

    this.subscriptions.subscribe(response.subscription);

    toRemove.forEach(this.removeAccessory, this);
    toUpdate.forEach(this.updateDevice, this);
    toAdd.forEach(this.addDevice, this);

    this.log(
      `Devices refreshed: ${toAdd.length} added, ${toUpdate.length} updated, ` +
        `${toRemove.length} removed, ${response.data.length - devices.length} ignored.`
    );
  }

  filterDevices(devices) {
    return devices
      .map(device => ({
        device,
        definition: this.definitions[device.object_type]
      }))
      .filter(data => !!data.definition)
      .filter(
        data =>
          this.config.hide_groups.indexOf(data.definition.group) === -1 ||
          this.config.hide_groups.indexOf(data.definition.type) === -1
      )
      .filter(
        data => this.config.hide_ids.indexOf(data.device.object_id) === -1
      )
      .map(data => data.device);
  }

  removeAccessory(accessory) {
    if (this.accessories.remove(accessory)) {
      this.api.unregisterPlatformAccessories(pluginName, platformName, [
        accessory
      ]);
    }
  }
}
