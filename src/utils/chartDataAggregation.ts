import { supabase } from '@/integrations/supabase/client';
import { 
  startOfDay, 
  startOfHour, 
  startOfMinute, 
  format, 
  parseISO,
  addDays,
  addHours,
  addMinutes,
  differenceInDays
} from 'date-fns';

export interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string | null;
  tradeable_user_id: string;
  transaction_type: 'buy' | 'sell';
  quantity: number;
  price_per_share: number;
  total_amount: number;
  created_at: string;
}

export interface CandlestickData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface VolumeData {
  time: number; // Unix timestamp in seconds
  value: number;
}

export interface ChartDataResult {
  candlestickData: CandlestickData[];
  volumeData: VolumeData[];
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
}

export type TimeInterval = '1min' | '5min' | '15min' | '1h' | '1d';

export const fetchTransactionData = async (tradeableUserId: string): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('tradeable_user_id', tradeableUserId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching transaction data:', error);
    return [];
  }

  return data || [];
};

export const getTimeIntervalStart = (date: Date, interval: TimeInterval): Date => {
  switch (interval) {
    case '1min':
      return startOfMinute(date);
    case '5min':
      const minute = date.getMinutes();
      const roundedMinute = Math.floor(minute / 5) * 5;
      const fiveMinStart = new Date(date);
      fiveMinStart.setMinutes(roundedMinute, 0, 0);
      return fiveMinStart;
    case '15min':
      const minute15 = date.getMinutes();
      const roundedMinute15 = Math.floor(minute15 / 15) * 15;
      const fifteenMinStart = new Date(date);
      fifteenMinStart.setMinutes(roundedMinute15, 0, 0);
      return fifteenMinStart;
    case '1h':
      return startOfHour(date);
    case '1d':
      return startOfDay(date);
    default:
      return startOfHour(date);
  }
};

export const generateTimeRange = (
  startDate: Date,
  endDate: Date,
  interval: TimeInterval
): Date[] => {
  const timePoints: Date[] = [];
  let current = getTimeIntervalStart(startDate, interval);
  
  while (current <= endDate) {
    timePoints.push(new Date(current));
    
    switch (interval) {
      case '1min':
        current = addMinutes(current, 1);
        break;
      case '5min':
        current = addMinutes(current, 5);
        break;
      case '15min':
        current = addMinutes(current, 15);
        break;
      case '1h':
        current = addHours(current, 1);
        break;
      case '1d':
        current = addDays(current, 1);
        break;
    }
  }
  
  return timePoints;
};

export const aggregateToOHLCV = (
  transactions: Transaction[],
  interval: TimeInterval = '1h'
): ChartDataResult => {
  if (transactions.length === 0) {
    // Return default data with starting price of $100
    const now = new Date();
    const startTime = Math.floor(now.getTime() / 1000) - 86400; // 24 hours ago
    
    return {
      candlestickData: [{
        time: startTime,
        open: 100,
        high: 100,
        low: 100,
        close: 100
      }],
      volumeData: [{
        time: startTime,
        value: 0
      }],
      currentPrice: 100,
      priceChange: 0,
      priceChangePercent: 0
    };
  }

  // Sort transactions by time
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Get time range
  const firstTransaction = sortedTransactions[0];
  const lastTransaction = sortedTransactions[sortedTransactions.length - 1];
  const startDate = parseISO(firstTransaction.created_at);
  const endDate = parseISO(lastTransaction.created_at);
  
  // Extend range to have more chart context
  const extendedStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before
  const extendedEndDate = new Date(Math.max(endDate.getTime(), Date.now()));

  const timePoints = generateTimeRange(extendedStartDate, extendedEndDate, interval);
  
  // Group transactions by time intervals
  const intervalMap = new Map<string, Transaction[]>();
  
  sortedTransactions.forEach(transaction => {
    const transactionDate = parseISO(transaction.created_at);
    const intervalStart = getTimeIntervalStart(transactionDate, interval);
    const key = intervalStart.toISOString();
    
    if (!intervalMap.has(key)) {
      intervalMap.set(key, []);
    }
    intervalMap.get(key)!.push(transaction);
  });

  // Generate candlestick data
  const candlestickData: CandlestickData[] = [];
  const volumeData: VolumeData[] = [];
  let lastPrice = 100; // Starting price
  
  timePoints.forEach(timePoint => {
    const key = timePoint.toISOString();
    const intervalTransactions = intervalMap.get(key) || [];
    
    let open = lastPrice;
    let high = lastPrice;
    let low = lastPrice;
    let close = lastPrice;
    let volume = 0;

    if (intervalTransactions.length > 0) {
      // Sort transactions within this interval by time
      const sortedInterval = intervalTransactions.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      open = sortedInterval[0].price_per_share;
      close = sortedInterval[sortedInterval.length - 1].price_per_share;
      
      // Calculate high and low
      const prices = sortedInterval.map(t => t.price_per_share);
      high = Math.max(...prices);
      low = Math.min(...prices);
      
      // Calculate volume
      volume = sortedInterval.reduce((sum, t) => sum + t.quantity, 0);
      
      lastPrice = close;
    } else {
      // No transactions in this interval - use last price for all OHLC
      open = high = low = close = lastPrice;
      volume = 0;
    }

    const timestamp = Math.floor(timePoint.getTime() / 1000);
    
    candlestickData.push({
      time: timestamp,
      open,
      high,
      low,
      close
    });

    volumeData.push({
      time: timestamp,
      value: volume
    });
  });

  // Calculate price change
  const firstPrice = candlestickData[0]?.open || 100;
  const currentPrice = lastPrice;
  const priceChange = currentPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

  return {
    candlestickData,
    volumeData,
    currentPrice,
    priceChange,
    priceChangePercent
  };
};

// Generate some sample historical data for demonstration
export const generateSampleData = (tradeableUserId: string): Transaction[] => {
  const sampleTransactions: Transaction[] = [];
  const now = new Date();
  const startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  
  let currentPrice = 100;
  let transactionId = 1;
  
  // Generate transactions every few hours with some randomness
  for (let i = 0; i < 50; i++) {
    const transactionTime = new Date(startTime.getTime() + (i * 3.5 * 60 * 60 * 1000)); // Every ~3.5 hours
    
    // Add some price volatility
    const priceChange = (Math.random() - 0.5) * 10; // Random change between -5 and +5
    currentPrice = Math.max(50, currentPrice + priceChange); // Don't go below $50
    
    const quantity = Math.floor(Math.random() * 100) + 1; // 1-100 shares
    
    sampleTransactions.push({
      id: `sample-${transactionId++}`,
      buyer_id: 'sample-buyer',
      seller_id: null,
      tradeable_user_id: tradeableUserId,
      transaction_type: 'buy',
      quantity,
      price_per_share: Number(currentPrice.toFixed(2)),
      total_amount: Number((quantity * currentPrice).toFixed(2)),
      created_at: transactionTime.toISOString()
    });
  }
  
  return sampleTransactions;
};