import { TokenInfoRepository } from '../src/services/repository'
import { Pool } from 'pg';

const dotenv = require('dotenv')
dotenv.config();

const poolConfig = {
    user: process.env.DB_USER || 'pumpuser',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'pumpmonitor',
    max: 20, // 连接池最大连接数
    idleTimeoutMillis: 30000, // 连接最大空闲时间
    connectionTimeoutMillis: 2000, // 连接超时
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : undefined
};

async function main() {
    // 创建连接池
    const pool = new Pool(poolConfig);
    // 监听连接错误
    pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        process.exit(-1);
    });
    const tokenRepo = new TokenInfoRepository(pool);

    // 创建 token
    const newToken = await tokenRepo.create({
        symbol: "ETH",
        price: 2000,
        ca: "0x1234567",
        lp:'0x3344',
        mcp: 1000000,
        rugProbability: 0.1,
        lplock: true,
        honeypot: false
    });

    // 查询所有低风险代币
    const safeTokens = await tokenRepo.findAll({
        maxRugProbability: 0.2,
        isLPLocked: true,
        isHoneypot: false
    });
    console.log(safeTokens)

    // 更新价格
    await tokenRepo.update("0x1234567", {
        price: 2100,
        mcp: 1100000
    });
}

main().catch(console.error);
