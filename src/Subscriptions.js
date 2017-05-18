import EventEmitter from "events";
import PubNub from "pubnub";

export default class Subscriptions extends EventEmitter {
  constructor() {
    super();
    this.subscribers = {};
  }

  getOrAddSubscriber(subscribeKey) {
    if (!this.subscribers[subscribeKey]) {
      this.subscribers[subscribeKey] = new PubNub({
        subscribeKey
      });

      this.subscribers[subscribeKey].addListener({
        message: this.onMessage.bind(this)
      });
    }

    return this.subscribers[subscribeKey];
  }

  subscribe(subscription) {
    const { pubnub } = subscription;
    const subscriber = this.getOrAddSubscriber(pubnub.subscribe_key);
    subscriber.subscribe({
      channels: [pubnub.channel]
    });
  }

  unsubscribe(subscription) {
    const { pubnub } = subscription;
    const subscriber = this.getOrAddSubscriber(pubnub.subscribe_key);
    subscriber.unsubscribe({
      channels: [pubnub.channel]
    });
  }

  onMessage(message) {
    const msg = typeof message.message !== "string"
      ? message.message
      : JSON.parse(message.message);

    this.emit("message", msg);

    if (
      msg.uuid &&
      msg.name &&
      msg.object_type &&
      msg.object_id &&
      msg.last_reading
    ) {
      return this.emit("device-update", msg);
    }

    if (msg.data && Array.isArray(msg.data)) {
      return this.emit("device-list", msg);
    }

    this.emit("unknown-message", msg);
  }
}
