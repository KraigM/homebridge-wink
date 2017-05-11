import _ from "lodash";

class Debouncer {
  constructor(options) {
    _.defaults(options, {
      reduceArgs: (prev, args) => args,
      wait: 200
    });

    this.func = options.func;
    this.reduceArgs = options.reduceArgs;
    this.wait = options.wait;

    this.prevArgs = null;
    this.prevResolve = null;
    this.timeout = null;
  }

  clear() {
    clearTimeout(this.timeout);
    this.prevResolve && this.prevResolve();

    this.prevResolve = null;
    this.timeout = null;
  }

  call() {
    this.clear();

    return new Promise((resolve, reject) => {
      const args = this.prevArgs
        ? this.reduceArgs(this.prevArgs || [], [...arguments])
        : [...arguments];

      this.timeout = setTimeout(() => {
        this.prevArgs = null;
        this.prevResolve = null;
        this.timeout = null;
        this.func.apply(undefined, args).then(resolve).catch(reject);
      }, this.wait);

      this.prevArgs = args;
      this.prevResolve = resolve;
    });
  }
}

export default options => {
  const debouncer = new Debouncer(options);
  return debouncer.call.bind(debouncer);
};
