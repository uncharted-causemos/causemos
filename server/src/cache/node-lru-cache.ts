import { LRUCache } from 'lru-cache';
import argv from '#@/config/yargs-wrapper.js';

// Initiate an in-memory cache
const cache = new LRUCache<string, unknown>({
  max: (argv as any).cacheSize,
  ttlAutopurge: true,
});

const transLock = new LRUCache<string, number>({ max: 1000 });

const ts = (): number => new Date().getTime();

export const hasCache = (key: string): boolean => {
  return cache.has(key);
};

export const getCache = (key: string): unknown => {
  return cache.get(key);
};

export const setCache = (key: string, value: unknown, ttl?: number): void => {
  if (ttl !== undefined) {
    cache.set(key, value, { ttl });
  } else {
    cache.set(key, value);
  }
};

export const delCache = (key: string): void => {
  cache.delete(key);
};

export const LOCK_TIMEOUT = 1000 * 60; // 1 min

export const setLock = (key: string): boolean => {
  const t = ts();
  if (transLock.has(key) === false || t - (transLock.get(key) as number) >= LOCK_TIMEOUT) {
    transLock.set(key, t);
    return true;
  }
  return false;
};

export const releaseLock = (key: string): void => {
  transLock.delete(key);
};
