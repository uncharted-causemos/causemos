import _ from 'lodash';

const POLL_INTERVAL = 1000;
const MAX_POLL_THRESHOLD = 50;

const NOOP = () => {};

class Poller {
  _pollId = 0;
  _success: Function = NOOP;
  _failure: Function = NOOP;
  _poll: Function = NOOP;
  _interval: number;
  _threshold: number;
  _numPolls: number;
  _isRunning = false;

  constructor(interval: number, threshold: number) {
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
    this._pollId = 0;
    this._numPolls = 0;
    this._isRunning = false;
  }

  poll(func: Function) {
    this._poll = func;
    return this;
  }

  success(func: Function) {
    this._success = func;
    return this;
  }

  failure(func: Function) {
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
        .then(([done, result]: [boolean, any]) => {
          if (done === true) {
            this._stop();
            this._success(result);
          } else {
            this.start();
          }
        })
        .catch((err: any) => {
          this._stop();
          this._failure(err);
        });
    }, this._interval);
  }
}

export default Poller;

export function startPolling(taskFn: Function, { interval, threshold }: { interval: number; threshold: number }) {
  const poller = new Poller(interval, threshold);
  const taskFunction = () => Promise.resolve(taskFn());
  const promise = new Promise((resolve, reject) => {
    poller.poll(taskFunction).success(resolve).failure(reject).start();
  });
  return promise;
}
