import fs from 'fs';
import { decryptKeypair } from "../src/services/transaction/keyPairManger";
import { TransactionService } from '../src/services/transaction';

async function main() {

    try {

        const keypair_json = JSON.parse(fs.readFileSync(process.env.KEY_PATH || '', 'utf-8'))
        const payer = await decryptKeypair(keypair_json, "0123456")

        const txService: TransactionService = new TransactionService(payer)

        const tip = parseFloat(process.env.JITO_TIP || "0");
        const buffTip = process.env.BUFF_TIP === 'True';


        const inputMint = 'So11111111111111111111111111111111111111112';
         //pump 内盘
        //const outMint = '2Jh7nSbzWdXsgUbfkNBhcxZBFP44va4ftjokMouzRKsN'
        // raydium 
        const outMint = 'BXaGRXdSw7mnhRXxEujZbkUntjBctvYPRVAyerJXpump'

        const inAmount = 0.0001

        const sellAmount = 728

        const res = await txService.buy(inputMint,outMint,inAmount,1,true,true)
        console.log(res)

        //const res2 = await txService.sell(outMint,inputMint,sellAmount,1,true,true)
        //console.log(res2)
    } catch (e) {
        console.log(e)
    }
    return
}

main().catch(console.error);