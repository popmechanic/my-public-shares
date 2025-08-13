import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from '@/components/DashboardHeader';
import PortfolioCard from '@/components/PortfolioCard';
import MarketTicker from '@/components/MarketTicker';
import TradingCard from '@/components/TradingCard';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, Vote, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { executeTradeTransaction } from '@/utils/tradeExecution';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  is_tradeable: boolean;
  total_shares: number;
  available_shares: number;
  current_price: number;
}

interface UserAccount {
  balance: number;
  total_portfolio_value: number;
}

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch tradeable profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_tradeable', true)
        .limit(6);

      if (profilesError) throw profilesError;

      // Fetch user account data
      const { data: accountData, error: accountError } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (accountError) throw accountError;

      setProfiles(profilesData || []);
      setUserAccount(accountData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleBuyShares = async (tradeableUserId: string, quantity: number, price: number) => {
    if (!user) return;

    console.log('Executing buy trade:', { tradeableUserId, quantity, price });
    
    const result = await executeTradeTransaction(
      user.id,
      tradeableUserId,
      quantity,
      price,
      'buy'
    );

    if (result.success) {
      toast({
        title: "Trade Executed!",
        description: `Successfully bought ${quantity} shares for $${(quantity * price).toFixed(2)}`,
      });
      // Refresh data to show updated balances and holdings
      await fetchData();
    } else {
      toast({
        title: "Trade Failed",
        description: result.error || "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handleBecomeTradeable = async () => {
    try {
      console.log('Attempting to become tradeable for user:', user?.id);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_tradeable: true,
          total_shares: 10000,
          available_shares: 10000,
          current_price: 100.00,
          market_cap: 1000000.00
        })
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error becoming tradeable:', error);
        toast({
          title: "Error",
          description: "Failed to become tradeable. Please try again.",
          variant: "destructive",
        });
      } else {
        console.log('Successfully became tradeable');
        toast({
          title: "Success!",
          description: "You are now tradeable! Others can buy shares in you.",
        });
        // Refresh the data to show updated status
        fetchData();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-lg text-muted-foreground">Loading your trading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex justify-center items-center space-x-2">
            <TrendingUp className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              PersonalStock
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-md">
            The world's first platform where you can buy shares in people and vote on their life decisions
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="text-center p-4 bg-card rounded-lg border">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Trade Shares</h3>
              <p className="text-sm text-muted-foreground">Buy and sell shares in people you believe in</p>
            </div>
            <div className="text-center p-4 bg-card rounded-lg border">
              <Vote className="h-8 w-8 text-secondary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Vote on Decisions</h3>
              <p className="text-sm text-muted-foreground">Influence life decisions with your voting power</p>
            </div>
            <div className="text-center p-4 bg-card rounded-lg border">
              <BarChart3 className="h-8 w-8 text-success mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Track Performance</h3>
              <p className="text-sm text-muted-foreground">Monitor your portfolio and track success</p>
            </div>
          </div>
          <Link to="/auth">
            <Button variant="hero" size="xl" className="mt-6">
              Start Trading
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalValue = (userAccount?.balance || 0) + (userAccount?.total_portfolio_value || 0);
  const todayChange = Math.random() * 50 - 25; // Mock data
  const todayChangePercent = (todayChange / totalValue) * 100;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <MarketTicker />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Portfolio Overview */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-primary" />
            Portfolio Overview
          </h2>
          <PortfolioCard
            balance={userAccount?.balance || 0}
            portfolioValue={userAccount?.total_portfolio_value || 0}
            totalValue={totalValue}
            todayChange={todayChange}
            todayChangePercent={todayChangePercent}
          />
        </section>

        {/* Featured Traders */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <Users className="h-6 w-6 mr-2 text-primary" />
              Featured Traders
            </h2>
            <Link to="/trade">
              <Button variant="outline">View All</Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => (
              <TradingCard
                key={profile.id}
                username={profile.username}
                fullName={profile.full_name || profile.username}
                currentPrice={Number(profile.current_price)}
                priceChange={Math.random() * 20 - 10} // Mock data
                priceChangePercent={Math.random() * 10 - 5} // Mock data
                totalShares={profile.total_shares}
                availableShares={profile.available_shares}
                avatarUrl={profile.avatar_url}
                onBuy={(quantity, price) => handleBuyShares(profile.user_id, quantity, price)}
                onSell={(quantity, price) => handleBuyShares(profile.user_id, quantity, price)} // Will be ignored on index page
              />
            ))}
          </div>
          
          {profiles.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Traders Available</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to become a tradeable person on the platform!
              </p>
              <Button variant="trading" onClick={handleBecomeTradeable}>Become Tradeable</Button>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/trade">
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                <TrendingUp className="h-8 w-8" />
                <span>Browse & Trade</span>
              </Button>
            </Link>
            <Link to="/vote">
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                <Vote className="h-8 w-8" />
                <span>Vote on Proposals</span>
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                <BarChart3 className="h-8 w-8" />
                <span>View Leaderboard</span>
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
