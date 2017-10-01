import _ from "lodash";

class Debouncer {
  constructor(options) {
    _.defaults(options, {
      reduceArgs: (prev, args) => args,
      wait: 200
    });

    this.func = options.func;
    this.key = options.key;
    this.reduceArgs = options.reduceArgs;
    this.wait = options.wait;

    this.keys = {};
  }

  clear(data) {
    clearTimeout(data.timeout);
    data.prevResolve && data.prevResolve();

    data.prevResolve = null;
    data.timeout = null;
  }

  call() {
    const key = this.key.apply(this, arguments);

    if (!this.keys[key]) {
      this.keys[key] = {
        prevArgs: null,
        prevResolve: null,
        timeout: null
      };
    }

    const data = this.keys[key];

    this.clear(data);

    return new Promise((resolve, reject) => {
      const args = data.prevArgs
        ? this.reduceArgs(data.prevArgs || [], [...arguments])
        : [...arguments];

      data.timeout = setTimeout(() => {
        delete this.keys[key];
        this.func.apply(undefined, args).then(resolve).catch(reject);
      }, this.wait);

      data.prevArgs = args;
      data.prevResolve = resolve;
    });
  }
}

export default options => {
  const debouncer = new Debouncer(options);
  return debouncer.call.bind(debouncer);
};
