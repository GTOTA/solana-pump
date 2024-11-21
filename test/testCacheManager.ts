import { TokenInfo } from '../src/services/analysis/types';
import { CacheManager } from '../src/services/cache'
// 使用示例
async function example() {
    
    try {
     
        // 存储数据
        await CacheManager.getInstance().cacheInfo('testKey', 'testValue');
        
        // 获取数据
        const value = await CacheManager.getInstance().getInfo('testKey');
        console.log('cache get testkey:', value);

        const tokenInfo:TokenInfo= {
            name : 'TEST',
            symbol: 'TEST',
            price : 0.0001,
            ca:'0x889djdkdiepump',
            lp:'d0000ddd',
            mcp : 123333,
            lpburn :'100%',
            honeypot : false,
            lplock : true,
            renounced : true,
            vol24h : 1233333,
            createdAt : new Date(),
            holder : 1233,
            top10 : '10%',
            rugProbability : 0.95
          }  

          await CacheManager.getInstance().cacheInfo(tokenInfo.ca, tokenInfo);

          const token_value = await CacheManager.getInstance().getInfo(tokenInfo.ca);
          console.log('get info:', token_value);

       
    } catch (error) {
        console.error('操作失败:', error);
    } finally {
    }
}


example();