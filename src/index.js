import sourceMapSupport from "source-map-support";
import WinkPlatform, { pluginName, platformName } from "./WinkPlatform";

sourceMapSupport.install();

export default homebridge => {
  homebridge.registerPlatform(pluginName, platformName, WinkPlatform, true);
};
