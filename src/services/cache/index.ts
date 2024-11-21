import Redis, { createClient } from 'redis'
require('dotenv').config();

// cache service : cache info by redis
export class CacheManager {
  private static instance: CacheManager
  private redisClient: Redis.RedisClientType
  private constructor(redisClient: Redis.RedisClientType | undefined) {
    if (!redisClient || redisClient == undefined) {
      console.log(process.env.REDIS_URL)
      this.redisClient = createClient({
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD
      });
      this.redisClient.connect();
    } else {
      this.redisClient = redisClient
    }
  }

  public static getInstance(redisClient?: Redis.RedisClientType): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(redisClient);
    }
    return CacheManager.instance;
  }

  async cacheInfo(key: string, info: any): Promise<void> {
    //console.log(key,JSON.stringify(info))
    await this.redisClient.set(key, JSON.stringify(info))
    await this.redisClient.expire(key, 24 * 60 * 60); // 24小时过期
  }

  async getInfo(key: string) {
   return await this.redisClient.get(key)
  } 
}
