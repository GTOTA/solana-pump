import { Api, TelegramClient } from "telegram";
import { NewMessage } from "telegram/events/NewMessage";
import { StringSession } from "telegram/sessions";
const fs = require('fs').promises;
require('dotenv').config();



(async function run() {

  // 如果有已保存的会话
  let session = '';
  try {
    session = await fs.readFile('../src/res/session.txt', 'utf8');
  } catch (error) {
    // 文件不存在，使用空会话
    return
  }
  const apiId = parseInt(process.env.API_ID || '');;
  const apiHash = process.env.API_HASH || '';
  const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 5,
    proxy: { socksType: 5, ip: '127.0.0.1', port: 1080 }
  });


  await client.connect(); // This assumes you have already authenticated with .start()

  const channel = await client.getEntity('@gmgnsignals')


  const result = await client.invoke(
    new Api.channels.GetChannels({
      id: [channel.id],
    })
  );
  console.log(result); // prints the result

  // // 创建消息处理器
  const handleNewMessage = async (event) => {
    const message = event.message;

    // 格式化消息
    const formattedMessage = {
      id: message.id,
      date: message.date.toString(),
      text: message.text,
      views: message.views,
      forwards: message.forwards,
      mediaType: message.media ? message.media.className : null,
    };

    if(event.message.replyTo.replyToTopId != 1153178) return

    console.log('handle msg:', formattedMessage);

  };

  // Add new message event handler
  client.addEventHandler(handleNewMessage, new NewMessage({
    chats: [2202241417]
  }));

  console.log(`Watching for new messages in channel ${channel.id}...`);

  // 监听新消息
})();
