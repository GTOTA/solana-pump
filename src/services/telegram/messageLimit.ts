export class MessageRateLimiter {
    private messageTimestamps: number[] = [];
    private readonly MAX_MESSAGES_PER_MINUTE = 20;
    private readonly TIME_WINDOW_MS = 60 * 1000; // 1分钟
  
    /**
     * 尝试发送消息
     * @returns 是否允许发送消息
     */
    sendMessage(): boolean {
      const now = Date.now();
  
      // 清理超出时间窗口的消息记录
      this.messageTimestamps = this.messageTimestamps.filter(
        timestamp => now - timestamp < this.TIME_WINDOW_MS
      );
  
      // 检查是否超过限制
      if (this.messageTimestamps.length >= this.MAX_MESSAGES_PER_MINUTE) {
        return false;
      }
  
      // 记录发送时间并允许发送
      this.messageTimestamps.push(now);
      return true;
    }
  
    /**
     * 获取当前一分钟内已发送消息数量
     * @returns 消息数量
     */
    getCurrentMessageCount(): number {
      const now = Date.now();
      return this.messageTimestamps.filter(
        timestamp => now - timestamp < this.TIME_WINDOW_MS
      ).length;
    }
  }
  
  // 使用示例
  const messageLimiter = new MessageRateLimiter();
  
  // 模拟消息发送
  function testMessageSending() {
    for (let i = 1; i <= 25; i++) {
      if (messageLimiter.sendMessage()) {
        console.log(`消息 ${i} 发送成功`);
      } else {
        console.log(`消息 ${i} 发送失败，已达到速率限制`);
      }
    }
  
    console.log(`当前一分钟内已发送消息数：${messageLimiter.getCurrentMessageCount()}`);
  }
  
  // 取消注释以测试
  // testMessageSending();