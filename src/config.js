import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

dotenv.config({ path: envPath });

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  binance: {
    restBaseUrl: 'https://fapi.binance.com',
    wsBaseUrl: 'wss://fstream.binance.com',
  },
  filters: {
    minVolume24h: Number(process.env.MIN_VOLUME_24H),
    minOrderPercent: Number(process.env.MIN_ORDER_PERCENT),
    minOrderFloor: Number(process.env.MIN_ORDER_FLOOR),
    minMarketPercent: Number(process.env.MIN_MARKET_PERCENT),
    minMarketFloor: Number(process.env.MIN_MARKET_FLOOR),
  },
};

