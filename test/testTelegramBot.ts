import { Bot } from "grammy";

const dotenv = require('dotenv')
dotenv.config();

import { SocksProxyAgent } from "socks-proxy-agent";

const socksAgent = new SocksProxyAgent('socks5://127.0.0.1:1080');

const bot = new Bot(process.env.BOT_TOKEN || '',{
    client: {
      baseFetchConfig: {
        agent: socksAgent,
        compress: true,
      },
    },
  }); // <-- 把你的 bot token 放在 "" 之间 (https://t.me/BotFather)

const telegram_id = 7879129531

async function testBotApi() {
    // 用"你好！"来回复任意信息
    bot.on("message", (ctx) => ctx.reply("你好！"));


    // // 向用户 12345 发送一条消息。
    // await bot.api.sendMessage(telegram_id, "Hi!");
    // // 你也可以选择性地传入一个选项对象。
    // await bot.api.sendMessage(telegram_id, "Hi!", {/* 其他选项 */ });
    // // 检查已发送消息的消息对象。
    // const message = await bot.api.sendMessage(telegram_id, "Hi!");
    // console.log(message.message_id);

    // 获取有关 bot 本身的信息。
    const me = await bot.api.getMe();
    console.log(me)

    bot.start();



}

testBotApi();
