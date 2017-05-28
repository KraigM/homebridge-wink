import fs from "fs";
import http from "http";
import path from "path";
import url from "url";
import ip from "ip";
import request from "request-promise-native";
import debounce from "./debounce";

const android_client_id = "quirky_wink_android_app";
const android_client_secret = "e749124ad386a5a35c0ab554a4f2c045";

export default class WinkClient {
  constructor({ config, log, updateConfig }) {
    this.config = config;
    this.log = log;
    this.updateConfig = updateConfig;
    this.direct_access = config.direct_access;

    this.hubs = {};
    this.nonce = 1000000;
    this.updateDevice = debounce({
      func: this.updateDevice.bind(this),
      key: accessory => accessory.context.uuid,
      reduceArgs: (oldArgs, newArgs) => [
        newArgs[0],
        { ...oldArgs[1], ...newArgs[1] }
      ]
    });
  }

  request(options, hub) {
    const accessToken = hub ? hub.access_token : this.config.access_token;
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
    }).catch(err => {
      if (err.statusCode === 401 && this.config.refresh_token) {
        return this.refreshToken().then(() => this.request(options, hub));
      }

      return Promise.reject(err);
    });
  }

  getToken(data) {
    return request({
      method: "POST",
      baseUrl: "https://api.wink.com",
      uri: "/oauth2/token",
      body: data,
      json: true
    }).then(response => {
      this.updateConfig({
        access_token: response.access_token,
        refresh_token: response.refresh_token
      });
    });
  }

  refreshToken() {
    this.log("Refreshing access token...");
    return this.getToken({
      grant_type: "refresh_token",
      client_id: this.config.client_id || android_client_id,
      client_secret: this.config.client_secret || android_client_secret,
      refresh_token: this.config.refresh_token
    })
      .then(response => {
        this.log("Refreshed access token");
        return response;
      })
      .catch(err => {
        if (err.statusCode === 400) {
          this.updateConfig({
            access_token: undefined,
            refresh_token: undefined
          });

          return Promise.reject(
            "Restart Homebridge, Wink needs to be re-authenticated."
          );
        }

        return Promise.reject(err);
      });
  }

  getOauthGrant() {
    return new Promise(resolve => {
      if (this.config.username && this.config.password) {
        return resolve({
          grant_type: "password",
          client_id: this.config.client_id || android_client_id,
          client_secret: this.config.client_secret || android_client_secret,
          username: this.config.username,
          password: this.config.password
        });
      }

      const ipAddress = ip.address("public", "ipv4");
      const redirectUri = `http://${ipAddress}:8888`;
      const state = Date.now().toString();

      this.log.warn(`To authenticate, go to this URL: ${redirectUri}`);

      const server = http.createServer((request, response) => {
        const { query } = url.parse(request.url, true);

        if (query.code && query.state === state) {
          resolve({
            grant_type: "code",
            client_secret: this.config.client_secret,
            code: query.code
          });

          const filePath = path.join(__dirname, "../src/authenticated.html");
          const file = fs.readFileSync(filePath);

          response.writeHead(200, { "Content-Type": "text/html" });
          response.end(file);
          server.close();
        } else {
          response.writeHead(302, {
            Location: `https://api.wink.com/oauth2/authorize?response_type=code&client_id=${this.config.client_id}&redirect_uri=${redirectUri}&state=${state}`
          });
          return response.end();
        }
      });

      server.listen(8888);
    });
  }

  async authenticate() {
    if (this.config.refresh_token) {
      // Already autenticated
      return true;
    }

    const data = await this.getOauthGrant();

    try {
      await this.getToken(data);
      this.log("Authenticated with wink.com");
      return true;
    } catch (e) {
      this.log.error("Could not authenticate with wink.com", e);
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
    const errorMessage = `Wink hub (${hub.device.last_reading.ip_address}) is not reachable locally`;

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

      if (!hub.reachable) {
        this.log.warn(errorMessage);
      }
    } catch (e) {
      hub.reachable = false;
      this.log.warn(`${errorMessage}.`, (!this.config.debug && e.message) || e);
    }

    return hub.reachable;
  }

  async authenticateHub(hub, force = false) {
    if (!force && hub.access_token) {
      return;
    }

    const errorMessage = `Could not authenticate with local Wink hub (${hub.device.last_reading.ip_address})`;
    let authenticated = false;

    try {
      const response = await this.request({
        method: "POST",
        uri: "/oauth2/token",
        body: {
          local_control_id: hub.device.last_reading.local_control_id,
          scope: "local_control",
          grant_type: "refresh_token",
          refresh_token: this.config.refresh_token,
          client_id: this.config.client_id || android_client_id,
          client_secret: this.config.client_secret || android_client_secret
        }
      });

      if (response.errors && response.errors.length) {
        this.log.warn(errorMessage, response.errors);
        return;
      }

      authenticated = true;
      hub.access_token = response.access_token;

      this.log(
        `Authenticated with local Wink hub (${hub.device.last_reading.ip_address})`
      );
    } catch (e) {
      this.log.warn(errorMessage, e);
    } finally {
      hub.authenticated = authenticated;
      if (!authenticated) {
        delete hub.access_token;
      }
    }
  }

  updateDevice(accessory, state) {
    this.log(
      `Sending update: ${accessory.context.name} (${accessory.context.object_type}/${accessory.context.object_id})`,
      state
    );

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
      ).catch(e => {
        hub.authenticated = false;
        delete hub.access_token;
        this.log(
          "warn",
          `Local control failed (${hub.device.last_reading.ip_address}), falling back to remote control`,
          e
        );
        return remote;
      });

      requests.push(local);
    }

    return Promise.race(requests).then(response => {
      this.log(
        `Update sent successfully: ${accessory.context.name} (${accessory.context.object_type}/${accessory.context.object_id})`
      );
      return response;
    });
  }
}
