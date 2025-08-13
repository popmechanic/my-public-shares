import React from 'react';

interface TickerItem {
  username: string;
  price: number;
  change: number;
  changePercent: number;
}

const MarketTicker = () => {
  // Mock data for the ticker
  const tickerData: TickerItem[] = [
    { username: "john_doe", price: 125.50, change: 5.25, changePercent: 4.36 },
    { username: "jane_trader", price: 89.75, change: -2.10, changePercent: -2.29 },
    { username: "crypto_king", price: 210.00, change: 15.75, changePercent: 8.11 },
    { username: "art_lover", price: 67.25, change: 1.50, changePercent: 2.28 },
    { username: "tech_guru", price: 156.00, change: -8.25, changePercent: -5.02 },
  ];

  return (
    <div className="bg-card border-y border-border shadow-trading overflow-hidden">
      <div className="flex animate-ticker space-x-12 py-3">
        {/* Duplicate the ticker items for seamless loop */}
        {[...tickerData, ...tickerData].map((item, index) => (
          <div key={index} className="flex items-center space-x-4 whitespace-nowrap min-w-max">
            <span className="font-medium text-foreground">{item.username.toUpperCase()}</span>
            <span className="text-primary font-bold">${item.price.toFixed(2)}</span>
            <span className={`text-sm ${item.change >= 0 ? 'text-success' : 'text-destructive'}`}>
              {item.change >= 0 ? '+' : ''}${item.change.toFixed(2)} 
              ({item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketTicker;