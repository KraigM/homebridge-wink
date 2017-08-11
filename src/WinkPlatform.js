import childProcess from "child_process";
import fs from "fs";
import _ from "lodash";
import compareVersions from "compare-versions";
import Accessories from "./Accessories";
import AccessoryHelper from "./AccessoryHelper";
import devices from "./devices";
import Subscriptions from "./Subscriptions";
import WinkClient from "./WinkClient";
import pkg from "../package.json";

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

    this.checkVersion();

    this.definitions = devices(api.hap);
    this.accessories = new Accessories();
    this.accessoryHelper = new AccessoryHelper({
      config: this.config,
      definitions: this.definitions,
      hap: api.hap,
      log,
      onChange: this.handleAccessoryStateChange.bind(this)
    });
    this.client = new WinkClient({
      config: this.config,
      log,
      updateConfig: config => this.updateConfig(config)
    });
    this.interval = null;
    this.subscriptions = new Subscriptions();

    this.subscriptions.on("device-list", () => this.refreshDevices());
    this.subscriptions.on("device-update", device => {
      this.log(
        `Received update notification: ${device.name} (${device.object_type}/${device.object_id})`
      );
      this.updateDevice(device);
    });
    this.subscriptions.on("unknown-message", message => {
      this.log.warn("Received unknown notification:", message);
    });

    this.api.on("didFinishLaunching", this.didFinishLaunching.bind(this));
  }

  updateConfig(newConfig) {
    const configPath = this.api.user.configPath();
    const file = fs.readFileSync(configPath);
    const config = JSON.parse(file);
    const platConfig = config.platforms.find(x => x.name == this.config.name);
    _.extend(platConfig, newConfig);
    const serializedConfig = JSON.stringify(config, null, "  ");
    fs.writeFileSync(configPath, serializedConfig, "utf8");
    _.extend(this.config, newConfig);
  }

  checkVersion() {
    childProcess.exec(`npm view ${pkg.name} version`, (error, stdout) => {
      const latestVersion = stdout && stdout.trim();
      if (latestVersion && compareVersions(stdout.trim(), pkg.version) > 0) {
        this.log.warn(
          `NOTICE: New version of ${pkg.name} available: ${latestVersion}`
        );
      }
    });
  }

  cleanConfig(config) {
    const newConfig = {
      debug: false,
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
      `Loaded from cache: ${accessory.context.name} (${accessory.context
        .object_type}/${accessory.context.object_id})`
    );
  }

  patchAccessory(accessory, device) {
    if (device) {
      accessory.context = device;
    }
    accessory.definition = this.accessoryHelper.getDefinition(
      accessory.context
    );
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
        this.accessoryHelper.configureAccessory(accessory);
      });

      this.interval = setInterval(() => this.refreshDevices(), 60 * 60 * 1000);

      this.refreshDevices();
    }
  }

  addDevice(device) {
    const accessory = new this.api.platformAccessory(device.name, device.uuid);
    this.patchAccessory(accessory, device);
    this.accessoryHelper.configureAccessory(accessory);
    this.api.registerPlatformAccessories(pluginName, platformName, [accessory]);
    this.accessories.add(accessory);
    this.log(
      `Added: ${accessory.context.name} (${accessory.context
        .object_type}/${accessory.context.object_id})`
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

      // Request user - this should ensure that pubnub subscriptions don't stop working
      await this.client.getUser();

      const response = await this.client.getDevices();

      const data = this.annotateDevices(response.data);
      const devices = data.filter(x => x.valid).map(x => x.device);

      const toRemove = this.accessories.diffRemove(devices);
      const toUpdate = this.accessories.intersection(devices);
      const toAdd = this.accessories.diffAdd(devices);
      const toIgnore = data.filter(x => !x.valid);

      if (response.subscription) {
        this.subscriptions.subscribe(response.subscription);
      }

      toRemove.forEach(this.removeAccessory, this);
      toUpdate.forEach(this.updateDevice, this);
      toAdd.forEach(this.addDevice, this);
      toIgnore.forEach(this.ignoreDevice, this);

      this.log("Devices refreshed");
    } catch (e) {
      this.log.error("Failed to refresh devices.", e);
    }
  }

  annotateDevices(devices) {
    return devices
      .filter(device => device.object_type !== "hub")
      .filter(device => !device.hidden_at)
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
        `${reason}: ${data.device.name} (${data.device.object_type}/${data
          .device.object_id})`
      );
    }
  }

  removeAccessory(accessory) {
    if (this.accessories.remove(accessory)) {
      this.api.unregisterPlatformAccessories(pluginName, platformName, [
        accessory
      ]);
      this.log(
        `Removed: ${accessory.context.name} (${accessory.context
          .object_type}/${accessory.context.object_id})`
      );
    }
  }
}
