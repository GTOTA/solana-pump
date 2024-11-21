import { TelegramListenerService } from "../src/services/telegram";
import { MessageData, RedisStreamProcessor } from "../src/services/message";
import { CHANNEL } from "../src/services/telegram/types";
import { CacheManager } from "../src/services/cache";
import { StringSession } from "telegram/sessions/StringSession";
import * as StringUtils from '../src/utils/StringUtils'

const fs = require('fs').promises;
const { createClient } = require('redis');

require('dotenv').config();

// 使用示例
async function main() {
    // 从 https://my.telegram.org 获取这些值
    const API_ID = parseInt(process.env.API_ID || '');
    const API_HASH = process.env.API_HASH;

    if (!API_ID || !API_HASH) {
        throw new Error('请在 .env 文件中配置 API_ID 和 API_HASH');
    }


    // 如果有已保存的会话
    let sessionString = '';
    try {
        sessionString = await fs.readFile('../src/res/session.txt', 'utf8');
    } catch (error) {
        // 文件不存在，使用空会话
    }

    const config = {
        apiId:API_ID,
        apiHash:API_HASH,
        session: new StringSession(sessionString) 
    }

    const client = TelegramListenerService.getInstance(config);
    

    try {
        // 连接并登录
        await client.connect({});
        // 获取频道消息
        //const channelUsername = '@Faster100x'; // 替换为实际的频道用户名
        const channelUsername = process.env.CHANNEL_USERNAME; // 替换为实际的频道用户名

        const messages = await client.getChannelMessages(channelUsername, 10);

        const channel_gm= await client.getEntity('@gmgnsignals')
        console.log(channel_gm)

        const redis_client = createClient({
            url: process.env.REDIS_URL || '',
            password: process.env.REDIS_PASSWORD || '',
        });

        try {
            await redis_client.connect();
        }catch (error) {
            console.error('操作失败:', error);
        } 

        const processor = new RedisStreamProcessor(
            redis_client,
            {
                batchSize: 10,
                blockingTimeout: 2000
            }
        );

        // 类型安全的事件处理
        processor.on('messageReceived', async (data: MessageData) => {
            console.log('Received message:', data);
        });
    
        processor.on('messageProcessed', (messageId: string) => {
            console.log('Processed message:', messageId);
        });
    
        processor.on('error', (error: Error) => {
            console.error('Error:', error);
        });
    
        // 初始化并开始处理
        await processor.initialize();
        await processor.startProcessing();
    
        const new_pool_channel = '-1002122751413'

        const channel = await client.getEntity(channelUsername);
       
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

        const token = StringUtils.parseAlertMessage(msg)

        await CacheManager.getInstance().cacheInfo(token['ca'] + 'text', token)

        //console.log('handle alertMessage:', msg); 

        const messageData: MessageData = {
            id: CHANNEL.ALERTPOOL_ID,
            msg: JSON.stringify(token),
            timestamp: (new Date()).toLocaleString()
        };

        await processor.addMessage(messageData);
    

        // 保持程序运行
        await new Promise(() => { });

    } catch (error) {
        console.error('程序运行出错:', error);
    } finally {
        // 程序退出时断开连接
        process.on('SIGINT', async () => {
            await client.disconnect();
            process.exit();
        });
    }
}

// 启动程序
main();