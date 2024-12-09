import { Connection, Keypair, VersionedTransaction,LAMPORTS_PER_SOL } from '@solana/web3.js'
import fs from 'fs';
import bs58 from 'bs58';
import fetch from 'node-fetch'
import { Wallet } from '@coral-xyz/anchor';
import { decryptKeypair } from '../src/services/transaction/keyPairManger';
const inputToken = 'So11111111111111111111111111111111111111112'
const outputToken = '2Jh7nSbzWdXsgUbfkNBhcxZBFP44va4ftjokMouzRKsN'
const amount = '100000'
const slippage = 1
// GMGN API 域名
const API_HOST = 'https://gmgn.ai'

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {

  const keyPath = process.env.KEY_PATH || '';
  const keypair_json = JSON.parse(fs.readFileSync(keyPath, 'utf-8'))
  const payer = await decryptKeypair(keypair_json,'0123456')
  const wallet = new Wallet(payer)
  const fromAddress = wallet.publicKey.toString()
  console.log(`wallet address: ${wallet.publicKey.toString()}`)
  // 获取quote以及待签名交易
  const quoteUrl = `${API_HOST}/defi/router/v1/sol/tx/get_swap_route?token_in_address=${inputToken}&token_out_address=${outputToken}&in_amount=${amount}&from_address=${fromAddress}&slippage=${slippage}`
  let route = await fetch(quoteUrl)
  route = await route.json()
  console.log(route)
  // 签名交易
  const swapTransactionBuf = Buffer.from(route.data.raw_tx.swapTransaction, 'base64')
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf)
  transaction.sign([wallet.payer])
  const signedTx = Buffer.from(transaction.serialize()).toString('base64')
  console.log(signedTx)

  const rpcUrl = process.env.RPC_URL || '';
  const connection = new Connection(rpcUrl, 'confirmed');

   // simulate
   const simulationResult = await connection.simulateTransaction(transaction);
   console.log(JSON.stringify(simulationResult));

   return
//   // 提交交易
//   let res = await fetch(`${API_HOST}/defi/router/v1/sol/tx/submit_signed_transaction`,
//     {
//       method: 'POST',
//       headers: {'content-type': 'application/json'},
//       body: JSON.stringify(
//         {
//           "signed_tx": signedTx
//         }
//       )
//     })
 // 提交交易
    let res = await fetch(`${API_HOST}/defi/router/v1/sol/tx/submit_signed_bundle_transaction`,
    {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(
        {
          "signed_tx": signedTx,
          "from_address": fromAddress
        }
      )
    })
  res = await res.json()
  console.log(res)
  // 查询tx状态
  // 如果上链成功，则success返回true
  // 如果没上链，60秒就会返回expired=true
  while (true) {
    const hash =  res.data.hash
    const lastValidBlockHeight = route.data.raw_tx.lastValidBlockHeight
    const statusUrl = `${API_HOST}/defi/router/v1/sol/tx/get_transaction_status?hash=${hash}&last_valid_height=${lastValidBlockHeight}`
    let status = await fetch(statusUrl)
    status = await status.json()
    console.log(status)
    if (status && (status.data.success === true || status.data.expired === true))
      break
    await wait(1000)
  }
}
main()
