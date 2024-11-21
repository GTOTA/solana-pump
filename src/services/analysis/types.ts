
// 类型定义
export interface TokenInfo {
    ca: string;
    lp?: string;
    name?: string;
    symbol:string;
    price?: number;
    dev?:string;
    mcp?: string;
    initiallp?:string,
    lpburn?:string;
    honeypot?:boolean;
    lplock?:boolean;
    renounced?:boolean;
    nomint?: boolean,
    blacklist?: boolean,
    burnt?: boolean,
    liq?:string;
    createdAt: Date;
    holder?: string;
    devPercent?:string;
    top10?: string;
    rugProbability?: number;
    topHoldersDistribution?: Map<string, number>;
    teamHoldings?: number;
    twitterId?: string;
    pump5m?:string;
    pump1h?:string;
    pump6h?:string;
    txs?:string;
    txvol?:string; 
    open?:string; 
    status?:string;
    alert?:number;
    heavybought?:string;
    kolInflow?:string;
    kolBuySell?:string;
  }