import { Bot, Context, GrammyError, HttpError, InlineKeyboard, Keyboard, session, SessionFlavor } from "grammy";
import { Keypair, SolanaJSONRPCError } from "@solana/web3.js";

import dotenv from 'dotenv';
import fs from 'fs';
import { decryptKeypair } from "../src/services/transaction/keyPairManger";


dotenv.config();

import { SocksProxyAgent } from "socks-proxy-agent";
import { TransactionService } from "../src/services/transaction";
import { CHANNEL } from "../src/services/telegram/types";

const socksAgent = new SocksProxyAgent('socks://127.0.0.1:1080');

// 定义我们的会话。
interface SessionData {
  ca: string;
}

// 对上下文类型进行修饰以包含会话。
type MyContext = Context & SessionFlavor<SessionData>;

const proxy =process.env.BOT_PROXY || 'false'

const bot = new Bot<MyContext>(process.env.BOT2_TOKEN || "", {
  client: {
    baseFetchConfig: {
      agent: proxy=='true'?socksAgent:null,
      compress: true,
    },
  },
});


// const bot = new Bot(process.env.BOT2_TOKEN || '', {
//     client: {
//         baseFetchConfig: {
//             agent: socksAgent,
//         },
//     },
// }); // <-- 把你的 bot token 放在 "" 之间 (https://t.me/BotFather)

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

const SOL_MINT = 'So11111111111111111111111111111111111111112';


const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');

const connection = new Connection(process.env.RPC_URL || '', 'confirmed');

async function getTokenBalance(
  rpcUrl,
  walletAddress,
  tokenMintAddress
) {
  try {
    // 创建 Solana 网络连接

    // 转换地址为 PublicKey
    const wallet = new PublicKey(walletAddress);
    const tokenMint = new PublicKey(tokenMintAddress);

    // 获取关联代币账户地址
    const associatedTokenAddress = await getAssociatedTokenAddress(
      tokenMint,  // 代币的合约地址
      wallet      // 钱包地址
    );

    // 获取代币账户信息
    const tokenAccountInfo = await connection.getTokenAccountBalance(
      associatedTokenAddress
    );

    // 返回余额（以最小单位表示）
    return {
      amount: tokenAccountInfo.value.amount,
      decimals: tokenAccountInfo.value.decimals,
      uiAmount: tokenAccountInfo.value.uiAmount
    };

  } catch (error) {
    console.error('获取代币余额时出错:', error);
    throw error;
  }
}

async function trade(inputToken: string, outToken: string, inAmout: number, slippage: number, isJto: boolean, direction: 'buy' | 'sell' = 'buy') {
  try {

    const keypair_json = JSON.parse(fs.readFileSync(process.env.KEY_PATH || '', 'utf-8'))
    const payer = await decryptKeypair(keypair_json, "0123456")
    const txService: TransactionService = new TransactionService(payer)
    const tip = parseFloat(process.env.JITO_TIP || "0");
    //const res = await txService.buy(inputMint,outMint,inAmount,1,true,true)
    //console.log(res)
    if (direction = 'sell') {
      const res = await txService.sell(inputToken, outToken, inAmout, slippage, isJto, true)
      return res
    }

  } catch (e) {
    console.log(e)
  }
  return
}

async function testBotApi() {
  const keypair_json = JSON.parse(fs.readFileSync(process.env.KEY_PATH || '', 'utf-8'))
  const payer = await decryptKeypair(keypair_json, "0123456")
  // 用"你好！"来回复任意信息
  // bot.on("message:text", (ctx) => {
  //     const text: string = ctx.msg.text;
  //     ctx.reply(text)
  // });
  // 构建一个 keyboard。
  // const inlineKeyboard = new InlineKeyboard().text("click", "click-payload");

  // // 和消息一起发送 keyboard。
  // bot.command("start", async (ctx) => {
  //     await ctx.reply("Curious? Click me!", { reply_markup: inlineKeyboard });
  // });

  // // 等待具有特定回调数据的点击事件。
  // bot.callbackQuery("click-payload", async (ctx) => {
  //     await ctx.answerCallbackQuery({
  //         text: "You were curious, indeed!",
  //     });
  // });

  bot.use(session({ initial: () => ({ ca: '' }) }));

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Could not contact Telegram:", e);
    } else {
      console.error("Unknown error:", e);
    }
  });



  bot.on("callback_query:data", async (ctx) => {
    console.log("button event with payload:", ctx.callbackQuery.data);
    const input = ctx.callbackQuery.data;
    const regex_buy = /^\d+\.?\d*/;
    const regex_sell = /^\d+\%/;

    try {
      if (input.match(regex_sell)) {
        const selltrade = async (input,ctx) => {  
          try {
            const balance = await getTokenBalance(process.env.RPC_URL || '', payer.publicKey.toString(),ctx.session.ca)
            const muti = Number(input.replace('%', '')) / 100;
            console.log(balance.uiAmount * muti)
            const res = await trade(ctx.session.ca, SOL_MINT, balance.uiAmount * muti, 1, true, 'sell')
            ctx.reply(JSON.stringify(res))
          }catch(e){
            if(e instanceof SolanaJSONRPCError) {
              await ctx.reply(e.message);   
              return    
            }
            console.log(e)
            await ctx.reply(e);  
          } 
        }
        selltrade(input, ctx)
      } else if (input.match(regex_buy)) {
        const buytrade = async (input) => {
          try {
            const res = await trade(SOL_MINT, ctx.session.ca, parseFloat(input), 1, true, 'buy')
            ctx.reply(JSON.stringify(res))
          }catch(e){
            console.log(e)
            await ctx.reply('buy trade error:'+e);  
          }     
        }
        buytrade(input)
      }

      await ctx.answerCallbackQuery({
        text: JSON.stringify('........trade is pending......'),
      });
    } catch (e) {     
      await ctx.answerCallbackQuery({
        text: `error happened: swap ${ctx.session.ca} <-> sol `,
      });
    }
  });


  bot.on("message:text", async (ctx) => {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    const text: string = ctx.msg.text.trim();
    if (!base58Regex.test(text)) {
      return;
    }
    ctx.session.ca = text
    console.log(text)
    const inlineKeyboard = new InlineKeyboard()
      .text(`buy `).row()
      .text("0.001 sol", `0.001`)
      .text("0.1 sol", "0.1")
      .text("0.2 sol·", "0.2")
      .text("0.5 sol", "0.5")
      .text("1 sol", "1").row()
      .text(`sell`).row()
      .text("10%", "10%")
      .text("20%", "20%")
      .text("50%", "50%")
      .text("80%", "80%")
      .text("100%", "100%");


    await ctx.reply('pump buy:' + text, {
      reply_markup: inlineKeyboard,
    });
  });

  // 获取有关 bot 本身的信息。
  const me = await bot.api.getMe();
  console.log(me)

  bot.start();



}

testBotApi();

