import { CandlestickData } from './chartDataAggregation';

export interface IndicatorData {
  time: number;
  value: number;
}

// Simple Moving Average
export const calculateSMA = (data: CandlestickData[], period: number): IndicatorData[] => {
  const smaData: IndicatorData[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, item) => acc + item.close, 0);
    const average = sum / period;
    
    smaData.push({
      time: data[i].time,
      value: average
    });
  }
  
  return smaData;
};

// Exponential Moving Average
export const calculateEMA = (data: CandlestickData[], period: number): IndicatorData[] => {
  const emaData: IndicatorData[] = [];
  const multiplier = 2 / (period + 1);
  
  if (data.length === 0) return emaData;
  
  // Start with SMA for the first value
  let ema = data.slice(0, period).reduce((acc, item) => acc + item.close, 0) / period;
  
  emaData.push({
    time: data[period - 1].time,
    value: ema
  });
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close * multiplier) + (ema * (1 - multiplier));
    emaData.push({
      time: data[i].time,
      value: ema
    });
  }
  
  return emaData;
};

// Bollinger Bands
export interface BollingerBandsData {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export const calculateBollingerBands = (
  data: CandlestickData[], 
  period: number = 20, 
  stdDev: number = 2
): BollingerBandsData[] => {
  const bandsData: BollingerBandsData[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const closes = slice.map(item => item.close);
    
    // Calculate SMA (middle band)
    const sma = closes.reduce((acc, close) => acc + close, 0) / period;
    
    // Calculate standard deviation
    const variance = closes.reduce((acc, close) => acc + Math.pow(close - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    bandsData.push({
      time: data[i].time,
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    });
  }
  
  return bandsData;
};

// RSI (Relative Strength Index)
export const calculateRSI = (data: CandlestickData[], period: number = 14): IndicatorData[] => {
  const rsiData: IndicatorData[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // Calculate initial averages
  if (gains.length < period) return rsiData;
  
  let avgGain = gains.slice(0, period).reduce((acc, gain) => acc + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((acc, loss) => acc + loss, 0) / period;
  
  // Calculate RSI for initial period
  let rs = avgGain / (avgLoss === 0 ? 0.01 : avgLoss);
  let rsi = 100 - (100 / (1 + rs));
  
  rsiData.push({
    time: data[period].time,
    value: rsi
  });
  
  // Calculate subsequent RSI values using smoothed averages
  for (let i = period + 1; i < data.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i - 1]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i - 1]) / period;
    
    rs = avgGain / (avgLoss === 0 ? 0.01 : avgLoss);
    rsi = 100 - (100 / (1 + rs));
    
    rsiData.push({
      time: data[i].time,
      value: rsi
    });
  }
  
  return rsiData;
};

// MACD (Moving Average Convergence Divergence)
export interface MACDData {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export const calculateMACD = (
  data: CandlestickData[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): MACDData[] => {
  const macdData: MACDData[] = [];
  
  // Calculate EMAs
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  // Calculate MACD line
  const macdLine: IndicatorData[] = [];
  const startIndex = Math.max(fastEMA.length, slowEMA.length) - Math.min(fastEMA.length, slowEMA.length);
  
  for (let i = startIndex; i < Math.min(fastEMA.length, slowEMA.length); i++) {
    const fastValue = fastEMA[i]?.value || 0;
    const slowValue = slowEMA[i]?.value || 0;
    
    macdLine.push({
      time: data[i + slowPeriod - 1].time,
      value: fastValue - slowValue
    });
  }
  
  // Calculate signal line (EMA of MACD)
  const signalLine = calculateEMA(
    macdLine.map(item => ({ time: item.time, close: item.value, open: item.value, high: item.value, low: item.value })),
    signalPeriod
  );
  
  // Combine MACD and signal
  for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
    const macdValue = macdLine[i + (macdLine.length - signalLine.length)]?.value || 0;
    const signalValue = signalLine[i]?.value || 0;
    
    macdData.push({
      time: signalLine[i].time,
      macd: macdValue,
      signal: signalValue,
      histogram: macdValue - signalValue
    });
  }
  
  return macdData;
};

// Volume Weighted Average Price (VWAP)
export const calculateVWAP = (candlestickData: CandlestickData[], volumeData: { time: number; value: number }[]): IndicatorData[] => {
  const vwapData: IndicatorData[] = [];
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;
  
  for (let i = 0; i < candlestickData.length; i++) {
    const candle = candlestickData[i];
    const volume = volumeData[i]?.value || 0;
    
    // Typical price (high + low + close) / 3
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    
    cumulativePriceVolume += typicalPrice * volume;
    cumulativeVolume += volume;
    
    const vwap = cumulativeVolume > 0 ? cumulativePriceVolume / cumulativeVolume : typicalPrice;
    
    vwapData.push({
      time: candle.time,
      value: vwap
    });
  }
  
  return vwapData;
};

// Support and Resistance levels
export interface SupportResistanceLevel {
  price: number;
  strength: number;
  type: 'support' | 'resistance';
}

export const findSupportResistanceLevels = (data: CandlestickData[]): SupportResistanceLevel[] => {
  const levels: SupportResistanceLevel[] = [];
  const priceTouch: { [key: string]: number } = {};
  const tolerance = 0.02; // 2% tolerance for price levels
  
  // Find local highs and lows
  for (let i = 2; i < data.length - 2; i++) {
    const current = data[i];
    const prev2 = data[i - 2];
    const prev1 = data[i - 1];
    const next1 = data[i + 1];
    const next2 = data[i + 2];
    
    // Local high (resistance)
    if (current.high > prev2.high && current.high > prev1.high && 
        current.high > next1.high && current.high > next2.high) {
      const priceKey = Math.round(current.high / tolerance).toString();
      priceTouch[priceKey] = (priceTouch[priceKey] || 0) + 1;
    }
    
    // Local low (support)
    if (current.low < prev2.low && current.low < prev1.low && 
        current.low < next1.low && current.low < next2.low) {
      const priceKey = Math.round(current.low / tolerance).toString();
      priceTouch[priceKey] = (priceTouch[priceKey] || 0) + 1;
    }
  }
  
  // Convert to levels with strength
  Object.entries(priceTouch).forEach(([priceKey, touches]) => {
    if (touches >= 2) { // Only consider levels touched at least twice
      const price = parseInt(priceKey) * tolerance;
      const avgPrice = data.reduce((sum, d) => sum + (d.high + d.low) / 2, 0) / data.length;
      
      levels.push({
        price,
        strength: touches,
        type: price > avgPrice ? 'resistance' : 'support'
      });
    }
  });
  
  return levels.sort((a, b) => b.strength - a.strength).slice(0, 5); // Top 5 levels
};