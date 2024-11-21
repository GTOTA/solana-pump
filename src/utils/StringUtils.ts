import { CryptoAlert } from "./types";


// emoji 到布尔值的映射
const emojiMap: { [key: string]: boolean } = {
  '✅': true,
  '✓': true,
  '☑': true,
  '✔': true,
  '❌': false,
  '✗': false,
  '☒': false,
  '✘': false,
};

export function convertCurrencyStringToNumber(currencyStr: string): number {
  if(!currencyStr || currencyStr == undefined) return 0;
  // 移除所有空格和货币符号
  let str = currencyStr.replace(/[\s$]/g, '');
  
  // 获取数字部分
  let num = parseFloat(str.replace(/[K|M|B]/i, ''));
  
  // 根据后缀计算实际数值
  if (str.toUpperCase().includes('K')) {
      num *= 1000;
  } else if (str.toUpperCase().includes('M')) {
      num *= 1000000;
  } else if (str.toUpperCase().includes('B')) {
      num *= 1000000000;
  }
  
  return num;
}

function extractContractAddress(input: string): string | null {
  
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    
    if (base58Regex.test(input)) {
      return input.trim();
    }
  return null;
}

export function parseAlertMessage(text: string): CryptoAlert {
  console.log(text)
  // Split the text into lines
  const lines = text.split('\n');
  const result: CryptoAlert = {};

  // Regular expressions
  const emojiRegex = /[\u{23F3}]|[\u{1F680}-\u{1F6FF}]|[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1F300}-\u{1F3FF}]|[\u{1F400}-\u{1F4FF}]|[\u{1F500}-\u{1F5FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu;
  const chineseRegex = /[\u4e00-\u9fff]/g;

  lines.forEach(line => {
    // Skip empty lines
    if (!line.trim()) return;

    line = line.replace(/\*\*/g, '');

    if(line.startsWith('$')){
      const items = line.split('(').map(key => key.trim());
      result['symbol'] = items[0].substring(1,items[0].length)
      result['name'] = items[1].substring(0,items[1].length-1)
      return
    }

    const matches = line.match(/`([^`]+)`/)
    if(matches && matches[1]) {
      const ca = extractContractAddress(matches[1]) 
      if(ca) result['ca']=ca
      return
    }


    if(line.includes('💵')){
      const kol_pattern = /KOL Inflow净流入:\$[-\d.]+[KM]?\(([-\d]+\.\d+[KM]?) Sol\)/;
      const matches = line.match(kol_pattern)
      if(matches) {
        result['kolInflow'] = matches[1]
      }else {
        const key_items = line.split(' ').map(key => key.trim());
        result['heavybought'] = key_items[4]
      }
      return result
    }

    //**💳 KOL Buy/Sell:4/1**
    if(line.includes('💳')){
      const kol_pattern = /KOL Buy\/Sell:(\d+\/\d+)/;
      const matches = line.match(kol_pattern)
      if(matches) {
        result['kolBuySell'] = matches[1]
      }
      return result
    }

    // '📈 5m | 1h | 6h: **-10.05%** | **-44.97%** | **24.1K%**\n'
    if(line.includes('📈')) {
      const pattern = /(\d+\m) \| (\d+\h) \| (\d+\h): ([->\d.]+K?\%) \| ([->\d.]+K?\%) \| ([->\d.]+K?\%)/;
      const matches = line.match(pattern)
      if(matches && matches[4]) {
        result['pump'+matches[1]] = matches[4]
        result['pump'+matches[2]] = matches[5]   
        result['pump'+matches[3]] = matches[6]   
      }
      return result
    }

    //'🎲 5m TXs/Vol: **969**/**$315.8K**\n' 
    if( line.includes('🎲')) {
      const matches = line.match(/(\d+\m) TXs\/Vol: (\d+)\/\$(\d+\.?\d*\w?)/)
      if(matches && matches[2]) {
        result['txs'] = matches[2]
        result['txvol'] = matches[3]
      }   
      return result
    }

    if (line.includes('✅Burnt')) {
      const items = line.split('/').map(item => item.trim().replace(" ", ""));
      items.forEach(item => {
        const item_json = convertEmojiString(item)
        Object.assign(result, item_json);
      })
      return
    }
    //'💧 Liq: **4,340.64** **SOL** ($2.1M 🔥100%)\n'
    if(line.includes('💧')) {
      const pattern = /Liq: (\d+\,?\d+\.?\d*[KM]?) SOL \(\$(\d+\.?\d*[KM]?) \🔥(\d+\.?\d*\%)\)/;
      const matches = line.match(pattern) 
      if(matches && matches[2]){
        result['liq'] = matches[2]
        result['lpburn'] = matches[3]
      }
      return
    }

    // Look for colon separator
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return;
    }

    // Extract key and value
    let key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    // Clean up the key:
    // 1. Remove markdown formatting
    //key = key.replace(/\*\*/g, '');
    // 2. Remove emojis
    key = key.replace(emojiRegex, '');
    // 3. Remove Chinese characters
    key = key.replace(chineseRegex, '');
    // 4. Trim again and remove any remaining whitespace
    key = key.toLowerCase().trim().replace(' ','')

    // Clean up the value:
    // 1. Remove markdown formatting
    //value = value.replace(/\*\*/g, '');
    // 2. Remove Chinese characters
    value = value.replace(chineseRegex, '');
    
    if (emojiMap[value[1]] != undefined) {
      value = emojiMap[value[1]] + ''
    }

    value = value.replace(emojiRegex, '').trim();


    if(key == '‍dev burnt' || key == 'backupbot' || key == 'new' || key == '️tip') return
    // Store in result object if key is not empty after cleaning
    if (key && value) {
      result[key] = value;
    }
  });

  return result;
}

/**
 * 将文本转换为驼峰命名
 * @param text - 输入文本
 * @returns 驼峰命名的文本
 */
export function toCamelCase(text: string): string {
  return text
    .replace(/[\s-_]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase())
    .replace(/\s+/g, '');
}

export function percentToDecimal(percentStr: string): number {
  // 移除 '%' 并转换为数字，然后除以 100
  if(!percentStr || percentStr ==  undefined) return 0
  return Number(percentStr.replace('%', '')) / 100;
}

function convertNumber(str: string): string {
  // 检查输入是否为空
  if (!str) {
    throw new Error('Input string cannot be empty');
  }

  const match = str.match(/\{(\d+)\}/);
  
  if (!match) {
    return str;
  }

  const count = parseInt(match[1]);
  
  // 检查重复次数是否为有效数字
  if (isNaN(count) || count < 0) {
    throw new Error('Invalid repeat count');
  }

  const charIndex = match.index as number - 1
  
  // 检查要重复的字符是否存在
  if (charIndex < 0) {
    throw new Error('No character to repeat');
  }

  const char = str[charIndex];
  const repeated = char.repeat(count);
  
  return str.replace(`${char}{${count}}`, repeated);
}

/**
* 将带 emoji 前缀的字符串转换为 key-value 对象
* @param input - 输入的字符串，格式如 "✅Burnt"
* @returns 转换后的对象
*/
export function convertEmojiString(input: string): { [key: string]: boolean } {
  // 提取 emoji 和文本
  const emojiMatch = input.match(/^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{2B00}-\u{2BFF}]|[\u{2300}-\u{23FF}]|[\u{FE00}-\u{FEFF}]|.)/u);

  if (!emojiMatch) {
    throw new Error('No emoji found at the start of string');
  }

  const emoji = emojiMatch[0];
  const key = input.slice(emoji.length).toLowerCase();

  const value = emojiMap[emoji];

  if (typeof value === 'undefined') {
    throw new Error('Unsupported emoji');
  }

  return { [key]: value };
}

// 简单的单元测试
function test() {
  console.assert(
    JSON.stringify(convertEmojiString('✅Burnt')) === JSON.stringify({ burnt: true }),
    'Test 1 failed'
  );

  console.assert(
    JSON.stringify(convertEmojiString('❌Burnt')) === JSON.stringify({ burnt: false }),
    'Test 2 failed'
  );

  console.assert(
    JSON.stringify(convertEmojiString('✅Done')) === JSON.stringify({ done: true }),
    'Test 3 failed'
  );

  console.log('All tests passed!');
}

//test();  

const path = require('path')
export const SESSION_PATH = require('path').join(path.dirname(__dirname), './res/session.txt')


const kol_buy = `** 3 KOL Buy ****$MIKU****!**
🟢🟢🟢

**💵 KOL Inflow净流入:$-434.6119K(1.8325K Sol) **
**💳 KOL Buy/Sell:4/1**

**$$MIKU**(HATSUNE MIKU)
\`C89bsKbhbJyoY6ssu4m1oX1dwRvJngNc6nV2Q6tBpump\`

📈 5m | 1h | 6h: **35.34%** | **-47.86%** | **11.4K%**
🎲 5m TXs/Vol: **283**/**$115.6K**
💡 MCP: **$2.1M**
💧 Liq: **161.99** **SOL** ($80K 🔥97.34%)
👥 Holder: **3319**
🕒 Open: **2d** **ago**

✅ NoMint / ✅Blacklist / ✅Burnt
✅TOP 10: **15.03%**

⏳ DEV: 🚨 Sell All
👨‍🍳 DEV Burnt烧币: -

Backup BOT: US | 01 | 02 | 03 | 04

🌏 Website 

nostaIgicgareth (🎲, 🎲) **3s ago**
📈Cost **$0.00223** B/S:**1**/**0**
⏳Holding **$140.1303**(**0.59084 Sol**) 

尚韵 **1h ago**
📈Cost **$0.00193** B/S:**1**/**0**
⏳Holding **$520.6475**(**2.1952 Sol**) 

Jenny ai🖤 **2d ago**
📈Cost **$0.00004** B/S:**2**/**1**
⏳Holding **$0.00143**(**0.0{5}60485 Sol**) 

More

⚡️ **TIP:** Discover **faster**, Trading **in seconds** GMGN.ai`

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

const heavy_bought = '**💊Heavy Bought💊**\n' +
    '\n' +
    '**💵 ****7jjw...cAC2**** Heavy Bought 17.76 SOL**\n' +
    '\n' +
    '**$ELIZA**(Eliza)\n' +
    '`5voS9evDjxF589WuEub5i4ti7FWQmZCsAsyD5ucbuRqM`\n' +
    '\n' +
    '📈 5m | 1h | 6h: **11.95%** | **-16.6%** | **>99999%**\n' +
    '🎲 5m TXs/Vol: **1274**/**$1.3M**\n' +
    '💡 MCP: **$72.6M**\n' +
    '💧 Liq: **161.99** **SOL** ($80K 🔥97.34%)\n' +
    '👥 Holder: **10967**\n' +
    '🕒 Open: **5h** **ago**\n' +
    '\n' +
    '✅ NoMint / ✅Blacklist / ✅Burnt\n' +
    '❌TOP 10: **35.9%**\n' +
    '\n' +
    '⏳ DEV: 🚨 Sell All\n' +
    '👨‍🍳 DEV Burnt烧币: -\n' +
    '\n' +
    'Backup BOT: US | 01 | 02 | 03 | 04\n' +
    '\n' +
    '🌏 Website \n' +
    '\n' +
    '📢 **NEW:** Quickly **Auto-sell** Sol Meme on GMGN.ai'

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

// const parsed = parseAlertMessage(kol_buy);
// console.log(parsed);

const alert_msg = parseAlertMessage(heavy_bought)
console.log(alert_msg);
