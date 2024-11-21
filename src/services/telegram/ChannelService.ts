import { MessageData, RedisStreamProcessor } from "../message";
import { TelegramListenerService } from ".";
import * as utils from '../../utils/StringUtils'
import { HttpApi } from "../../utils/HttpUtils";
import { ResponseTokenInfo } from "../../utils/types";
import { CacheManager } from "../cache";
import { CHANNEL } from "./types";

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

        await this.msgQueue.addMessage(messageData);
    }

    async registChannelCallback(chatIds: number[]) {
        await this.telegramClient.watchNewMessages(chatIds, this.handleChannelMsg);
    }


}

