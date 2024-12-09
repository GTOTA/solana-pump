import input from 'input';
import dotenv from 'dotenv';

const { Keypair } = require('@solana/web3.js');
const solana_crypto = require('crypto');
const fs = require('fs');
const bip39 = require('bip39');
const bs58 = require('bs58');
const ed25519 = require('ed25519-hd-key');

dotenv.config();


async function encryptKeypair(keypair,password) {
    // 生成随机的盐值
    const salt = solana_crypto.randomBytes(32);

    // 使用 PBKDF2 生成密钥
    const key = solana_crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

    // 生成随机的初始化向量
    const iv = solana_crypto.randomBytes(16);

    // 创建加密器
    const cipher = solana_crypto.createCipheriv('aes-256-gcm', key, iv);

    // 转换私钥为 Buffer
    const privateKeyData = Buffer.from(keypair.secretKey);

    // 加密数据
    let encryptedData = cipher.update(privateKeyData);
    encryptedData = Buffer.concat([encryptedData, cipher.final()]);

    // 获取认证标签
    const authTag = cipher.getAuthTag();

    // 创建 keystore 对象
    const keystore = {
        version: 1,
        address: keypair.publicKey.toString(),
        crypto: {
            cipher: 'aes-256-gcm',
            ciphertext: encryptedData.toString('hex'),
            cipherparams: {
                iv: iv.toString('hex')
            },
            kdf: 'pbkdf2',
            kdfparams: {
                dkLen: 32,
                salt: salt.toString('hex'),
                c: 100000,
                prf: 'hmac-sha256'
            },
            mac: authTag.toString('hex')
        }
    };

    return keystore;
}

export async function decryptKeypair(keystoreJson,passWord?:string) {

    let password=passWord
    if(passWord == null)
      password = await input.text("decryptKeypair password ?")

    // 从 keystore 获取必要参数
    const salt = Buffer.from(keystoreJson.crypto.kdfparams.salt, 'hex');
    const iv = Buffer.from(keystoreJson.crypto.cipherparams.iv, 'hex');
    const ciphertext = Buffer.from(keystoreJson.crypto.ciphertext, 'hex');
    const mac = Buffer.from(keystoreJson.crypto.mac, 'hex');

    // 重新生成密钥
    const key = solana_crypto.pbkdf2Sync(
        password,
        salt,
        keystoreJson.crypto.kdfparams.c,
        keystoreJson.crypto.kdfparams.dkLen,
        'sha256'
    );

    // 创建解密器
    const decipher = solana_crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(mac);

    // 解密数据
    let privateKey = decipher.update(ciphertext);
    privateKey = Buffer.concat([privateKey, decipher.final()]);

    return Keypair.fromSecretKey(privateKey);
}

export async function generateKeyPair(){
    // 使用示例:
    try {
        // 生成新的密钥对
        // 生成新的助记词 (12个单词)
        const mnemonic = bip39.generateMnemonic();

        // 从助记词派生种子
        const seed = bip39.mnemonicToSeedSync(mnemonic);

        // 派生ED25519密钥对
        const derivationPath = "m/44'/501'/0'/0'";
        const derivedSeed = ed25519.derivePath(derivationPath, seed.toString('hex')).key;

        // 创建Solana密钥对
        const keypair = Keypair.fromSeed(derivedSeed);

        console.log('助记词:', mnemonic);
        console.log('公钥:', keypair.publicKey.toBase58());
        //console.log('公钥:', Buffer.from(keypair.secretKey).toString('hex'));
        //const keypair = Keypair.generate();
        // 加密密钥对
        const password = await input.text("keypair password ?")
        const keystore = await encryptKeypair(keypair, password);

        // 保存 keystore 文件
        fs.writeFileSync(
            'encrypted-wallet.json',
            JSON.stringify(keystore, null, 2)
        );

        console.log('Keystore file created successfully');
        console.log('Public key:', keypair.publicKey.toString());

        // 演示如何解密
        const loadedKeystore = JSON.parse(
            fs.readFileSync('encrypted-wallet.json', 'utf8')
        );
        const decryptedKeypair = await decryptKeypair(loadedKeystore);

        console.log('Successfully decrypted keystore ', keypair.publicKey.toString());
        console.log('Public key matches:',
            keypair.publicKey.toString() === decryptedKeypair.publicKey.toString());

    } catch (error) {
        console.error('Error:', error);
    }
}

async function main() {
    // 使用示例:
    try {
        const loadedKeystore = JSON.parse(
            fs.readFileSync(process.env.KEY_PATH, 'utf8')
        );
        const keypair = await decryptKeypair(loadedKeystore,'0123456')
        console.log(Buffer.from(keypair.secretKey).toString('base64') ) 
    } catch (error) {
        console.error('Error:', error);
    }
}

//main()