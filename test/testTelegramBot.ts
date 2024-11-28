import { Bot } from "grammy";

const dotenv = require('dotenv')
dotenv.config();

import { SocksProxyAgent } from "socks-proxy-agent";

const socksAgent = new SocksProxyAgent('socks5://127.0.0.1:1080');

const bot = new Bot(process.env.BOT2_TOKEN || '')

// const bot = new Bot(process.env.BOT2_TOKEN || '',{
//     client: {
//       baseFetchConfig: {
//         agent: socksAgent,
//       },
//     },
//   }); // <-- 把你的 bot token 放在 "" 之间 (https://t.me/BotFather)

const telegram_id = -1002321629379

// Example usage:
const exampleText = `**💊💊Pump市值飙升 FDV Surge Alert**

**FDV in 5 min 🟢+$13.3K(+216.9%)**
**🚀 Status进度: 26.41%**

**$GMS**(Global Meme Syndrome)
\`7ra5yfLeqDAkjG6CEbQoc5TJwbAYg5gydBEpjRpwpump\`

📈 5m | 1h | 6h: **222.9%** | **222.9%** | **211.9%**
🎲 5m TXs/Vol:**201**/**$26.4K*
💡 MCP: $19.7K
💧 Liq: 25.14 SOL ($10.3K 🔥100%)
👥 Holder: 87
 Renounced: '✅'
🕒 Open: 4min ago

✅ NoMint / ✅Blacklist / ✅Burnt
✅TOP 10: 21.53%

⏳ DEV: 🚨 Sell All
👨‍🍳 DEV Burnt烧币: -`;

async function testBotApi() {
    // 用"你好！"来回复任意信息
    bot.on("message", (ctx) => ctx.reply("你好！"));


    // 向用户 12345 发送一条消息。
    await bot.api.sendMessage(telegram_id, exampleText,{ parse_mode: "MarkdownV2" });
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
