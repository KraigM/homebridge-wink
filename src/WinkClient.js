import request from "request-promise-native";
import debounce from "./debounce";

export default class WinkClient {
  constructor(log, config) {
    this.log = log;
    this.credentials = {
      client_id: config.client_id,
      client_secret: config.client_secret,
      username: config.username,
      password: config.password
    };
    this.direct_access = config.direct_access;

    this.access_token = null;
    this.refresh_token = null;
    this.hubs = {};
    this.nonce = 1000000;
    this.updateDevice = debounce({
      func: this.updateDevice.bind(this),
      reduceArgs: (oldArgs, newArgs) => [
        newArgs[0],
        { ...oldArgs[1], ...newArgs[1] }
      ]
    });
  }

  getErrorMessage(err) {
    const data = err.statusCode && err.error && err.error.data;
    return (data && (data.error_description || data.error)) || err.message;
  }

  request(options, hub) {
    const accessToken = hub ? hub.access_token : this.access_token;
    const headers = {
      "User-Agent": "Manufacturer/Apple-iPhone8_1 iOS/10.3.1 WinkiOS/5.8.0.27-production-release (Scale/2.00)"
    };

    if (accessToken && options.uri !== "/oauth2/token") {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    return request({
      baseUrl: hub
        ? `https://${hub.device.last_reading.ip_address}:8888`
        : "https://api.wink.com",
      strictSSL: !hub,
      json: true,
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });
  }

  async authenticate() {
    try {
      const response = await this.request({
        method: "POST",
        uri: "/oauth2/token",
        body: {
          ...this.credentials,
          grant_type: "password"
        },
        json: true
      });

      this.access_token = response.access_token;
      this.refresh_token = response.refresh_token;

      this.log("Authenticated with wink.com");
      return true;
    } catch (err) {
      const message = this.getErrorMessage(err);
      this.log(`Could not authenticate with wink.com: ${message}`);
      return false;
    }
  }

  async getDevices(object_type = "wink_device") {
    const response = await this.request({
      method: "GET",
      uri: `/users/me/${object_type}s`
    });

    if (this.direct_access) {
      this.processHubs(response.data);
    }

    return response;
  }

  processHubs(devices) {
    devices
      .filter(device => device.object_type === "hub")
      .filter(device => device.last_reading.ip_address)
      .forEach(async device => {
        const hub = this.addOrUpdateHub(device);
        const isReachable = await this.isHubReachable(hub);
        if (isReachable) {
          this.authenticateHub(hub);
        }
      });
  }

  addOrUpdateHub(hub) {
    if (!this.hubs[hub.hub_id]) {
      this.hubs[hub.hub_id] = { authenticated: false, reachable: false };
    }

    this.hubs[hub.hub_id].device = hub;
    return this.hubs[hub.hub_id];
  }

  async isHubReachable(hub) {
    try {
      const response = await this.request(
        {
          method: "GET",
          uri: "/",
          json: false,
          timeout: 5000
        },
        hub
      );

      hub.reachable = response.indexOf("wink.com") !== -1;
    } catch (err) {
      hub.reachable = false;
      this.log(
        `Wink hub (${hub.device.last_reading.ip_address}) is not reachable locally`
      );
    }

    return hub.reachable;
  }

  async authenticateHub(hub, force = false) {
    if (!force && hub.access_token) {
      return;
    }

    const response = await this.request({
      method: "POST",
      uri: "/oauth2/token",
      body: {
        local_control_id: hub.device.last_reading.local_control_id,
        scope: "local_control",
        grant_type: "refresh_token",
        refresh_token: this.refresh_token,
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret
      }
    });

    if (response && response.errors.length === 0) {
      hub.access_token = response.access_token;
      hub.authenticated = true;
      this.refresh_token = response.refresh_token || this.refresh_token;

      this.log(
        `Authenticated with local Wink hub (${hub.device.last_reading.ip_address})`
      );
    } else {
      hub.authenticated = false;
      delete hub.access_token;
    }
  }

  updateDevice(accessory, state) {
    this.nonce += 5;

    const remote = this.request({
      method: "PUT",
      uri: `/${accessory.definition.group}/${accessory.context.object_id}/desired_state`,
      body: {
        desired_state: state,
        nonce: this.nonce
      }
    });

    const requests = [remote];

    const hub = this.hubs[accessory.context.hub_id];
    if (hub && hub.authenticated) {
      const local = this.request(
        {
          method: "PUT",
          uri: `/${accessory.definition.group}/${accessory.context.local_id}/desired_state`,
          body: {
            desired_state: state,
            nonce: this.nonce
          }
        },
        hub
      ).catch(() => {
        hub.authenticated = false;
        delete hub.access_token;
        this.log("Local control failed, falling back to remote control");
        return remote;
      });

      requests.push(local);
    }

    return Promise.race(requests);
  }
}
