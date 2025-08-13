import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, TrendingDown, Users, Vote } from 'lucide-react';

interface TradingCardProps {
  username: string;
  fullName: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  totalShares: number;
  availableShares: number;
  avatarUrl?: string;
  isOwn?: boolean;
  ownedShares?: number;
  onBuy?: (quantity: number, price: number) => void;
  onSell?: (quantity: number, price: number) => void;
}

const TradingCard = ({
  username,
  fullName,
  currentPrice,
  priceChange,
  priceChangePercent,
  totalShares,
  availableShares,
  avatarUrl,
  isOwn = false,
  ownedShares = 0,
  onBuy,
  onSell
}: TradingCardProps) => {
  const [quantity, setQuantity] = useState(1);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  
  const isPositive = priceChange >= 0;
  const totalValue = quantity * currentPrice;
  const marketCap = totalShares * currentPrice;

  const handleTrade = () => {
    if (tradeType === 'buy' && onBuy) {
      onBuy(quantity, currentPrice);
    } else if (tradeType === 'sell' && onSell) {
      onSell(quantity, currentPrice);
    }
  };

  return (
    <Card className="bg-gradient-card border-border shadow-card hover:shadow-glow transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatarUrl} alt={username} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{fullName}</CardTitle>
              <p className="text-sm text-muted-foreground">@{username}</p>
            </div>
          </div>
          {isOwn && (
            <Badge variant="secondary" className="text-xs">
              Your Profile
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Price Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="text-2xl font-bold text-primary">${currentPrice.toFixed(2)}</p>
            <div className={`flex items-center space-x-1 text-sm ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{isPositive ? '+' : ''}${priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Market Cap</p>
            <p className="text-xl font-bold text-foreground">${marketCap.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">{totalShares.toLocaleString()} total shares</p>
          </div>
        </div>

        {/* Shares Available */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Available Shares</span>
            </div>
            <span className="font-medium">{availableShares.toLocaleString()}</span>
          </div>
          
          {ownedShares > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">You Own</span>
              </div>
              <span className="font-bold text-primary">{ownedShares.toLocaleString()} shares</span>
            </div>
          )}
        </div>

        {/* Trading Controls */}
        {!isOwn && (
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Button
                variant={tradeType === 'buy' ? 'trading' : 'outline'}
                size="sm"
                onClick={() => setTradeType('buy')}
                className="flex-1"
              >
                Buy
              </Button>
              <Button
                variant={tradeType === 'sell' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setTradeType('sell')}
                className="flex-1"
              >
                Sell
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min="1"
                  max={tradeType === 'buy' ? availableShares : ownedShares}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="Quantity"
                />
              </div>
              <Button
                onClick={handleTrade}
                variant={tradeType === 'buy' ? 'success' : 'destructive'}
                className="min-w-[100px]"
                disabled={tradeType === 'sell' && ownedShares === 0}
              >
                {tradeType === 'buy' ? 'Buy' : 'Sell'} ${totalValue.toFixed(2)}
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Vote className="h-4 w-4 mr-2" />
            Proposals
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-2" />
            Chart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingCard;