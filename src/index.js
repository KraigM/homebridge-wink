import WinkPlatform, { pluginName, platformName } from "./WinkPlatform";

export default homebridge => {
  homebridge.registerPlatform(pluginName, platformName, WinkPlatform, true);
};
