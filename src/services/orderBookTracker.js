import { config } from '../config.js';
import { notifyLargeOrder, notifyMarketTrade } from './telegramBot.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(date) {
  const day = DAYS[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${day} ${dd}.${mm} ${hh}:${min}:${ss}`;
}

class OrderBookTracker {
  constructor() {
    this.orderBooks = new Map();
    this.prices = new Map();
    this.volumes = new Map();
    this.processedOrders = new Map();
  }

  setPrice(symbol, price) {
    this.prices.set(symbol, price);
  }

  setVolume(symbol, volume24h) {
    this.volumes.set(symbol, volume24h);
  }

  getMinOrderSize(symbol) {
    const volume = this.volumes.get(symbol) || 0;
    const percentThreshold = volume * (config.filters.minOrderPercent / 100);
    return Math.max(percentThreshold, config.filters.minOrderFloor);
  }

  getMinMarketSize(symbol) {
    const volume = this.volumes.get(symbol) || 0;
    const percentThreshold = volume * (config.filters.minMarketPercent / 100);
    return Math.max(percentThreshold, config.filters.minMarketFloor);
  }

  initializeOrderBook(symbol, bids, asks) {
    const bidMap = new Map();
    const askMap = new Map();

    bids.forEach(([price, qty]) => {
      bidMap.set(price, parseFloat(qty));
    });

    asks.forEach(([price, qty]) => {
      askMap.set(price, parseFloat(qty));
    });

    this.orderBooks.set(symbol, { bids: bidMap, asks: askMap });
  }

  isWithinPriceRange(symbol, orderPrice) {
    const currentPrice = this.prices.get(symbol);
    if (!currentPrice) return true;
    const deviation = Math.abs(orderPrice - currentPrice) / currentPrice;
    return deviation <= 0.03;
  }

  async processUpdate(symbol, bids, asks) {
    const currentBook = this.orderBooks.get(symbol);
    if (!currentBook) {
      return;
    }

    const minOrderSize = this.getMinOrderSize(symbol);

    for (const [priceLevel, qty] of bids) {
      const quantity = parseFloat(qty);
      const priceNum = parseFloat(priceLevel);
      const oldQty = currentBook.bids.get(priceLevel) || 0;
      
      if (quantity > oldQty) {
        const newVolume = quantity - oldQty;
        const totalUsd = newVolume * priceNum;

        if (totalUsd >= minOrderSize && this.isWithinPriceRange(symbol, priceNum)) {
          await this.notifyNewOrder(symbol, 'BID', priceNum, newVolume, totalUsd);
        }
      }

      if (quantity === 0) {
        currentBook.bids.delete(priceLevel);
      } else {
        currentBook.bids.set(priceLevel, quantity);
      }
    }

    for (const [priceLevel, qty] of asks) {
      const quantity = parseFloat(qty);
      const priceNum = parseFloat(priceLevel);
      const oldQty = currentBook.asks.get(priceLevel) || 0;

      if (quantity > oldQty) {
        const newVolume = quantity - oldQty;
        const totalUsd = newVolume * priceNum;

        if (totalUsd >= minOrderSize && this.isWithinPriceRange(symbol, priceNum)) {
          await this.notifyNewOrder(symbol, 'ASK', priceNum, newVolume, totalUsd);
        }
      }

      if (quantity === 0) {
        currentBook.asks.delete(priceLevel);
      } else {
        currentBook.asks.set(priceLevel, quantity);
      }
    }
  }

  async notifyNewOrder(symbol, side, price, quantity, totalUsd) {
    const priceKey = `${symbol}-${side}-${price}`;
    const now = Date.now();
    const lastNotify = this.processedOrders.get(priceKey);
    
    if (lastNotify && now - lastNotify < 60000) {
      return;
    }
    
    this.processedOrders.set(priceKey, now);
    
    if (this.processedOrders.size > 10000) {
      const entries = Array.from(this.processedOrders.entries());
      this.processedOrders = new Map(entries.slice(-5000));
    }

    const moscowDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const time = formatTime(moscowDate);
    const minOrderSize = this.getMinOrderSize(symbol);
    const volume24h = this.volumes.get(symbol) || 0;

    await notifyLargeOrder({
      symbol,
      side,
      price,
      quantity,
      totalUsd: Math.round(totalUsd),
      threshold: Math.round(minOrderSize),
      volume24h: Math.round(volume24h),
      time,
    });
  }

  async processMarketTrade(symbol, price, quantity, isBuyerMaker) {
    this.prices.set(symbol, price);
    
    const totalUsd = price * quantity;
    const minMarketSize = this.getMinMarketSize(symbol);
    
    if (totalUsd < minMarketSize) {
      return;
    }

    if (!this.isWithinPriceRange(symbol, price)) {
      return;
    }

    const side = isBuyerMaker ? 'SELL' : 'BUY';
    const tradeKey = `trade-${symbol}-${side}`;
    const now = Date.now();
    const lastNotify = this.processedOrders.get(tradeKey);
    
    if (lastNotify && now - lastNotify < 60000) {
      return;
    }
    
    this.processedOrders.set(tradeKey, now);

    const moscowDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const time = formatTime(moscowDate);
    const volume24h = this.volumes.get(symbol) || 0;

    await notifyMarketTrade({
      symbol,
      side,
      price,
      quantity,
      totalUsd: Math.round(totalUsd),
      threshold: Math.round(minMarketSize),
      volume24h: Math.round(volume24h),
      time,
    });
  }
}

export const orderBookTracker = new OrderBookTracker();

