const LRU = require('lru-cache');
const argv = rootRequire('/config/yargs-wrapper');

// Initiate an in-memory cache
const cache = new LRU(argv.cacheSize);

const transLock = new LRU(1000);

const ts = () => (new Date().getTime());

const hasCache = (key) => {
  return cache.has(key);
};
const getCache = (key) => {
  return cache.get(key);
};
const setCache = (key, value, maxAge) => {
  return cache.set(key, value, maxAge);
};

const delCache = (key) => {
  cache.del(key);
};

const LOCK_TIMEOUT = 1000 * 60; // 1 min
const setLock = (key) => {
  const t = ts();
  if (transLock.has(key) === false || (t - transLock.get(key)) >= LOCK_TIMEOUT) {
    transLock.set(key, t);
    return true;
  }
  return false;
};
const releaseLock = (key) => {
  transLock.del(key);
};

module.exports = {
  hasCache,
  getCache,
  setCache,
  delCache,

  setLock,
  releaseLock,
  LOCK_TIMEOUT
};
