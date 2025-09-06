const EventEmitter = require('events');
const axios = require('axios');
const WebSocket = require('ws');
const { logger } = require('../utils/logger');
const { CsvImporter } = require('./csvImporter');

class ExchangeImporter extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      requestTimeout: 30000,
      rateLimit: 100, // requests per minute
      ...config
    };
    
    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    this.exchanges = {
      binance: new BinanceImporter(this.config),
      coinbase: new CoinbaseImporter(this.config),
      kraken: new KrakenImporter(this.config),
      bybit: new BybitImporter(this.config),
      okx: new OKXImporter(this.config)
    };
  }
  
  /**
   * Get available exchanges
   */
  getAvailableExchanges() {
    return Object.keys(this.exchanges);
  }
  
  /**
   * Import historical data from exchange
   */
  async importHistoricalData(exchange, symbol, timeframe, startDate, endDate) {
    if (!this.exchanges[exchange]) {
      throw new Error(`Exchange ${exchange} not supported`);
    }
    
    try {
      logger.info(`Importing historical data from ${exchange}: ${symbol} ${timeframe}`);
      
      const data = await this.exchanges[exchange].getHistoricalData(
        symbol, timeframe, startDate, endDate
      );
      
      logger.info(`Imported ${data.length} candles from ${exchange}`);
      return data;
      
    } catch (error) {
      logger.error(`Failed to import from ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Start real-time data stream
   */
  async startRealTimeStream(exchange, symbol, timeframe) {
    if (!this.exchanges[exchange]) {
      throw new Error(`Exchange ${exchange} not supported`);
    }
    
    try {
      logger.info(`Starting real-time stream from ${exchange}: ${symbol} ${timeframe}`);
      
      const stream = await this.exchanges[exchange].startRealTimeStream(
        symbol, timeframe
      );
      
      // Forward events
      stream.on('candle', (candle) => {
        this.emit('candle', { exchange, symbol, timeframe, candle });
      });
      
      stream.on('trade', (trade) => {
        this.emit('trade', { exchange, symbol, trade });
      });
      
      stream.on('orderbook', (orderbook) => {
        this.emit('orderbook', { exchange, symbol, orderbook });
      });
      
      stream.on('error', (error) => {
        this.emit('error', { exchange, symbol, error });
      });
      
      return stream;
      
    } catch (error) {
      logger.error(`Failed to start stream from ${exchange}:`, error);
      throw error;
    }
  }
  
  /**
   * Get exchange info
   */
  async getExchangeInfo(exchange) {
    if (!this.exchanges[exchange]) {
      throw new Error(`Exchange ${exchange} not supported`);
    }
    
    return await this.exchanges[exchange].getExchangeInfo();
  }
  
  /**
   * Get available symbols
   */
  async getAvailableSymbols(exchange) {
    if (!this.exchanges[exchange]) {
      throw new Error(`Exchange ${exchange} not supported`);
    }
    
    return await this.exchanges[exchange].getAvailableSymbols();
  }
  
  /**
   * Get available timeframes
   */
  getAvailableTimeframes(exchange) {
    if (!this.exchanges[exchange]) {
      throw new Error(`Exchange ${exchange} not supported`);
    }
    
    return this.exchanges[exchange].getAvailableTimeframes();
  }
}

/**
 * Base Exchange Importer
 */
class BaseExchangeImporter extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimit);
  }
  
  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(url, options = {}) {
    await this.rateLimiter.wait();
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await axios({
          url,
          timeout: this.config.requestTimeout,
          ...options
        });
        
        return response.data;
        
      } catch (error) {
        if (attempt === this.config.retryAttempts) {
          throw error;
        }
        
        logger.warn(`Request failed (attempt ${attempt}/${this.config.retryAttempts}):`, error.message);
        await this.sleep(this.config.retryDelay * attempt);
      }
    }
  }
  
  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Normalize candle data
   */
  normalizeCandle(rawCandle) {
    return {
      timestamp: new Date(rawCandle.timestamp),
      open: parseFloat(rawCandle.open),
      high: parseFloat(rawCandle.high),
      low: parseFloat(rawCandle.low),
      close: parseFloat(rawCandle.close),
      volume: parseFloat(rawCandle.volume)
    };
  }
  
  /**
   * Convert timeframe to exchange format
   */
  convertTimeframe(timeframe) {
    // Override in subclasses
    return timeframe;
  }
}

/**
 * Binance Importer
 */
class BinanceImporter extends BaseExchangeImporter {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://api.binance.com';
    this.wsUrl = 'wss://stream.binance.com:9443/ws';
  }
  
  async getHistoricalData(symbol, timeframe, startDate, endDate) {
    const interval = this.convertTimeframe(timeframe);
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    
    const url = `${this.baseUrl}/api/v3/klines`;
    const params = {
      symbol: symbol.replace('/', ''),
      interval,
      startTime,
      endTime,
      limit: 1000
    };
    
    const allCandles = [];
    let currentStartTime = startTime;
    
    while (currentStartTime < endTime) {
      const data = await this.makeRequest(url, {
        params: { ...params, startTime: currentStartTime }
      });
      
      if (!data || data.length === 0) break;
      
      const candles = data.map(kline => ({
        timestamp: kline[0],
        open: kline[1],
        high: kline[2],
        low: kline[3],
        close: kline[4],
        volume: kline[5]
      }));
      
      allCandles.push(...candles.map(c => this.normalizeCandle(c)));
      
      // Update start time for next batch
      currentStartTime = data[data.length - 1][0] + 1;
    }
    
    return allCandles;
  }
  
  async startRealTimeStream(symbol, timeframe) {
    const stream = new EventEmitter();
    const interval = this.convertTimeframe(timeframe);
    const streamName = `${symbol.replace('/', '').toLowerCase()}@kline_${interval}`;
    
    const ws = new WebSocket(`${this.wsUrl}/${streamName}`);
    
    ws.on('open', () => {
      logger.info(`Binance WebSocket connected: ${streamName}`);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.k) {
          const kline = message.k;
          const candle = this.normalizeCandle({
            timestamp: kline.t,
            open: kline.o,
            high: kline.h,
            low: kline.l,
            close: kline.c,
            volume: kline.v
          });
          
          stream.emit('candle', candle);
        }
      } catch (error) {
        stream.emit('error', error);
      }
    });
    
    ws.on('error', (error) => {
      stream.emit('error', error);
    });
    
    ws.on('close', () => {
      logger.info(`Binance WebSocket disconnected: ${streamName}`);
    });
    
    stream.close = () => ws.close();
    
    return stream;
  }
  
  async getExchangeInfo() {
    const data = await this.makeRequest(`${this.baseUrl}/api/v3/exchangeInfo`);
    
    return {
      name: 'Binance',
      symbols: data.symbols.map(s => ({
        symbol: `${s.baseAsset}/${s.quoteAsset}`,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        status: s.status,
        minQty: parseFloat(s.filters.find(f => f.filterType === 'LOT_SIZE')?.minQty || 0),
        maxQty: parseFloat(s.filters.find(f => f.filterType === 'LOT_SIZE')?.maxQty || 0),
        stepSize: parseFloat(s.filters.find(f => f.filterType === 'LOT_SIZE')?.stepSize || 0)
      })),
      rateLimits: data.rateLimits
    };
  }
  
  async getAvailableSymbols() {
    const info = await this.getExchangeInfo();
    return info.symbols.filter(s => s.status === 'TRADING').map(s => s.symbol);
  }
  
  getAvailableTimeframes() {
    return ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
  }
  
  convertTimeframe(timeframe) {
    const mapping = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w'
    };
    
    return mapping[timeframe] || timeframe;
  }
}

/**
 * Coinbase Importer
 */
class CoinbaseImporter extends BaseExchangeImporter {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://api.exchange.coinbase.com';
    this.wsUrl = 'wss://ws-feed.exchange.coinbase.com';
  }
  
  async getHistoricalData(symbol, timeframe, startDate, endDate) {
    const granularity = this.convertTimeframe(timeframe);
    const start = new Date(startDate).toISOString();
    const end = new Date(endDate).toISOString();
    
    const url = `${this.baseUrl}/products/${symbol.replace('/', '-')}/candles`;
    const params = {
      start,
      end,
      granularity
    };
    
    const data = await this.makeRequest(url, { params });
    
    return data.map(candle => this.normalizeCandle({
      timestamp: candle[0] * 1000, // Convert to milliseconds
      low: candle[1],
      high: candle[2],
      open: candle[3],
      close: candle[4],
      volume: candle[5]
    })).reverse(); // Coinbase returns newest first
  }
  
  async startRealTimeStream(symbol, timeframe) {
    const stream = new EventEmitter();
    const productId = symbol.replace('/', '-');
    
    const ws = new WebSocket(this.wsUrl);
    
    ws.on('open', () => {
      const subscribeMessage = {
        type: 'subscribe',
        product_ids: [productId],
        channels: ['matches', 'level2']
      };
      
      ws.send(JSON.stringify(subscribeMessage));
      logger.info(`Coinbase WebSocket connected: ${productId}`);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'match') {
          const trade = {
            timestamp: new Date(message.time),
            price: parseFloat(message.price),
            size: parseFloat(message.size),
            side: message.side
          };
          
          stream.emit('trade', trade);
        }
      } catch (error) {
        stream.emit('error', error);
      }
    });
    
    ws.on('error', (error) => {
      stream.emit('error', error);
    });
    
    stream.close = () => ws.close();
    
    return stream;
  }
  
  async getExchangeInfo() {
    const data = await this.makeRequest(`${this.baseUrl}/products`);
    
    return {
      name: 'Coinbase',
      symbols: data.map(p => ({
        symbol: p.id.replace('-', '/'),
        baseAsset: p.base_currency,
        quoteAsset: p.quote_currency,
        status: p.status,
        minSize: parseFloat(p.base_min_size),
        maxSize: parseFloat(p.base_max_size),
        increment: parseFloat(p.base_increment)
      }))
    };
  }
  
  async getAvailableSymbols() {
    const info = await this.getExchangeInfo();
    return info.symbols.filter(s => s.status === 'online').map(s => s.symbol);
  }
  
  getAvailableTimeframes() {
    return ['1m', '5m', '15m', '1h', '6h', '1d'];
  }
  
  convertTimeframe(timeframe) {
    const mapping = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '6h': 21600,
      '1d': 86400
    };
    
    return mapping[timeframe] || 3600;
  }
}

/**
 * Kraken Importer
 */
class KrakenImporter extends BaseExchangeImporter {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://api.kraken.com';
    this.wsUrl = 'wss://ws.kraken.com';
  }
  
  async getHistoricalData(symbol, timeframe, startDate, endDate) {
    const interval = this.convertTimeframe(timeframe);
    const since = Math.floor(new Date(startDate).getTime() / 1000);
    
    const url = `${this.baseUrl}/0/public/OHLC`;
    const params = {
      pair: this.convertSymbol(symbol),
      interval,
      since
    };
    
    const data = await this.makeRequest(url, { params });
    const pairData = Object.values(data.result)[0];
    
    return pairData.map(candle => this.normalizeCandle({
      timestamp: candle[0] * 1000,
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[6]
    })).filter(candle => candle.timestamp <= new Date(endDate).getTime());
  }
  
  async startRealTimeStream(symbol, timeframe) {
    const stream = new EventEmitter();
    const pair = this.convertSymbol(symbol);
    
    const ws = new WebSocket(this.wsUrl);
    
    ws.on('open', () => {
      const subscribeMessage = {
        event: 'subscribe',
        pair: [pair],
        subscription: { name: 'trade' }
      };
      
      ws.send(JSON.stringify(subscribeMessage));
      logger.info(`Kraken WebSocket connected: ${pair}`);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (Array.isArray(message) && message[1] === 'trade') {
          const trades = message[1];
          
          trades.forEach(trade => {
            const tradeData = {
              timestamp: new Date(parseFloat(trade[2]) * 1000),
              price: parseFloat(trade[0]),
              size: parseFloat(trade[1]),
              side: trade[3] === 'b' ? 'buy' : 'sell'
            };
            
            stream.emit('trade', tradeData);
          });
        }
      } catch (error) {
        stream.emit('error', error);
      }
    });
    
    ws.on('error', (error) => {
      stream.emit('error', error);
    });
    
    stream.close = () => ws.close();
    
    return stream;
  }
  
  async getExchangeInfo() {
    const data = await this.makeRequest(`${this.baseUrl}/0/public/AssetPairs`);
    
    return {
      name: 'Kraken',
      symbols: Object.entries(data.result).map(([key, pair]) => ({
        symbol: `${pair.base}/${pair.quote}`,
        baseAsset: pair.base,
        quoteAsset: pair.quote,
        status: 'active',
        minSize: parseFloat(pair.ordermin || 0),
        lotDecimals: pair.lot_decimals,
        pairDecimals: pair.pair_decimals
      }))
    };
  }
  
  async getAvailableSymbols() {
    const info = await this.getExchangeInfo();
    return info.symbols.map(s => s.symbol);
  }
  
  getAvailableTimeframes() {
    return ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
  }
  
  convertTimeframe(timeframe) {
    const mapping = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
      '1w': 10080
    };
    
    return mapping[timeframe] || 60;
  }
  
  convertSymbol(symbol) {
    // Kraken uses different symbol format
    return symbol.replace('/', '').replace('BTC', 'XBT');
  }
}

/**
 * Bybit Importer
 */
class BybitImporter extends BaseExchangeImporter {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://api.bybit.com';
    this.wsUrl = 'wss://stream.bybit.com/v5/public/spot';
  }
  
  async getHistoricalData(symbol, timeframe, startDate, endDate) {
    const interval = this.convertTimeframe(timeframe);
    const start = Math.floor(new Date(startDate).getTime());
    const end = Math.floor(new Date(endDate).getTime());
    
    const url = `${this.baseUrl}/v5/market/kline`;
    const params = {
      category: 'spot',
      symbol: symbol.replace('/', ''),
      interval,
      start,
      end,
      limit: 1000
    };
    
    const data = await this.makeRequest(url, { params });
    
    return data.result.list.map(candle => this.normalizeCandle({
      timestamp: parseInt(candle[0]),
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5]
    })).reverse();
  }
  
  async startRealTimeStream(symbol, timeframe) {
    const stream = new EventEmitter();
    const interval = this.convertTimeframe(timeframe);
    
    const ws = new WebSocket(this.wsUrl);
    
    ws.on('open', () => {
      const subscribeMessage = {
        op: 'subscribe',
        args: [`kline.${interval}.${symbol.replace('/', '')}`]
      };
      
      ws.send(JSON.stringify(subscribeMessage));
      logger.info(`Bybit WebSocket connected: ${symbol}`);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.topic && message.topic.includes('kline')) {
          const kline = message.data[0];
          const candle = this.normalizeCandle({
            timestamp: parseInt(kline.start),
            open: kline.open,
            high: kline.high,
            low: kline.low,
            close: kline.close,
            volume: kline.volume
          });
          
          stream.emit('candle', candle);
        }
      } catch (error) {
        stream.emit('error', error);
      }
    });
    
    ws.on('error', (error) => {
      stream.emit('error', error);
    });
    
    stream.close = () => ws.close();
    
    return stream;
  }
  
  async getExchangeInfo() {
    const data = await this.makeRequest(`${this.baseUrl}/v5/market/instruments-info?category=spot`);
    
    return {
      name: 'Bybit',
      symbols: data.result.list.map(s => ({
        symbol: `${s.baseCoin}/${s.quoteCoin}`,
        baseAsset: s.baseCoin,
        quoteAsset: s.quoteCoin,
        status: s.status,
        minOrderQty: parseFloat(s.lotSizeFilter.minOrderQty),
        maxOrderQty: parseFloat(s.lotSizeFilter.maxOrderQty),
        qtyStep: parseFloat(s.lotSizeFilter.qtyStep)
      }))
    };
  }
  
  async getAvailableSymbols() {
    const info = await this.getExchangeInfo();
    return info.symbols.filter(s => s.status === 'Trading').map(s => s.symbol);
  }
  
  getAvailableTimeframes() {
    return ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', 'D', 'W', 'M'];
  }
  
  convertTimeframe(timeframe) {
    const mapping = {
      '1m': '1',
      '3m': '3',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '2h': '120',
      '4h': '240',
      '6h': '360',
      '12h': '720',
      '1d': 'D',
      '1w': 'W',
      '1M': 'M'
    };
    
    return mapping[timeframe] || '60';
  }
}

/**
 * OKX Importer
 */
class OKXImporter extends BaseExchangeImporter {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://www.okx.com';
    this.wsUrl = 'wss://ws.okx.com:8443/ws/v5/public';
  }
  
  async getHistoricalData(symbol, timeframe, startDate, endDate) {
    const bar = this.convertTimeframe(timeframe);
    const after = Math.floor(new Date(startDate).getTime());
    const before = Math.floor(new Date(endDate).getTime());
    
    const url = `${this.baseUrl}/api/v5/market/history-candles`;
    const params = {
      instId: symbol.replace('/', '-'),
      bar,
      after,
      before,
      limit: 100
    };
    
    const data = await this.makeRequest(url, { params });
    
    return data.data.map(candle => this.normalizeCandle({
      timestamp: parseInt(candle[0]),
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5]
    })).reverse();
  }
  
  async startRealTimeStream(symbol, timeframe) {
    const stream = new EventEmitter();
    const bar = this.convertTimeframe(timeframe);
    
    const ws = new WebSocket(this.wsUrl);
    
    ws.on('open', () => {
      const subscribeMessage = {
        op: 'subscribe',
        args: [{
          channel: 'candle' + bar,
          instId: symbol.replace('/', '-')
        }]
      };
      
      ws.send(JSON.stringify(subscribeMessage));
      logger.info(`OKX WebSocket connected: ${symbol}`);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.data) {
          message.data.forEach(candleData => {
            const candle = this.normalizeCandle({
              timestamp: parseInt(candleData[0]),
              open: candleData[1],
              high: candleData[2],
              low: candleData[3],
              close: candleData[4],
              volume: candleData[5]
            });
            
            stream.emit('candle', candle);
          });
        }
      } catch (error) {
        stream.emit('error', error);
      }
    });
    
    ws.on('error', (error) => {
      stream.emit('error', error);
    });
    
    stream.close = () => ws.close();
    
    return stream;
  }
  
  async getExchangeInfo() {
    const data = await this.makeRequest(`${this.baseUrl}/api/v5/public/instruments?instType=SPOT`);
    
    return {
      name: 'OKX',
      symbols: data.data.map(s => ({
        symbol: s.instId.replace('-', '/'),
        baseAsset: s.baseCcy,
        quoteAsset: s.quoteCcy,
        status: s.state,
        minSize: parseFloat(s.minSz),
        lotSize: parseFloat(s.lotSz),
        tickSize: parseFloat(s.tickSz)
      }))
    };
  }
  
  async getAvailableSymbols() {
    const info = await this.getExchangeInfo();
    return info.symbols.filter(s => s.status === 'live').map(s => s.symbol);
  }
  
  getAvailableTimeframes() {
    return ['1m', '3m', '5m', '15m', '30m', '1H', '2H', '4H', '6H', '12H', '1D', '1W', '1M'];
  }
  
  convertTimeframe(timeframe) {
    const mapping = {
      '1m': '1m',
      '3m': '3m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1H',
      '2h': '2H',
      '4h': '4H',
      '6h': '6H',
      '12h': '12H',
      '1d': '1D',
      '1w': '1W',
      '1M': '1M'
    };
    
    return mapping[timeframe] || '1H';
  }
}

/**
 * Rate Limiter
 */
class RateLimiter {
  constructor(requestsPerMinute) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
  }
  
  async wait() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    // Check if we need to wait
    if (this.requests.length >= this.requestsPerMinute) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + 60000 - now;
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Record this request
    this.requests.push(now);
  }
}

module.exports = {
  ExchangeImporter,
  BaseExchangeImporter,
  BinanceImporter,
  CoinbaseImporter,
  KrakenImporter,
  BybitImporter,
  OKXImporter,
  RateLimiter
};