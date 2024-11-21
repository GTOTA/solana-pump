import "dotenv/config";
const fs = require('fs').promises;


import { TelegramListenerService } from './services/telegram'

const path = require('path')
const SESSION_PATH = path.join(path.dirname(__dirname),'./src/res/session.txt') 

// 使用示例
async function main() {
    // 从 https://my.telegram.org 获取这些值
    const API_ID = parseInt(process.env.APP_ID || '');
    const API_HASH = process.env.API_HASH;

    if (!API_ID || !API_HASH) {
        throw new Error('请在 .env 文件中配置 API_ID 和 API_HASH');
    }


    // 如果有已保存的会话
    let sessionString = '';
    try {
        sessionString = await fs.readFile(SESSION_PATH, 'utf8');
    } catch (error) {
        // 文件不存在，使用空会话
    }

    const client = new TelegramListenerService(API_ID, API_HASH, sessionString);

    try {
        // 连接并登录
        await client.connect({});
        // 获取频道消息
        //const channelUsername = '@Faster100x'; // 替换为实际的频道用户名
        const channelUsername = process.env.CHANNEL_USERNAME; // 替换为实际的频道用户名

        const messages = await client.getChannelMessages(channelUsername, 10);

        // 保存消息
        await client.saveMessages(messages);

        // 监听新消息
        await client.watchNewMessages(channelUsername,{});

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
//main();