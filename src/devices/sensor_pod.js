import { batteryService } from "./_shared";

const isWindow = (state, device, config) => {
  if (config.window_ids.indexOf(device.object_id) !== -1) {
    return true;
  }

  return state.opened !== undefined && /\bwindow\b/i.test(device.name);
};

const isDoor = (state, device, config) => {
  return state.opened !== undefined && !isWindow(state, device, config);
};

export default ({ Characteristic, Service }) => {
  return {
    type: "sensor_pod",
    group: "sensor_pods",
    services: [
      {
        service: Service.OccupancySensor,
        supported: state => state.occupied !== undefined,
        characteristics: [
          {
            characteristic: Characteristic.OccupancyDetected,
            get: state => state.occupied
          },
          {
            characteristic: Characteristic.StatusTampered,
            supported: state => state.tamper_detected !== undefined,
            get: state => state.tamper_detected
          }
        ]
      },
      {
        service: Service.MotionSensor,
        supported: state => state.motion !== undefined,
        characteristics: [
          {
            characteristic: Characteristic.MotionDetected,
            get: state => state.motion
          },
          {
            characteristic: Characteristic.StatusTampered,
            supported: state => state.tamper_detected !== undefined,
            get: state => state.tamper_detected
          }
        ]
      },
      {
        service: Service.HumiditySensor,
        supported: state => state.humidity !== undefined,
        characteristics: [
          {
            characteristic: Characteristic.CurrentRelativeHumidity,
            get: state => state.humidity
          }
        ]
      },
      {
        service: Service.LeakSensor,
        supported: state => state.liquid_detected !== undefined,
        characteristics: [
          {
            characteristic: Characteristic.LeakDetected,
            get: state => state.liquid_detected
          }
        ]
      },
      {
        service: Service.TemperatureSensor,
        supported: state => state.temperature !== undefined,
        characteristics: [
          {
            characteristic: Characteristic.CurrentTemperature,
            get: state => state.temperature
          }
        ]
      },
      {
        service: Service.Door,
        supported: isDoor,
        characteristics: [
          {
            characteristic: Characteristic.CurrentPosition,
            get: state => (state.opened ? 100 : 0)
          },
          {
            characteristic: Characteristic.PositionState,
            value: Characteristic.PositionState.STOPPED
          }
        ]
      },
      {
        service: Service.Window,
        supported: isWindow,
        characteristics: [
          {
            characteristic: Characteristic.CurrentPosition,
            get: state => (state.opened ? 100 : 0)
          },
          {
            characteristic: Characteristic.PositionState,
            value: Characteristic.PositionState.STOPPED
          }
        ]
      },
      batteryService({
        Characteristic,
        Service
      })
    ]
  };
};
