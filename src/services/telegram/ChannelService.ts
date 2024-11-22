import { MessageData, RedisStreamProcessor } from "../message";
import { TelegramListenerService } from ".";
import * as utils from '../../utils/StringUtils'
import { CHANNEL } from "./types";
import { promises as fs } from 'fs';


// Define the message interface
export interface ChannelMessage {
    content: string;
    // Add other message properties as needed
}

// Define callback function type
export type ChannelCallback = (msg: ChannelMessage) => void;


export interface ChannelService {
    channelId: string;
    msgQueue: RedisStreamProcessor;
    telegramClient: TelegramListenerService;
    handleChannelMsg(event);
    registChannelCallback(chatIds: number[]);
}


// Child class implements ChannelService
export class GMGNChannelService implements ChannelService {
    channelId: string;

    telegramClient: TelegramListenerService;

    msgQueue: RedisStreamProcessor;

    constructor(channelId: string = 'default', telegramClient: TelegramListenerService, msgQueue: RedisStreamProcessor) {
        this.channelId = channelId;
        this.telegramClient = telegramClient;
        this.msgQueue = msgQueue;
    }

    /**
     * Save messages to file
     */
    async saveMessages(messages, filename = 'messages.json') {
        try {
            await fs.appendFile(
                filename,
                JSON.stringify(messages, null, 2),
                'utf8'
            );
            //console.log(`Messages saved to ${filename}`);
        } catch (error) {
            console.error('Failed to save messages:', error);
            throw error;
        }
    }

    handleChannelMsg = async (event) => {
        const message = event.message;
        if (message.text == undefined) {
            console.log(' handleChannelMsg error', event);
            return
        }

        const channelId = event.message.peerId.channelId.toString()

        var childId=''
        if(event.message.replyTo != undefined ) {
            if( event.message.replyTo.replyToTopId)
               childId = event.message.replyTo.replyToTopId.toString()
            else if(event.message.replyTo.replyToMsgId)
               childId = event.message.replyTo.replyToMsgId.toString()
            if(childId != CHANNEL.KOLBUY_ID && childId != CHANNEL.HEAVYBOUGHT_ID) return
        }
        
        const msg = utils.parseAlertMessage(message.text);
        if (msg == undefined || msg.ca == undefined) {
            console.log(' parseChannelMsg error', msg);
            return
        }

        const messageData: MessageData = {
            id: channelId,
            child: childId,
            msg: JSON.stringify(msg),
            timestamp: (new Date()).toLocaleString()
        };

        await this.saveMessages(messageData,utils.MSG_FILE)

        await this.msgQueue.addMessage(messageData);
    }

    async registChannelCallback(chatIds: number[]) {
        await this.telegramClient.watchNewMessages(chatIds, this.handleChannelMsg);
    }


}

