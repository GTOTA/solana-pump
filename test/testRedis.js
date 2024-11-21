const { createClient } = require('redis');

// // 基本密码配置
// const client = createClient({
//     url: 'redis://localhost:6379',
//     password: 'yourpassword'
// });

// // 或使用完整URL（包含密码）
// const clientWithUrl = createClient({
//     url: 'redis://:yourpassword@localhost:6379'
// });

// 更完整的配置示例
class SecureRedisClient {
    constructor(config = {}) {
        const defaultConfig = {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            password: process.env.REDIS_PASSWORD,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('Redis重连次数过多，停止重试');
                        return new Error('Redis连接失败');
                    }
                    // 指数退避重连策略
                    return Math.min(retries * 100, 3000);
                },
                connectTimeout: 10000, // 连接超时时间
            },
            // TLS配置（如果需要）
            tls: process.env.REDIS_TLS_ENABLED ? {} : undefined
        };

        this.client = createClient({
            ...defaultConfig,
            ...config
        });

        // 错误处理
        this.client.on('error', err => {
            console.error('Redis错误:', err);
        });

        this.client.on('connect', () => {
            console.log('Redis已连接');
        });

        this.client.on('reconnecting', () => {
            console.log('Redis重新连接中...');
        });
    }

    // 连接方法
    async connect() {
        try {
            await this.client.connect();
        } catch (error) {
            console.error('Redis连接失败:', error);
            throw error;
        }
    }

    // 安全的获取数据方法
    async get(key) {
        try {
            const value = await this.client.get(key);
            return value;
        } catch (error) {
            console.error(`获取键${key}失败:`, error);
            throw error;
        }
    }

    // 安全的设置数据方法
    async set(key, value, options = {}) {
        try {
            if (options.expireSeconds) {
                await this.client.setEx(key, options.expireSeconds, value);
            } else {
                await this.client.set(key, value);
            }
        } catch (error) {
            console.error(`设置键${key}失败:`, error);
            throw error;
        }
    }

    // 关闭连接
    async disconnect() {
        try {
            await this.client.quit();
            console.log('Redis连接已安全关闭');
        } catch (error) {
            console.error('关闭Redis连接失败:', error);
            throw error;
        }
    }
}

// 使用示例
async function example() {
    // 使用环境变量
    require('dotenv').config();
    
    console.log(process.env.REDIS_URL)
    const redis = new SecureRedisClient({
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD
    });

    try {
        await redis.connect();
        
        // 存储数据
        await redis.set('testKey', 'testValue', { expireSeconds: 3600 });
        
        // 获取数据
        const value = await redis.get('testKey');
        console.log('获取的值:', value);
       
    } catch (error) {
        console.error('操作失败:', error);
    } finally {
        await redis.disconnect();
    }
}

// 生产环境配置示例
const productionConfig = {
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    socket: {
        tls: true,
        rejectUnauthorized: true // 强制验证SSL证书
    },
    retryStrategy: function(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
};

example();