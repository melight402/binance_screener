import WebSocket from 'ws';
import { config } from '../config.js';
import { orderBookTracker } from './orderBookTracker.js';

class BinanceWebSocket {
  constructor() {
    this.ws = null;
    this.symbols = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
    this.pingInterval = null;
  }

  connect(symbols) {
    this.symbols = symbols;
    
    const depthStreams = symbols.map(s => `${s.toLowerCase()}@depth@100ms`);
    const tradeStreams = symbols.map(s => `${s.toLowerCase()}@aggTrade`);
    const allStreams = [...depthStreams, ...tradeStreams].join('/');
    const url = `${config.binance.wsBaseUrl}/stream?streams=${allStreams}`;

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.startPing();
    });

    this.ws.on('message', (data) => {
      this.handleMessage(data);
    });

    this.ws.on('error', () => {});

    this.ws.on('close', () => {
      this.stopPing();
      this.attemptReconnect();
    });
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.stream && message.data) {
        if (message.stream.endsWith('@depth@100ms')) {
          const { s: symbol, b: bids, a: asks } = message.data;
          if (symbol && (bids?.length || asks?.length)) {
            orderBookTracker.processUpdate(symbol, bids || [], asks || []);
          }
        } else if (message.stream.endsWith('@aggTrade')) {
          const { s: symbol, p: price, q: quantity, m: isBuyerMaker } = message.data;
          if (symbol) {
            orderBookTracker.processMarketTrade(symbol, parseFloat(price), parseFloat(quantity), isBuyerMaker);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error.message);
    }
  }

  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000);
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect(this.symbols);
    }, this.reconnectDelay);
  }

  close() {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const binanceWebSocket = new BinanceWebSocket();

