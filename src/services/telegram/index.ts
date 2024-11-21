import { Api,TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import * as StringUtils from '../../utils/StringUtils';

import input from 'input'; 
import fs from 'fs/promises'
import { CHANNEL } from './types';


require('dotenv').config();

export class TelegramListenerService {

    private channels: Map<string, any> = new Map();

    private apiId:number;
    private apiHash:string;
    private session:StringSession;
    private client:TelegramClient;
    private static instance:TelegramListenerService;

    private constructor(config?) {
        this.apiId = config.apiId;
        this.apiHash =config.apiHash;
        this.session = new StringSession(config.session);
        this.client = new TelegramClient(this.session, this.apiId, this.apiHash, {})
    }

    public static getInstance(config?): TelegramListenerService {
        if (!TelegramListenerService.instance) {
            TelegramListenerService.instance = new TelegramListenerService(config);
        }
        return TelegramListenerService.instance;
    }


    /**
     * Initialize and login to the client
     */
    async connect(config) {
        try {
            // Create client instance
            this.client = new TelegramClient(this.session, this.apiId, this.apiHash, {
                connectionRetries: 5,
                proxy:{socksType:5,ip:'127.0.0.1',port :1080}
            });

            // Connect to Telegram server
            await this.client.connect();

            // Login if not already authorized
            if (!await this.client.checkAuthorization()) {
                
                // Login using verification code
                await this.client.start({
                    phoneNumber: async () => await input.text("number ?"),
                    password: async () => await input.text("password?"),
                    phoneCode: async () => await input.text("Code ?"),
                    onError: (err) => console.log(err),
                });              
            }

            // Save session string
            const sessionString = this.client.session.save();
            await fs.writeFile(StringUtils.SESSION_PATH, sessionString+'');
            console.log('Login successful! Session saved to session.txt');

            return true;
        } catch (error) {
            console.error('Connection or login failed:', error);
            throw error;
        }
    }

    /**
     * Get channel messages
     * @param {string} channelUsername - Channel username
     * @param {number} limit - Number of messages to retrieve
     */
    async getChannelMessages(channelUsername, limit = 100) {
        try {
            // Get channel information
            const channel = await this.client.getEntity(channelUsername);

            // Get messages
            const messages = await this.client.getMessages(channel, {
                limit: limit,
            });


            // Format messages
            const formattedMessages = messages.map(msg => ({
                id: msg.id,
                date: msg.date.toString(),
                text: msg.text,
                views: msg.views,
                forwards: msg.forwards,
                mediaType: msg.media ? msg.media.className : null,
                replyTo: msg.replyTo ? msg.replyTo.replyToMsgId : null,
                reactions: msg.reactions ? msg.reactions.results : [],
            }));

            return formattedMessages;

        } catch (error) {
            console.error('Failed to get messages:', error);
            throw error;
        }
    }

    async sendMessages(text) {
        console.log("sendmessg" ,text)
        this.client.sendMessage(CHANNEL.DOG, {message: text})   
    }

    async getEntity(channelUsername) {
        return await this.client.getEntity(channelUsername);
    }
    /**
     * Save messages to file
     */
    async saveMessages(messages, filename = 'messages.json') {
        try {
            await fs.writeFile(
                filename,
                JSON.stringify(messages, null, 2),
                'utf8'
            );
            console.log(`Messages saved to ${filename}`);
        } catch (error) {
            console.error('Failed to save messages:', error);
            throw error;
        }
    }

    /**
     * Watch for new messages
     * @param {string} chatIds - Channel ids
     */
    async watchNewMessages(chatIds:number[], handleNewMessage) {
        try {
            // Get channel information
            //const channel = await this.client.getEntity(channelUsername);

            //console.log(channel.id)

            // Add new message event handler
            this.client.addEventHandler(handleNewMessage, new NewMessage({
                chats: chatIds
            }));

            console.log(`Watching for new messages in channel ${chatIds}...`);

        } catch (error) {
            console.error('Failed to set up message listener:', error);
            throw error;
        }
    }

    /**
     * Download media files
     */
    async downloadMedia(message, outputPath = './downloads') {
        try {
            if (!message.media) {
                console.log('This message has no media');
                return null;
            }

            // Ensure download directory exists
            await fs.mkdir(outputPath, { recursive: true });

            // Download file
            const buffer = await this.client.downloadMedia(message.media) || '';

            // Generate filename
            const filename = `${message.id}_${Date.now()}.${message.media.className.toLowerCase()}`;
            const filepath = `${outputPath}/${filename}`;

            // Save file
            await fs.writeFile(filepath, buffer);

            console.log(`Media file saved to: ${filepath}`);
            return filepath;

        } catch (error) {
            console.error('Failed to download media file:', error);
            throw error;
        }
    }

    /**
     * Disconnect from service
     */
    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            console.log('Disconnected');
        }
    }
}