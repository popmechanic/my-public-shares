// Market utility functions for realistic trading behavior

export interface MarketStatus {
  isOpen: boolean;
  status: 'pre-market' | 'market-open' | 'after-hours' | 'market-closed';
  nextOpenTime?: Date;
  nextCloseTime?: Date;
}

export const getMarketStatus = (): MarketStatus => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Market is closed on weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + (1 + 7 - dayOfWeek) % 7);
    nextMonday.setHours(9, 30, 0, 0); // 9:30 AM ET
    
    return {
      isOpen: false,
      status: 'market-closed',
      nextOpenTime: nextMonday,
    };
  }
  
  // Get current time in ET (approximate - would need proper timezone handling in production)
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute; // Minutes since midnight
  
  const preMarketStart = 4 * 60; // 4:00 AM ET
  const marketOpen = 9 * 60 + 30; // 9:30 AM ET
  const marketClose = 16 * 60; // 4:00 PM ET
  const afterHoursEnd = 20 * 60; // 8:00 PM ET
  
  if (currentTime < preMarketStart) {
    return {
      isOpen: false,
      status: 'market-closed',
      nextOpenTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0),
    };
  } else if (currentTime < marketOpen) {
    return {
      isOpen: false,
      status: 'pre-market',
      nextOpenTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
    };
  } else if (currentTime < marketClose) {
    return {
      isOpen: true,
      status: 'market-open',
      nextCloseTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0, 0),
    };
  } else if (currentTime < afterHoursEnd) {
    return {
      isOpen: false,
      status: 'after-hours',
      nextOpenTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 30, 0),
    };
  } else {
    return {
      isOpen: false,
      status: 'market-closed',
      nextOpenTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 30, 0),
    };
  }
};

export const formatMarketStatus = (status: MarketStatus): string => {
  switch (status.status) {
    case 'pre-market':
      return 'Pre-Market';
    case 'market-open':
      return 'Market Open';
    case 'after-hours':
      return 'After Hours';
    case 'market-closed':
      return 'Market Closed';
    default:
      return 'Unknown';
  }
};

export const getMarketStatusColor = (status: MarketStatus): string => {
  switch (status.status) {
    case 'market-open':
      return 'text-success';
    case 'pre-market':
    case 'after-hours':
      return 'text-warning';
    case 'market-closed':
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
};

// Simulate realistic price movements based on market conditions
export const generateRealisticPriceChange = (
  currentPrice: number,
  marketStatus: MarketStatus,
  volatility: number = 0.02 // 2% default volatility
): number => {
  let baseVolatility = volatility;
  
  // Adjust volatility based on market status
  switch (marketStatus.status) {
    case 'pre-market':
    case 'after-hours':
      baseVolatility *= 0.5; // Lower volume, less volatility
      break;
    case 'market-closed':
      return 0; // No price movement when market is closed
    case 'market-open':
      baseVolatility *= 1.2; // Higher volume, more volatility
      break;
  }
  
  // Generate random price change using normal distribution approximation
  const random1 = Math.random();
  const random2 = Math.random();
  const normalRandom = Math.sqrt(-2 * Math.log(random1)) * Math.cos(2 * Math.PI * random2);
  
  const priceChange = currentPrice * baseVolatility * normalRandom;
  
  // Ensure price doesn't go negative
  return Math.max(-currentPrice * 0.5, priceChange);
};

// Calculate realistic spreads (bid-ask spread)
export const calculateSpread = (price: number, volume: number): { bid: number; ask: number } => {
  // Spread percentage based on price and volume
  const baseSpread = 0.001; // 0.1% base spread
  const volumeAdjustment = Math.max(0.0001, 1 / Math.sqrt(volume + 1));
  const priceAdjustment = price < 10 ? 0.01 : price < 100 ? 0.005 : 0.001;
  
  const spreadPercent = baseSpread + volumeAdjustment + priceAdjustment;
  const spreadAmount = price * spreadPercent;
  
  return {
    bid: price - spreadAmount / 2,
    ask: price + spreadAmount / 2,
  };
};

// Format time for market display
export const formatMarketTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

// Trading session helpers
export const getTradingSession = (): string => {
  const status = getMarketStatus();
  const now = new Date();
  
  if (status.status === 'market-open') {
    const timeUntilClose = status.nextCloseTime ? status.nextCloseTime.getTime() - now.getTime() : 0;
    const hoursUntilClose = Math.floor(timeUntilClose / (1000 * 60 * 60));
    const minutesUntilClose = Math.floor((timeUntilClose % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursUntilClose > 0) {
      return `Market closes in ${hoursUntilClose}h ${minutesUntilClose}m`;
    } else {
      return `Market closes in ${minutesUntilClose}m`;
    }
  } else if (status.nextOpenTime) {
    const timeUntilOpen = status.nextOpenTime.getTime() - now.getTime();
    const hoursUntilOpen = Math.floor(timeUntilOpen / (1000 * 60 * 60));
    
    if (hoursUntilOpen < 24) {
      const minutesUntilOpen = Math.floor((timeUntilOpen % (1000 * 60 * 60)) / (1000 * 60));
      return `Market opens in ${hoursUntilOpen}h ${minutesUntilOpen}m`;
    } else {
      const daysUntilOpen = Math.floor(hoursUntilOpen / 24);
      return `Market opens in ${daysUntilOpen} day${daysUntilOpen > 1 ? 's' : ''}`;
    }
  }
  
  return formatMarketStatus(status);
};