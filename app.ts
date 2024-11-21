// example.ts
import { RedisStreamProcessor, MessageData } from './src/services/message';
import { TokenAnalysisService } from './src/services/analysis';
import { CacheManager } from './src/services/cache'
import { TelegramListenerService } from './src/services/telegram';
import * as StringUtils from './src/utils/StringUtils'
import { promises as fs } from 'fs';
import dotenv from 'dotenv';
import { CHANNEL } from './src/services/telegram/types';
import { GMGNChannelService } from './src/services/telegram/ChannelService';

const { createClient } = require('redis')
dotenv.config();

async function main() {
    const client = createClient({
        url: process.env.REDIS_URL || '',
        password: process.env.REDIS_PASSWORD || '',
    });

    try {
        await client.connect();
    } catch (error) {
        console.error('操作失败:', error);
    }

    const processor = new RedisStreamProcessor(
        client,
        {
            batchSize: 10,
            blockingTimeout: 2000
        }
    );

    // 初始化并开始处理
    await processor.initialize();
    await processor.startProcessing();

    const cacheManger = CacheManager.getInstance(client)

    const messageProcessorService = new TokenAnalysisService(
        processor,
        cacheManger
    )

    messageProcessorService.subscribe()

    await listenTelegramMessageData(processor)

}

async function getTelegramClient() {
    const API_ID = parseInt(process.env.API_ID || '');
    const API_HASH = process.env.API_HASH;

    if (!API_ID || !API_HASH) {
        throw new Error('请在 .env 文件中配置 API_ID 和 API_HASH');
    }

    // 如果有已保存的会话
    let sessionString = '';
    try {
        console.log('session path :', StringUtils.SESSION_PATH)

        sessionString = await fs.readFile(StringUtils.SESSION_PATH, 'utf8');
    } catch (error) {
        // 文件不存在，使用空会话
        console.log('session string null')
    }

    const telegram_client = TelegramListenerService.getInstance({ apiId: API_ID, apiHash: API_HASH, session: sessionString });

    return telegram_client
}

async function listenTelegramMessageData(processor: RedisStreamProcessor) {

    const telegram_client = await getTelegramClient()
    try {
        await telegram_client.connect({});

        const channelUsername = process.env.CHANNEL_USERNAME; 

        const poolService = new GMGNChannelService(channelUsername, telegram_client, processor)

        const gmgn_pool = await telegram_client.getEntity(CHANNEL.GMSINAL_NAME);

        const pumpfull_pool = await telegram_client.getEntity(CHANNEL.PUMP_FULL_NAME);

        poolService.registChannelCallback([gmgn_pool.id.valueOf()])

    } catch (error) {
        console.error('操作失败:', error);
    }
}


main().catch(console.error);