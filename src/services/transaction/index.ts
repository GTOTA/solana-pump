import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import { JitoTransactionExecutor } from "./JitoTransactionExecutor";
import { TransactionExecutor } from "./Executor";
import { PumpSwap } from "./PumpSwap";
import RaydiumSwap from "./RaydiumSwap";
import dotenv from 'dotenv';


dotenv.config()

export class TransactionService {

    public connection: Connection;
    public payer: Keypair;
    public txExecutor:TransactionExecutor
    /**
     * Create a TransactionService instance.
     * @param {Keypair} keypair - The private key of the wallet in base58 format.
     */
    constructor(keypair: Keypair) {
        this.payer = keypair
        this.connection = new Connection(process.env.RPC_URL || '', 'confirmed');
        this.txExecutor = new JitoTransactionExecutor(process.env.JITO_TIP || '', this.connection)
    }

    async buy(inputMint:string,outMint:string,inAmout:number,slippage:number,isJto:boolean,isRaydium:boolean) {

        try {
            if (inAmout == 0) {
                console.error({ mint: inputMint }, `Empty balance, can't sell`);
                return;
            }

            const start = Date.now();

            const swapExecutor =  isRaydium ? RaydiumSwap.getInstance(this.payer):new PumpSwap(this.payer)
    
            const tx = await swapExecutor.swap(inputMint, outMint,inAmout,slippage)
    
            const swap_end = Date.now();

            console.log(`swap total duration: ${swap_end-start}ms`)
   
            const txid = await this.connection.simulateTransaction(tx as VersionedTransaction)
    
            const simulate_end = Date.now();

            console.log(`simulate total duration: ${simulate_end-start}ms`)
            const blockhash  = await this.connection.getLatestBlockhash();
            //isJto or isWarp or default
            const result = await this.txExecutor.executeAndConfirm(tx as VersionedTransaction,this.payer,blockhash)

            if (result.confirmed) {
                console.log(
                  {
                    mint: inputMint,
                    signature: result.signature,
                    url: `https://solscan.io/tx/${result.signature}`,
                  },
                  `Confirmed buy tx`,
                );
            }

            const end = Date.now();

            const duration = end - start;

            console.log(`total duration: ${duration}ms`)

            return result
        }
        catch(e){
            console.error({ mint: inputMint, e }, `Failed to buy token`);
            throw e
        }    
    }

    async sell(inputMint:string,outMint:string,inAmout:number,slippage:number,isJto:boolean,isRaydium:boolean) {
        try{
            const start = Date.now();

            const swapExecutor =  isRaydium ? RaydiumSwap.getInstance(this.payer):new PumpSwap(this.payer)
    
            const tx = await swapExecutor.swap(inputMint, outMint,inAmout,slippage)
    
            const swap_end = Date.now();

            console.log(`swap total duration: ${swap_end-start}ms`)
   
            const txid = await this.connection.simulateTransaction(tx as VersionedTransaction)
    
            const simulate_end = Date.now();
            
            console.log(`simulate total ${txid} duration: ${simulate_end-start}ms`)
            const blockhash  = await this.connection.getLatestBlockhash();
            //isJto or isWarp or default
            const result = await this.txExecutor.executeAndConfirm(tx as VersionedTransaction,this.payer,blockhash)

            if (result.confirmed) {
                console.log(
                  {
                    mint: inputMint,
                    signature: result.signature,
                    url: `https://solscan.io/tx/${result.signature}`,
                  },
                  `Confirmed sell tx`,
                );
            }

            const end = Date.now();

            const duration = end - start;

            console.log(`total duration: ${duration}ms`)

            return result
        } catch(e){
            console.error({ mint: inputMint, e }, `Failed to sell token`);
            throw e
        }

    }

}

