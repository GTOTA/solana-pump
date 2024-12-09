import { GetStructureSchema, LiquidityPoolKeys, LiquidityStateV4 } from "@raydium-io/raydium-sdk";
import { Connection, PublicKey } from "@solana/web3.js";

// Importing necessary objects from the Raydium SDK
const {  
    LIQUIDITY_STATE_LAYOUT_V4,  // Layout for liquidity state in Raydium V4
    MARKET_STATE_LAYOUT_V3,     // Layout for market state in Raydium V3
    MAINNET_PROGRAM_ID          // Mainnet program IDs for different Raydium components
} = require('@raydium-io/raydium-sdk');

// Creating an asynchronous function to fetch market accounts based on the provided base and quote tokens
export const fetchMarketAccounts = async (connection, base, quote, commitment) => {
    try {
        //const rpc = 'https://mainnet.helius-rpc.com/?api-key=952a337e-eae9-49ba-836c-f7b98dc5ac29' //helius node enable getProgramAccounts,but cannot sumbit mutil txs by free plan 
        const rpc =  process.env.RPC_URL || ''
        console.log(rpc)
        connection = new Connection(rpc
          , { commitment: 'confirmed' })
        // Fetching program accounts from the blockchain using the connection object and the provided parameters
        const accounts = await connection.getProgramAccounts(
            MAINNET_PROGRAM_ID.AmmV4,  // Program ID for the Raydium AMM V4
            {
              commitment,  // The commitment level, determines how confirmed the data should be
              filters: [   // Filters to narrow down the search for relevant accounts
                { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },  // Filters by the size of the liquidity state layout
                {
                  memcmp: {  // Memory comparison filter to match the base mint
                    offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),  // Offset for the base mint in the layout
                    bytes: base.toBase58(),  // Convert the base mint to a base58 string
                  },
                },
                {
                  memcmp: {  // Memory comparison filter to match the quote mint
                    offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),  // Offset for the quote mint in the layout
                    bytes: quote.toBase58(),  // Convert the quote mint to a base58 string
                  },
                },
              ],
            }
        );
        
        // Mapping through the fetched accounts to decode the data and format it
        let rawData =  accounts.map(({ pubkey, account }) => ({
            id: pubkey.toString(),  // Convert the public key to a string
            data: LIQUIDITY_STATE_LAYOUT_V4.decode(account.data),  // Decode the account data using the liquidity state layout
        }));
        
        // Assuming only one relevant account is found, return the first object
        let obj = rawData[0];
        return obj;
    } catch (error) {
        // Catch any errors during the fetch process and log them
        console.log(`fetchMarketAccounts`, error);
    } 
}

// Function to get pool keys by providing the pool's AMM ID
export const getPoolKeysByPoolId = async (ammId, connection) => {
    console.log(`Getting pool keys for ${ammId}`);  // Log the pool ID being queried
    
    // Fetch the account information for the given AMM ID
    const ammAccount = await connection.getAccountInfo(new PublicKey(ammId));
    if (ammAccount) {  // If the AMM account exists
        // Decode the account data using the liquidity state layout
        const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(ammAccount.data);
        
        // Fetch the market account information based on the decoded market ID
        const marketAccount = await connection.getAccountInfo(poolState.marketId);
        if (marketAccount) {  // If the market account exists
            // Decode the market account data using the market state layout
            const marketState = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);
            
            // Calculate the market authority using the market state and the program ID
            const marketAuthority = PublicKey.createProgramAddressSync(
                [
                    marketState.ownAddress.toBuffer(),  // Convert market address to buffer
                    marketState.vaultSignerNonce.toArrayLike(Buffer, "le", 8),  // Convert nonce to buffer in little-endian format
                ],
                MAINNET_PROGRAM_ID.OPENBOOK_MARKET,  // Program ID for the OpenBook market
            );

            return createPoolKeys(new PublicKey(ammId), poolState, marketState)         
        }
    }
};

export function createPoolKeys(
    id: PublicKey,
    accountData: LiquidityStateV4,
    marketState: typeof MARKET_STATE_LAYOUT_V3 
  ): LiquidityPoolKeys {
    return {
      id,
      baseMint: accountData.baseMint,
      quoteMint: accountData.quoteMint,
      lpMint: accountData.lpMint,
      baseDecimals: accountData.baseDecimal.toNumber(),
      quoteDecimals: accountData.quoteDecimal.toNumber(),
      lpDecimals: 5,
      version: 4,
      programId: MAINNET_PROGRAM_ID.AmmV4,
      authority: new PublicKey(  // Predefined authority address
        "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
    ),
      openOrders: accountData.openOrders,
      targetOrders: accountData.targetOrders,
      baseVault: accountData.baseVault,
      quoteVault: accountData.quoteVault,
      marketVersion: 3,
      marketProgramId: accountData.marketProgramId,
      marketId: accountData.marketId,
      marketAuthority: PublicKey.createProgramAddressSync(
        [
            marketState.ownAddress.toBuffer(),  // Convert market address to buffer
            marketState.vaultSignerNonce.toArrayLike(Buffer, "le", 8),  // Convert nonce to buffer in little-endian format
        ],
        MAINNET_PROGRAM_ID.OPENBOOK_MARKET,  // Program ID for the OpenBook market
     ),
      marketBaseVault: accountData.baseVault,
      marketQuoteVault: accountData.quoteVault,
      marketBids: marketState.bids,
      marketAsks: marketState.asks,
      marketEventQueue: marketState.eventQueue,
      withdrawQueue: accountData.withdrawQueue,
      lpVault: accountData.lpVault,
      lookupTableAccount: PublicKey.default,
    };
  }

