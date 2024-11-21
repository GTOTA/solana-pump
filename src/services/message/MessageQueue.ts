import { createClient, RedisClientType } from 'redis';


export class MessageQueue {

    private static instance: MessageQueue;

    private redisClient: RedisClientType;

    private constructor(config) {
        // ... existing code ...

        // Initialize Redis client
        this.redisClient = createClient(config);
        this.redisClient.connect().catch(console.error);
    }

    public static getInstance(config?): MessageQueue {
        if (!MessageQueue.instance) {
            MessageQueue.instance = new MessageQueue(config);
        }
        return MessageQueue.instance;
    }

    // Method to publish messages to the Redis stream
    async publishMessage(streamName: string, message: Record<string, string>) {
        try {
            await this.redisClient.xAdd(streamName, '*', message);
            console.log(`Message published to stream ${streamName}`);
        } catch (error) {
            console.error('Failed to publish message:', error);
        }
    }

    // Method to subscribe to the Redis stream
    async subscribeToMessages(streamName: string,processMsg) {
        try {
            const stream = this.redisClient.duplicate();
            await stream.connect();


            while (true) {
                const messages = await stream.xRead(
                    [{ key: streamName, id: '$' }],
                    { BLOCK: 0 }
                );

                console.log('Received message:', messages);
                // Handle the message
 
            }
        } catch (error) {
            console.error('Failed to subscribe to messages:', error);
        }
    }

}