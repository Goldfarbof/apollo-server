jest.mock('ioredis');

import { BaseRedisCache, RedisClient } from '../index';
import {
  testKeyValueCache_Basics,
  testKeyValueCache_Expiration,
} from '../../../apollo-server-caching/src/__tests__/testsuite';


describe('BaseRedisCacheTest', () => {
  const store: { [key: string]: string } = {};
  const testRedisClient: RedisClient = {
    set: jest.fn((key: string, value: string, option?: string, ttl?: number) => {
      store[key] = value;
      option === 'EX' && ttl && setTimeout(() => delete store[key], ttl * 1000);
      return Promise.resolve();
    }),
    mget: jest.fn((...keys) => Promise.resolve(keys.map((key: string) => store[key]))),
    flushdb: jest.fn(() => Promise.resolve()),
    del: jest.fn((key: string) => {
      const keysDeleted = store.hasOwnProperty(key) ? 1 : 0;
      delete store[key];
      return Promise.resolve(keysDeleted);
    }),
    quit: jest.fn(() => Promise.resolve()),
  }

  const cache = new BaseRedisCache(testRedisClient);
  testKeyValueCache_Basics(cache);
  testKeyValueCache_Expiration(cache);
});
