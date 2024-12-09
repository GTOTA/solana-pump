import dotenv from 'dotenv';
import fs from 'fs';
import {
    Keypair,
    Connection,
    SystemProgram,
    PublicKey,
    Commitment,
    Transaction,
    TransactionMessage,
    VersionedTransaction,
    TransactionInstruction
} from '@solana/web3.js';
import bs58 from 'bs58';
import axios from "axios";
import * as StringUtils from '../../utils/StringUtils'
import { AnchorProvider, Program, Wallet, Idl, Provider } from "@coral-xyz/anchor";
import { createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { BN } from "bn.js";
import { struct, bool, u64, publicKey, Layout } from "@coral-xyz/borsh";
import { decryptKeypair } from './keyPairManger';
import { SwapExecutor, TransactionExecutor } from './Executor';


dotenv.config();



const JITO_BLOCK_ENGINE_URL = `${process.env.JITO_BLOCK_ENGINE_URL}/api/v1/bundles`;
const JITO_TIP_ACCOUNTS = [
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
    'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
    'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
    '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];

const ROUNDS = parseInt(process.env.ROUNDS || "1", 10);
const WAITING_TIME = parseInt(process.env.WAITING_TIME || "1", 10) * 1000;
const quoteUrl = process.env.QUOTE_URL || ''

const rpcUrl = process.env.RPC_URL || '';
const keyPath = process.env.KEY_PATH || '';
if (!rpcUrl) {
    throw new Error('Missing RPC_URL in .env file');
}
if (!keyPath) {
    throw new Error('Missing KEY_PATH in .env file');
}
const connection = new Connection(rpcUrl, 'confirmed');

export const GLOBAL_ACCOUNT_SEED = "global";
export const MINT_AUTHORITY_SEED = "mint-authority";
export const BONDING_CURVE_SEED = "bonding-curve";
export const METADATA_SEED = "metadata";

const API_HOST = 'https://gmgn.ai'

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 使用私钥创建Keypair
// const payer = Keypair.fromSecretKey(Uint8Array.from(
//     JSON.parse(fs.readFileSync(keyPath, 'utf-8'))
// ));

const GLOBAL_ACCOUNT_INSTRUCTION_LAYOUT = struct([
    u64("discriminator"),
    bool("initialized"),
    publicKey("authority"),
    publicKey("feeRecipient"),
    u64("initialVirtualTokenReserves"),
    u64("initialVirtualSolReserves"),
    u64("initialRealTokenReserves"),
    u64("tokenTotalSupply"),
    u64("feeBasisPoints"),
]);

const BONDING_CURVE_INSTRUCTION_LAYOUT = struct([
    u64("discriminator"),
    u64("virtualTokenReserves"),
    u64("virtualSolReserves"),
    u64("realTokenReserves"),
    u64("realSolReserves"),
    u64("tokenTotalSupply"),
    bool("complete"),
]);

export class PumpSwap  implements SwapExecutor  {
    public program: Program;
    public connection: Connection;
    public payer: Keypair;

    constructor(keypair?: Keypair) {
        console.log(`payer: ${keypair!.publicKey.toBase58()}`);
        this.payer = keypair!;
        const wallet = new Wallet(keypair!);
        this.connection = new Connection(rpcUrl, 'confirmed');
        const provider = new AnchorProvider(connection, wallet, {
            commitment: 'finalized',
        });
        const pumpIDL = JSON.parse(fs.readFileSync(StringUtils.PUMP_FILE, 'utf8')); // 此处需要IDL文件
        this.program = new Program(pumpIDL as Idl, provider);
    }

    async swap(inputMint: string, outputMint: string, inAmount: number,slippage:number) {
        
        const quote = await this.getQuoteByGmgn(inputMint, outputMint, inAmount,slippage)
        const outAmount = quote.data.outAmount

        const tx = await this.buildSwapTransaction(inputMint,outputMint,inAmount,outAmount)

        return tx   
    }

    async getQuoteByJupiter(inMint: string, outMint: string, inAmount: number) {
        const quote0Params = {
            inputMint: inMint,
            outputMint: outMint,
            amount: inAmount, // 10000000=0.01 WSOL
            onlyDirectRoutes: false,
            slippageBps: 100, //1%
            maxAccounts: 20,
        };
        const quote0Resp = await axios.get(quoteUrl, { params: quote0Params })
        return quote0Resp
    }

    async getQuoteByGmgn(inMint: string, outMint: string, inAmount: number,slippage:number) {
        const quote0Params = {
            token_in_address: inMint,
            token_out_address: outMint,
            in_amount: inAmount, // 10000000=0.01 WSOL
            from_address: this.payer.publicKey.toString(),
            slippage: slippage, //1%
        };
        const quoteUrl = `https://gmgn.ai/defi/router/v1/sol/tx/get_swap_route`
        const quote0Resp = await axios.get(quoteUrl, { params: quote0Params })
        return quote0Resp
    }


    async getGlobalAccount(commitment: Commitment = "finalized") {
        const [globalAccountPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from(GLOBAL_ACCOUNT_SEED)],
            new PublicKey(this.program.programId)
        );

        const tokenAccount = await connection.getAccountInfo(
            globalAccountPDA,
            commitment
        );

        return GLOBAL_ACCOUNT_INSTRUCTION_LAYOUT.decode(tokenAccount!.data);
    }



    async getBondingCurveAccount(
        mint: PublicKey,
        commitment: Commitment = "finalized"
    ) {
        const tokenAccount = await connection.getAccountInfo(
            this.getBondingCurvePDA(mint),
            commitment
        );
        if (!tokenAccount) {
            return null;
        }
        //console.log(tokenAccount)
        return BONDING_CURVE_INSTRUCTION_LAYOUT.decode(tokenAccount!.data);
    }


    getBondingCurvePDA(mint: PublicKey) {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(BONDING_CURVE_SEED), mint.toBuffer()],
            this.program.programId
        )[0];
    }


    async buildSwapTransaction(inMint: string, outMint: string, inAmount: number,outAmount:number): Promise<Transaction | VersionedTransaction>  {
        let ixs: TransactionInstruction[] = [];

        // 获取ATA
        const associatedUser = await getAssociatedTokenAddress(new PublicKey(outMint), this.payer.publicKey, false);
        // 添加ATA创建指令

        try {
            await getAccount(this.connection, associatedUser, "finalized");
        } catch (e) {
            const associationInstruction = createAssociatedTokenAccountInstruction(
                this.payer.publicKey,
                associatedUser,
                this.payer.publicKey,
                new PublicKey(outMint),
            )
            ixs.push(associationInstruction)
        }

        const bondingCurveAccount = await this.getBondingCurveAccount(
            new PublicKey(outMint)
        );
        if (!bondingCurveAccount) {
            throw new Error(`Bonding curve account not found: ${outMint}`);
        }

        const associatedBondingCurve = await getAssociatedTokenAddress(
            new PublicKey(outMint),
            this.getBondingCurvePDA(new PublicKey(outMint)),
            true
        );

        //console.log(associatedBondingCurve, associatedBondingCurve)

        const globalAccount = await this.getGlobalAccount("finalized");

        console.log(outAmount)
        const pumpSwapInstruction = await this.program.methods
            .buy(new BN(outAmount), new BN(inAmount.toString()))
            .accounts({
                feeRecipient: globalAccount.feeRecipient,
                mint: new PublicKey(outMint),
                associatedBondingCurve: associatedBondingCurve,
                associatedUser: associatedUser,
                user:  this.payer.publicKey,
            })
            .instruction()
        ixs.push(pumpSwapInstruction)
        return this.verifyTransaction(ixs)

    }

    async buildJitoTransaction(jitoTipAccount: string, tip: number, BUFF_TIP: boolean): Promise<TransactionInstruction[]> {

        let ixs: TransactionInstruction[] = [];

        ixs.push(
            SystemProgram.transfer({
                fromPubkey: this.payer.publicKey,
                toPubkey: new PublicKey(jitoTipAccount),
                lamports: tip,
            })
        );

        if (BUFF_TIP) {
            ixs.push(
                SystemProgram.transfer({
                    fromPubkey: this.payer.publicKey,
                    toPubkey: new PublicKey('buffaAJKmNLao65TDTUGq8oB9HgxkfPLGqPMFQapotJ'),
                    lamports: tip * 0.1,
                })
            );
        }

        return ixs
    }

    async verifyTransaction(ixs: TransactionInstruction[]) {
        const { blockhash } = await connection.getLatestBlockhash();
        const messageV0 = new TransactionMessage({
            payerKey: this.payer.publicKey,
            recentBlockhash: blockhash,
            instructions: ixs,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        transaction.sign([this.payer]);

        // simulate
        const simulationResult = await connection.simulateTransaction(transaction);
        console.log(JSON.stringify(simulationResult));

        return transaction
    }

    async sendRawTx(signedTransaction) {
        const { lastValidBlockHeight,blockhash } = await connection.getLatestBlockhash();

        // Send the transaction
        const signature = await this.connection.sendRawTransaction(
            signedTransaction.serialize()
        );

        const confirmation = await this.connection.confirmTransaction(
            {
              signature,
              lastValidBlockHeight: lastValidBlockHeight,
              blockhash: blockhash,
            },
            this.connection.commitment,
          );
        // Confirm the transaction

        console.log('Transaction successful!', {
            signature,
            confirmation
        });
    }

    async checkTxStatus(Txhash: string) {
        const { blockhash } = await connection.getLatestBlockhash();
        const statusUrl = `${API_HOST}/defi/router/v1/sol/tx/get_transaction_status?hash=${Txhash}&last_valid_height=${blockhash}`
        let status = await fetch(statusUrl)
        status = await status.json()
        console.log(status)
        // if (status && (status.data.success === true || status.data.expired === true))
        //   return true
    }

    async sendByGmgn(signedTx: string) {

        const sumbitData = {
            "signed_tx": signedTx,
            "from_address": this.payer.publicKey.toString()
        };
        const sumbitResp = await axios.post(`${API_HOST}/defi/router/v1/sol/tx/submit_signed_bundle_transaction`,
            sumbitData,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            })

        const result = sumbitResp.data.result;
        console.log(`Bundle sent, id: ${result}`);

        return result
    }


    async sendByJto(tx: string) {

        const start = Date.now();

        const currentSlot = await connection.getSlot();

        const bundleData = {
            jsonrpc: "2.0",
            id: 1,
            method: "sendBundle",
            params: [[tx]]
        };

        try {
            const bundleResp = await axios.post(JITO_BLOCK_ENGINE_URL, bundleData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log(bundleResp)
            const bundleId = bundleResp.data.result;
            console.log(`Bundle sent, id: ${bundleId}`);

            await wait(WAITING_TIME);

            const bundleStatusData = {
                jsonrpc: "2.0",
                id: 1,
                method: "getBundleStatuses",
                params: [[bundleId]]
            };

            const bundleStatusResp = await axios.post(JITO_BLOCK_ENGINE_URL, bundleStatusData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const bundle_id = bundleStatusResp.data.result
            console.log("sent to frankfurt, bundle result: ", bundle_id)

            if (bundleStatusResp.data.result.value && bundleStatusResp.data.result.value.length > 0) {
                const landingSlot = bundleStatusResp.data.result.value[0].slot;
                console.log(`Slot behind: ${landingSlot - currentSlot}`);
            } else {
                console.log('Landing failed');
            }

            // cal time cost
            const end = Date.now();
            const duration = end - start;

            console.log(`total duration: ${duration}ms`)

        } catch (error) {
            console.error("Error sending bundle or fetching status:", error);
        }
    }

}

async function main() {

    try {
        const keypair_json = JSON.parse(fs.readFileSync(keyPath, 'utf-8'))
        const payer = await decryptKeypair(keypair_json, "0123456")

        const pump: PumpSwap = new PumpSwap(payer)

        const balance = await connection.getBalance(payer.publicKey);
        console.log(`balance: ${balance} lamports`);

        const currentSlot = await connection.getSlot();
        console.log("Current Slot:", currentSlot);

        const randomIndex = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
        const jitoTipAccount = JITO_TIP_ACCOUNTS[randomIndex];

        const tip = parseFloat(process.env.JITO_TIP || "0");
        const buffTip = process.env.BUFF_TIP === 'True';


        const inputMint = 'So11111111111111111111111111111111111111112';
        const outMint = '2Jh7nSbzWdXsgUbfkNBhcxZBFP44va4ftjokMouzRKsN'

        const inAmount = 1000000

        //const tx = await pump.buildSwapTransaction(inputMint,outMint, inAmount)

        //const jito_ixs = ixs.concat(await pump.buildJitoTransaction(jitoTipAccount, tip, buffTip))

        
        //const versionTransaction = await pump.verifyTransaction(ixs)

        //await pump.sendRawTx(versionTransaction)

        //await pump.sendByJto(bs58.encode(tx.serialize()))

    } catch (e) {
        console.log(e)
    }

    return

}

//main().catch(console.error);


