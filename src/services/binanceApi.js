import axios from 'axios';
import { config } from '../config.js';

const api = axios.create({
  baseURL: config.binance.restBaseUrl,
  timeout: 30000,
});

export async function getFuturesPairs() {
  const response = await api.get('/fapi/v1/ticker/24hr');
  return response.data;
}

export async function getFilteredPairs() {
  const tickers = await getFuturesPairs();
  
  const filtered = tickers.filter(ticker => {
    const volume = parseFloat(ticker.quoteVolume);
    return volume >= config.filters.minVolume24h;
  });

  return filtered.map(ticker => ({
    symbol: ticker.symbol,
    volume24h: parseFloat(ticker.quoteVolume),
    lastPrice: parseFloat(ticker.lastPrice),
  }));
}

export async function getOrderBook(symbol, limit = 20) {
  const response = await api.get('/fapi/v1/depth', {
    params: { symbol, limit },
  });
  return response.data;
}

export async function getAllOrderBooks(symbols) {
  const orderBooks = {};
  const batchSize = 10;
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (symbol) => {
      try {
        const book = await getOrderBook(symbol);
        return { symbol, book };
      } catch {
        console.error(`Error fetching order book for ${symbol}:`, error.message);
        return { symbol, book: null };
      }
    });
    
    const results = await Promise.all(promises);
    results.forEach(({ symbol, book }) => {
      if (book) {
        orderBooks[symbol] = book;
      }
    });
    
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return orderBooks;
}

