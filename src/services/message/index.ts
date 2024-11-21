import { RedisClientType } from 'redis';
import { EventEmitter } from 'events';

// Types and Interfaces
interface StreamProcessorConfig {
    batchSize?: number;
    blockingTimeout?: number;
}

interface StreamMessage {
    id: string;
    message: { [x: string]: string };
}

interface MessageData {
    [x: string]: string ;
}

interface ProcessorEvents {
    initialized: () => void;
    processingStarted: () => void;
    processingStopped: () => void;
    messageReceived: (data: MessageData) => void;
    messageProcessed: (messageId: string) => void;
    messageError: (message: StreamMessage, error: Error) => void;
    messageAcknowledged: (messageId: string) => void;
    messageSentToDLQ: (messageId: string) => void;
    messageAdded: (data: { id: string; data: MessageData }) => void;
    error: (error: Error) => void;
    closed: () => void;
}

// Type-safe EventEmitter
declare interface RedisStreamProcessor {
    on<K extends keyof ProcessorEvents>(event: K, listener: ProcessorEvents[K]): this;
    emit<K extends keyof ProcessorEvents>(event: K, ...args: Parameters<ProcessorEvents[K]>): boolean;
}

class RedisStreamProcessor extends EventEmitter {
    private client: RedisClientType;
    private readonly streamKey: string;
    private readonly consumerGroup: string;
    private readonly consumerName: string;
    private isProcessing: boolean;
    private readonly batchSize: number;
    private readonly blockingTimeout: number;

    constructor(private readonly redisClient: RedisClientType,config: StreamProcessorConfig) {
        super();
        this.client = redisClient;
        this.streamKey = 'myStream';
        this.consumerGroup = 'myGroup';
        this.consumerName = 'consumer1';
        this.isProcessing = false;
        this.batchSize = config.batchSize || 10;
        this.blockingTimeout = config.blockingTimeout || 2000;

        // Bind methods
        this.initialize = this.initialize.bind(this);
        this.startProcessing = this.startProcessing.bind(this);
        this.stopProcessing = this.stopProcessing.bind(this);

        // Set up event listeners
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.on('messageProcessed', async (messageId: string) => {
            try {
                await this.acknowledgeMessage(messageId);
            } catch (error) {
                this.emit('error', error as Error);
            }
        });

        this.on('messageError', async (message: StreamMessage, error: Error) => {
            try {
                await this.handleFailedMessage(message, error);
            } catch (err) {
                this.emit('error', err as Error);
            }
        });
    }

    public async initialize(): Promise<void> {
        try {
            
            try {
                await this.client.xGroupCreate(
                    this.streamKey,
                    this.consumerGroup,
                    '0',
                    { MKSTREAM: true }
                );
                this.emit('initialized');
            } catch (err) {
                const error = err as Error;
                if (error.message.includes('BUSYGROUP')) {
                    this.emit('initialized');
                } else {
                    throw error;
                }
            }
        } catch (error) {
            this.emit('error', error as Error);
            throw error;
        }
    }

    public async startProcessing(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        this.emit('processingStarted');
        await this.scheduleNextBatch();
    }

    public async stopProcessing(): Promise<void> {
        this.isProcessing = false;
        this.emit('processingStopped');
    }

    private async scheduleNextBatch(): Promise<void> {
        if (!this.isProcessing) {
            return;
        }

        try {
            const streams = await this.client.xReadGroup(
                this.consumerGroup,
                this.consumerName,
                [
                    {
                        key: this.streamKey,
                        id: '>'
                    }
                ],
                {
                    COUNT: this.batchSize,
                    BLOCK: this.blockingTimeout
                }
            );

            if (streams && streams.length > 0) {
                await this.processBatch(streams[0].messages);
            }
        } catch (error) {
            this.emit('error', error as Error);
        } finally {
            if (this.isProcessing) {
                setImmediate(() => this.scheduleNextBatch());
            }
        }
    }

    private async processBatch(messages: StreamMessage[]): Promise<void> {
        const concurrencyLimit = 3;
        const processingQueue: Promise<void>[] = [];

        for (const message of messages) {
            processingQueue.push(this.processMessage(message));

            if (processingQueue.length >= concurrencyLimit) {
                await Promise.race(processingQueue);
                const completedIndex = await Promise.race(
                    processingQueue.map(async (p, index) => {
                        try {
                            await p;
                            return index;
                        } catch {
                            return -1;
                        }
                    })
                );
                if (completedIndex >= 0) {
                    processingQueue.splice(completedIndex, 1);
                }
            }
        }

        await Promise.all(processingQueue);
    }

    private async processMessage(message: StreamMessage): Promise<void> {
        try {
            const data = this.parseMessage(message);
            this.emit('messageReceived', data);

            await this.handleMessage(data);
            this.emit('messageProcessed', message.id);
        } catch (error) {
            this.emit('messageError', message, error as Error);
        }
    }

    private parseMessage(message: StreamMessage): MessageData {
        const data: MessageData = {};
        return message.message;
    }

    protected async handleMessage(data: MessageData): Promise<void> {
        // Default implementation - override this or listen to 'messageReceived' event
       // this.emit('messageData', data);
    }

    private async acknowledgeMessage(messageId: string): Promise<void> {
        try {
            await this.client.xAck(this.streamKey, this.consumerGroup, messageId);
            this.emit('messageAcknowledged', messageId);
        } catch (error) {
            this.emit('error', error as Error);
            throw error;
        }
    }

    private async handleFailedMessage(message: StreamMessage, error: Error): Promise<void> {
        const dlqKey = `${this.streamKey}:dlq`;
        try {
            await this.client.xAdd(dlqKey, '*', 
                {
                    'error': error.message
                }   
            );
            this.emit('messageSentToDLQ', message.id);
        } catch (dlqError) {
            this.emit('error', dlqError as Error);
        }
    }

    public async addMessage(data: MessageData): Promise<string> {
        try {
            const id = await this.client.xAdd(
                this.streamKey,
                '*',
                data
            );
            this.emit('messageAdded', { id, data });
            return id;
        } catch (error) {
            this.emit('error', error as Error);
            throw error;
        }
    }

    public async close(): Promise<void> {
        await this.stopProcessing();
        await this.client.quit();
        this.emit('closed');
    }
}

export { RedisStreamProcessor, StreamProcessorConfig, MessageData, StreamMessage };