const LRU = require('lru-cache');
const argv = rootRequire('/config/yargs-wrapper');

// Initiate an in-memory cache
const cache = new LRU(argv.cacheSize);

const transLock = new LRU(1000);

const ts = () => (new Date().getTime());

const has = (key) => {
  return cache.has(key);
};
const get = (key) => {
  return cache.get(key);
};
const set = (key, value, maxAge) => {
  return cache.set(key, value, maxAge);
};

const del = (key) => {
  cache.del(key);
};

const timeout = 1000 * 60 * 3; // 3 min
const setLock = (key) => {
  const t = ts();
  if (transLock.has(key) === false || (t - transLock.get(key)) >= timeout) {
    transLock.set(key, t);
    return true;
  }
  return false;
};
const releaseLock = (key) => {
  transLock.del(key);
};

module.exports = {
  has,
  get,
  set,
  del,

  setLock,
  releaseLock
};
