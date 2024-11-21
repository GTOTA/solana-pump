// example.ts
import { RedisStreamProcessor, MessageData } from '../src/services/message';
import { TokenAnalysisService } from '../src/services/analysis';
import { CacheManager } from '../src/services/cache'
import { TelegramListenerService } from '../src/services/telegram';
import * as StringUtils from '../src/utils/StringUtils'
import { promises as fs } from 'fs';
import dotenv from 'dotenv';
import { CHANNEL } from '../src/services/telegram/types';
import { GMGNChannelService } from '../src/services/telegram/ChannelService';


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

    await testTelegramMessageData(processor)

    //await testMockMessageData(processor)

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

async function testTelegramMessageData(processor: RedisStreamProcessor) {

    const telegram_client = await getTelegramClient()
    try {
        await telegram_client.connect({});
        // 获取频道消息
        const channelUsername = '@Faster100x'; // 替换为实际的频道用户名
        //const channelUsername = process.env.CHANNEL_USERNAME; // 替换为实际的频道用户名

        const messages = await telegram_client.getChannelMessages(channelUsername, 10);

        const poolService = new GMGNChannelService(channelUsername, telegram_client, processor)

        const newpool = await telegram_client.getEntity(CHANNEL.GMSINAL_NAME);

        const alertpool = await telegram_client.getEntity(CHANNEL.PUMP_FULL_NAME);

        poolService.registChannelCallback([newpool.id.valueOf()])

    } catch (error) {
        console.error('操作失败:', error);
    }
}

async function testMockMessageData(processor: RedisStreamProcessor) {

    const telegram_client = await getTelegramClient()
    try {
        await telegram_client.connect({});
        // 获取频道消息
        //const channelUsername = '@Faster100x'; // 替换为实际的频道用户名
        //const channelUsername = process.env.CHANNEL_USERNAME; // 替换为实际的频道用户名

        //const messages = await telegram_client.getChannelMessages(channelUsername, 10);

        const new_pool_text ='momo (Momo)\n' +
        '\n' +
        '💊 NewPool新池子 (Pump)    Pump信号频道\n' +
        '🎲 CA: `6H9YAME9FjXRmCWBph7opjMcMEULvse2Hqon4C7zpump`\n' +
        '💧 LP: `7JxWAnYij41SD6U2rUyE7tPnr35Rd12Fq5rwvgA7z6q8`\n' +
        '\n' +
        '💲 Price: $0.0{4}8188    Chart看K线\n' +
        '🎯 Dex: Raydium\n' +
        '💡 MCP: $81880.79\n' +
        '💧 Liq池子: $33890.14 (79.01 SOL)\n' +
        '💰 Initial LP底池: 20.7%\n' +
        '\n' +
        '\n' +
        '👤 Renounced已弃权: ✅\n' +
        '👥 Top10 前10持仓: 34.01% ❌\n' +
        '🔥 烧池子: 100%%\n' +
        '\n' +
        '\n' +
        '👨🏻‍💻 Dev Wallet作者钱包: \n' +
        '- Balance SOL: 23.13574\n' +
        '- Balance USD: $4961.0023\n' +
        '  - 🟢 Rich Dev作者挺有钱\n' +
        '\n' +
        '🐦  Twitter | 💊  Pump\n' +
        '\n' +
        '🌈 NEW: Add BlueChip Index to identify high-growth tokens GMGN.AI'

        const heavey = '**💊Heavy Bought💊**\n' +
        '\n' +
        '**💵 ****5Gmr...JVnb**** Heavy Bought 15 SOL**\n' +
        '\n' +
        '**$LUNA**(Dubai Crown Prince New Dog)\n' +
        '`G748DbPu713PkumVJo4nXcXuyCTBYbhNQtMjjgzxpump`\n' +
        '\n' +
        '📈 5m | 1h | 6h: **210.05%** | **244.97%** | **24.1K%**\n' +
        '🎲 5m TXs/Vol: **969**/**$315.8K**\n' +
        '💡 MCP: **$1.7M**\n' +
        '💧 Liq: **485.05** **SOL** ($234.7K 🔥100%)\n' +
        '👥 Holder: **4466**\n' +
        '🕒 Open: **2h** **ago**\n' +
        '\n' +
        '✅ NoMint / ✅Blacklist / ✅Burnt\n' +
        '✅TOP 10: **13.86%**\n' +
        '\n' +
        '⏳ DEV: 🚨 Sell All\n' +
        '👨‍🍳 DEV Burnt烧币: -\n' +
        '\n' +
        'Backup BOT: US | 01 | 02 | 03 | 04\n' +
        '\n' +
        '🌏 Website | ✈️ Telegram\n' +
        '\n' +
        '🚀 **TIP:** Fast **SOL/Base/ETH** charts with GMGN.ai'

        // Example usage:
        const msg = `**💊💊Pump市值飙升 FDV Surge Alert**
        
        **FDV in 5 min 🟢+$13.3K(+216.9%)**
        **🚀 Status进度: 26.41%**
        
        **$GMS**(Global Meme Syndrome)
        \`7ra5yfLeqDAkjG6CEbQoc5TJwbAYg5gydBEpjRpwpump\`
        
        📈 5m | 1h | 6h: 222.9% | 222.9% | 211.9%
        🎲 5m TXs/Vol: 201/$26.4K
        💡 MCP: $19.7K
        💧 Liq: 25.14 SOL ($10.3K 🔥100%)
        👥 Holder: 87
        Renounced: '✅'
        🕒 Open: 4min ago
        
        ✅ NoMint / ✅Blacklist / ✅Burnt
        ✅TOP 10: 21.53%
        
        ⏳ DEV: 🚨 Sell All
        👨‍🍳 DEV Burnt烧币: -`;

        //telegram_client.sendMessages(msg_text)

        // new pool
        const token = StringUtils.parseAlertMessage(heavey)
        console.log(token)

        //console.log('handle alertMessage:', msg); 

        const messageData: MessageData = {
            id: CHANNEL.GMSINAL_ID,
            child: '1',
            msg: JSON.stringify(token),
            timestamp: (new Date()).toLocaleString()
        };

        await processor.addMessage(messageData);

    } catch (error) {
        console.error('操作失败:', error);
    }    
}


main().catch(console.error);