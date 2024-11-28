import { RedisStreamProcessor, MessageData } from '../message'
import { CacheManager } from '../cache'
import { TelegramListenerService } from '../telegram/'
import { TokenInfoRepository } from '../repository'
import { TokenInfo } from './types';
import { CHANNEL } from '../telegram/types';
import * as StringUtils from '../../utils/StringUtils'



// 消息处理服务
export class TokenAnalysisService {
  constructor(
    private readonly msgProcessor: RedisStreamProcessor,
    private readonly cacheManager: CacheManager,
  ) {
    cacheManager = CacheManager.getInstance()
  }

  async subscribe() {
    this.msgProcessor.on('messageReceived', async (data: MessageData) => {
      //console.log('Received message:', data); 
      this.parseMessage(data)
    });

    this.msgProcessor.on('error', (error: Error) => {
      console.error('MessageProcessorService Error:', error);
    });
  }


  private async parseMessage(message: any) {
    //console.log('analysis parseMessage message:', message.id, message.child,message.msg);
    if (!message.msg) return

    const token_info = JSON.parse(message.msg)
    var token = await this.cacheManager.getInfo(token_info.ca)
    var tokenInfo 
    if (token) {
      tokenInfo = JSON.parse(token) // Parse the string into an object
      Object.keys(token_info).forEach(key => {
        if (token_info[key] !== null && token_info[key] !== undefined) {
          tokenInfo[key] = token_info[key];
        }
      })
    }else {
      tokenInfo = token_info
    }
    console.log(tokenInfo)

    if (this.analyzeTokenInfo(message.id,message.child,tokenInfo)) {
      console.log("it is time to buy token:", tokenInfo.symbol)
      tokenInfo.alert = tokenInfo.alert == undefined ? 1 : ++tokenInfo.alert
      this.cacheManager.cacheInfo(tokenInfo.ca, tokenInfo)

      if (message.id == CHANNEL.ALERTPOOL_ID) {
        const alert_text = `**💊💊Pump市值飙升 FDV Surge Alert**
        **🤤这是第${tokenInfo.alert}次提醒⏰ **
       
        **${tokenInfo.symbol}**(${tokenInfo.name})
        \`${tokenInfo.ca}\`

        💲 Price: ${tokenInfo.price}   [chart看K线](https://gmgn.ai/sol/token/${tokenInfo.ca})
        📈 5m | 1h | 6h: **${tokenInfo.pump5m}** | **${tokenInfo.pump1h}** | **${tokenInfo.pump6h}**
        🎲 5m TXs/Vol:**${tokenInfo.txs}**/**${tokenInfo.txvol}*
        💡 MCP: $${tokenInfo.mcp}
        💧 Liq: $${tokenInfo.liq}
        👥 Holder: ${tokenInfo.holder}
         Renounced: ${tokenInfo.renounced}
        🕒 Open: ${tokenInfo.open}
        
        ${tokenInfo.nomint} NoMint / ${tokenInfo.blacklist}  Blacklist / ${tokenInfo.burnt}Burnt
        ✅TOP 10: ${tokenInfo.top10}
        
        ⏳ DEV: ${tokenInfo.dev}`;
        TelegramListenerService.getInstance().sendMessages(alert_text)
      } else if (message.id == CHANNEL.NEWPOOL_ID) {
        const new_pool_text = `**${tokenInfo.symbol}**(${tokenInfo.name})**
        **💊 NewPool新池子 (Pump)    Pump信号频道**
        🎲 CA: ${tokenInfo.ca}
        💧 LP: ${tokenInfo.lp} 

        💲 Price: ${tokenInfo.price}    [chart看K线](https://gmgn.ai/sol/token/${tokenInfo.ca})
        💡 MCP: $${tokenInfo.mcp} 
        💧 Liq池子: $${tokenInfo.liq}
        💰 Initial LP底池: ${tokenInfo.initiallp}
        👤 Renounced已弃权: ${tokenInfo.renounced}
        👥 Top10 前10持仓:  ${tokenInfo.top10}
        🔥 烧池子:  ${tokenInfo.lpburn}`
        TelegramListenerService.getInstance().sendMessages(new_pool_text)
      } else if (message.id == CHANNEL.GMSINAL_ID) {
        if(tokenInfo.kolInflow == undefined) {
          tokenInfo.kolInflow = 0
          tokenInfo.kolBuySell = 0
        }
        if(tokenInfo.heavybought == undefined) {
          tokenInfo.heavybought = 0
        }
        if(tokenInfo.price == undefined) {
          tokenInfo.price = 0
        }
        const alert_text = `**💊Heavy Bought ${tokenInfo.heavybought} SOL💊**
        **🤤这是第${tokenInfo.alert}次提醒⏰ **
        **💳 KOL inflow: ${tokenInfo.kolInflow} SOL**
        **💳 KOL Buy/Sell: ${tokenInfo.kolBuySell}**
        
        **${tokenInfo.symbol}**(${tokenInfo.name})
        \`${tokenInfo.ca}\`

        💲 Price: ${tokenInfo.price}   [chart看K线](https://gmgn.ai/sol/token/${tokenInfo.ca})
        📈 5m | 1h | 6h: **${tokenInfo.pump5m}** | **${tokenInfo.pump1h}** | **${tokenInfo.pump6h}**
        🎲 5m TXs/Vol:**${tokenInfo.txs}**/**${tokenInfo.txvol}*
        💡 MCP: $${tokenInfo.mcp}
        💧 Liq: $${tokenInfo.liq}
        👥 Holder: ${tokenInfo.holder}
        🕒 Open: ${tokenInfo.open}
        
        NoMint: ${tokenInfo.nomint} / Blacklist: ${tokenInfo.blacklist} / Burnt:${tokenInfo.burnt} 
        ✅TOP 10: ${tokenInfo.top10}
        
        ⏳ DEV: ${tokenInfo.dev}`;
        TelegramListenerService.getInstance().sendMessages(alert_text)
      }

    }
  }

  private analyzeTokenInfo(channel: string,child:string, tokenInfo: TokenInfo): boolean {
    // 根据tokeninfo中的属性判断分析是否可以购买
    // 这里是一个简单的示例逻辑
    if (channel == CHANNEL.NEWPOOL_ID) {
      console.log(
        tokenInfo.price,
        tokenInfo.renounced,
        tokenInfo.mcp,
        StringUtils.percentToDecimal(tokenInfo.initiallp as string),
        StringUtils.percentToDecimal(tokenInfo.top10 as string)
      )
      return tokenInfo.renounced as boolean
        && StringUtils.percentToDecimal(tokenInfo.initiallp as string) > 0.2
        && StringUtils.percentToDecimal(tokenInfo.top10 as string) < 0.4

    } else if (channel == CHANNEL.ALERTPOOL_ID) {
      console.log(
        tokenInfo.price,
        tokenInfo.renounced,
        tokenInfo.mcp,
        tokenInfo.holder,
        tokenInfo.txs,
        tokenInfo.txvol,
        StringUtils.percentToDecimal(tokenInfo.pump5m as string),
        StringUtils.percentToDecimal(tokenInfo.top10 as string),
      )

      const result: boolean = StringUtils.percentToDecimal(tokenInfo.pump5m as string) > 2
        && StringUtils.percentToDecimal(tokenInfo.top10 as string) < 0.3
        && tokenInfo.blacklist as boolean
        && tokenInfo.nomint as boolean
        && tokenInfo.burnt as boolean
      return result
    } else if(channel == CHANNEL.GMSINAL_ID && child == CHANNEL.HEAVYBOUGHT_ID) {
      console.log(
        tokenInfo.heavybought,
        tokenInfo.symbol,
        tokenInfo.liq,
        tokenInfo.lpburn,
        tokenInfo.mcp,
        tokenInfo.holder,
        tokenInfo.txs,
        tokenInfo.txvol,
        StringUtils.percentToDecimal(tokenInfo.pump5m as string),
        StringUtils.percentToDecimal(tokenInfo.top10 as string),
      )

      const result: boolean = StringUtils.percentToDecimal(tokenInfo.pump5m as string) > 1
        && StringUtils.percentToDecimal(tokenInfo.top10 as string) < 0.3
        && StringUtils.percentToDecimal(tokenInfo.lpburn as string) == 1
        && parseInt(tokenInfo.holder as string) > 50
        && parseInt(tokenInfo.txs as string) > 100
        && parseFloat(tokenInfo.heavybought as string) >= 10
        && StringUtils.convertCurrencyStringToNumber(tokenInfo.txvol as string) > 10000
        && StringUtils.convertCurrencyStringToNumber(tokenInfo.mcp as string) > 50000
        && tokenInfo.blacklist as boolean
        && tokenInfo.nomint as boolean
        && tokenInfo.burnt as boolean
      return result
    }if(channel == CHANNEL.GMSINAL_ID && child == CHANNEL.KOLBUY_ID) {
      console.log(
        tokenInfo.kolBuySell,
        tokenInfo.kolInflow,
        tokenInfo.mcp,
        tokenInfo.holder,
        tokenInfo.txs,
        tokenInfo.txvol,
        StringUtils.percentToDecimal(tokenInfo.pump5m as string),
        StringUtils.percentToDecimal(tokenInfo.top10 as string),
      )

      const result: boolean = StringUtils.percentToDecimal(tokenInfo.pump5m as string) > 1
        && StringUtils.percentToDecimal(tokenInfo.top10 as string) < 0.3
        && parseInt(tokenInfo.holder as string) > 100
        && parseInt(tokenInfo.txs as string) > 200
        && StringUtils.convertCurrencyStringToNumber(tokenInfo.txvol as string) > 100000
        && StringUtils.convertCurrencyStringToNumber(tokenInfo.mcp as string) > 100000
        && parseFloat(tokenInfo.kolInflow as string) > 2

      return result
    }
    return false
  }
  

}