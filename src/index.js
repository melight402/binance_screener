import http from 'http';
import { config } from './config.js';
import { getFilteredPairs, getAllOrderBooks } from './services/binanceApi.js';
import { binanceWebSocket } from './services/binanceWebSocket.js';
import { orderBookTracker } from './services/orderBookTracker.js';
import { sendTelegramMessage } from './services/telegramBot.js';

const PORT = process.env.PORT || 3000;

const HTML_PAGE = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Binance Screener - Status</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
      max-width: 500px;
      width: 100%;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .status {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .info {
      color: #666;
      line-height: 1.6;
      margin-top: 20px;
    }
    .service-name {
      color: #667eea;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🚀</div>
    <h1>Binance Screener</h1>
    <div class="status">✓ Сервер работает</div>
    <div class="info">
      <p>Сервис <span class="service-name">Binance Futures Screener</span> активен и отслеживает крупные ордера.</p>
      <p style="margin-top: 15px; font-size: 14px; color: #999;">Порт: ${PORT}</p>
    </div>
  </div>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML_PAGE);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

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
  server.close(() => {
    console.log('HTTP server closed');
    console.log('WebSocket closed');
    process.exit(0);
  });
});

main().catch(() => process.exit(1));

