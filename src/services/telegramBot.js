import axios from 'axios';
import { config } from '../config.js';

const telegramApi = axios.create({
  baseURL: `https://api.telegram.org/bot${config.telegram.botToken}`,
  timeout: 10000,
});

export async function sendTelegramMessage(message) {
  if (!config.telegram.botToken || config.telegram.botToken === 'your_telegram_bot_token_here') {
    console.log('[Telegram disabled]', message);
    return;
  }

  try {
    await telegramApi.post('/sendMessage', {
      chat_id: config.telegram.chatId,
      text: message,
      parse_mode: 'HTML',
    });
  } catch (error) {
    console.error('Telegram send error:', error.message);
  }
}

export function formatOrderNotification(data) {
  const { symbol, side, price, totalUsd, volume24h, time } = data;
  const sideEmoji = side === 'BID' ? '🟢' : '🔴';
  const sideText = side === 'BID' ? 'BUY' : 'SELL';
  
  return `${sideEmoji} <b>Limit ${sideText}</b>

<b>${symbol}</b>
<b>Price:</b> $${price.toLocaleString()}
<b>Total:</b> $${totalUsd.toLocaleString()}
<b>Time:</b> ${time}
<b>Vol:</b> $${volume24h.toLocaleString()}`;
}

export async function notifyLargeOrder(orderData) {
  const message = formatOrderNotification(orderData);
  await sendTelegramMessage(message);
}

export function formatMarketTradeNotification(data) {
  const { symbol, side, price, totalUsd, volume24h, time } = data;
  const sideEmoji = side === 'BUY' ? '🟢' : '🔴';
  
  return `⚡${sideEmoji} <b>Market ${side}</b>

<b>${symbol}</b>
<b>Price:</b> $${price.toLocaleString()}
<b>Total:</b> $${totalUsd.toLocaleString()}
<b>Time:</b> ${time}
<b>Vol:</b> $${volume24h.toLocaleString()}`;
}

export async function notifyMarketTrade(tradeData) {
  const message = formatMarketTradeNotification(tradeData);
  await sendTelegramMessage(message);
}

