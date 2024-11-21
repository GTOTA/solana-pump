// example.ts
import { RedisStreamProcessor, MessageData } from '../src/services/message';
const { createClient } = require('redis');

require('dotenv').config();


async function main() {
    const client = createClient({
        url: process.env.REDIS_URL || '',
        password: process.env.REDIS_PASSWORD || '',
    });
    const processor = new RedisStreamProcessor(
        client,
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

    // 发送测试消息
    const messageData: MessageData = {
        type: 'user_action',
        id: '123',
        action: 'login',
        timestamp: (new Date()).toLocaleString()
    };
    
    await processor.addMessage(messageData);
}

main().catch(console.error);