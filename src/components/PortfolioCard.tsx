import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

interface PortfolioCardProps {
  balance: number;
  portfolioValue: number;
  totalValue: number;
  todayChange: number;
  todayChangePercent: number;
}

const PortfolioCard = ({ 
  balance, 
  portfolioValue, 
  totalValue, 
  todayChange, 
  todayChangePercent 
}: PortfolioCardProps) => {
  const isPositive = todayChange >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Account Balance */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-secondary">
            ${balance.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Available for trading
          </p>
        </CardContent>
      </Card>

      {/* Portfolio Value */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            ${portfolioValue.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Current holdings value
          </p>
        </CardContent>
      </Card>

      {/* Total Value */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            ${totalValue.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Cash + Portfolio
          </p>
        </CardContent>
      </Card>

      {/* Today's Change */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Change</CardTitle>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}${todayChange.toFixed(2)}
          </div>
          <p className={`text-xs ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{todayChangePercent.toFixed(2)}% today
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioCard;