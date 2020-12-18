import _ from 'lodash';

const POLL_INTERVAL = 1000;
const MAX_POLL_THRESHOLD = 50;

const NOOP = () => {};

class Poller {
  constructor(interval, threshold) {
    this._interval = interval || POLL_INTERVAL;
    this._threshold = threshold || MAX_POLL_THRESHOLD;
    this._numPolls = 0;
    this._success = NOOP;
    this._failure = NOOP;
  }

  _stop() {
    if (!_.isNil(this._pollId)) {
      clearTimeout(this._pollId);
    }
    this._pollId = null;
    this._numPolls = 0;
    this._isRunning = false;
  }

  poll(func) {
    this._poll = func;
    return this;
  }

  success(func) {
    this._success = func;
    return this;
  }

  failure(func) {
    this._failure = func;
    return this;
  }

  start() {
    // Start polling
    this._isRunning = true;
    this._pollId = setTimeout(() => {
      this._numPolls++;
      if (this._numPolls > this._threshold) {
        this._stop();
        this._failure(`Exceed polling threshold ${this._threshold}`);
        return;
      }

      this._poll()
        .then(([done, result]) => {
          if (done === true) {
            this._stop();
            this._success(result);
          } else {
            this.start();
          }
        }).catch(err => {
          this._stop();
          this._failure(err);
        });
    }, this._interval);
  }
}

export default Poller;

export function startPolling(taskFn, { interval, threshold }) {
  const poller = new Poller(interval, threshold);
  const taskFunction = () => Promise.resolve(taskFn());
  const promise = new Promise((resolve, reject) => {
    poller.poll(taskFunction).success(resolve).failure(reject).start();
  });
  return promise;
}
