export interface CryptoAlert {
    [key: string]: string | undefined;
  }
// 类型定义
export interface ResponseTokenInfo {
    tokenData:{
        auditRisk:{
            mintDisabled: boolean;
            freezeDisabled: boolean;
            lpBurned: boolean;
            top10Holders: boolean;
        }
        tokenName: string;
        tokenSymbol: string;      
        score: number;
        address: string;
        deployTime: string;
        marketCap?: number;
    }

    tokenInfo: {
        price: string,
        supplyAmount: number,
        mktCap: number
    }

}