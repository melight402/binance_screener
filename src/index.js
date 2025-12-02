import { config } from './config.js';
import { getFilteredPairs, getAllOrderBooks } from './services/binanceApi.js';
import { binanceWebSocket } from './services/binanceWebSocket.js';
import { orderBookTracker } from './services/orderBookTracker.js';
import { sendTelegramMessage } from './services/telegramBot.js';

async function main() {
  const pairs = await getFilteredPairs();
  console.log('🚀 Starting Binance Futures Screener...');
  console.log(`Min 24h volume: $${config.filters.minVolume24h.toLocaleString()}`);
  console.log(`Limit orders: ${config.filters.minOrderPercent}% / $${config.filters.minOrderFloor.toLocaleString()} floor`);
  console.log(`Market orders: ${config.filters.minMarketPercent}% / $${config.filters.minMarketFloor.toLocaleString()} floor`);


  if (pairs.length === 0) {
    process.exit(1);
  }

  const symbols = pairs.map(p => p.symbol);
  
  pairs.forEach(p => {
    orderBookTracker.setPrice(p.symbol, p.lastPrice);
    orderBookTracker.setVolume(p.symbol, p.volume24h);
  });

  const orderBooks = await getAllOrderBooks(symbols);

  Object.entries(orderBooks).forEach(([symbol, book]) => {
    orderBookTracker.initializeOrderBook(symbol, book.bids, book.asks);
  });

  binanceWebSocket.connect(symbols);

  await sendTelegramMessage(
    `🚀 <b>Screener Started</b>\n\nTracking ${pairs.length} pairs`
  );
}

process.on('SIGINT', () => {
  binanceWebSocket.close();
  console.log('WebSocket closed');
  process.exit(0);
});

main().catch(() => process.exit(1));

