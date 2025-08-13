import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardHeader from '@/components/DashboardHeader';
import TradingCard from '@/components/TradingCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Search, Filter, BarChart3 } from 'lucide-react';
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
  market_cap: number;
}

interface UserAccount {
  balance: number;
  total_portfolio_value: number;
}

interface UserShares {
  id: string;
  tradeable_user_id: string;
  quantity: number;
  average_price: number;
  trader_profile?: Profile;
}

const Trade = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [userShares, setUserShares] = useState<UserShares[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'owned' | 'available'>('all');

  useEffect(() => {
    if (user) {
      fetchTradingData();
    }
  }, [user]);

  const fetchTradingData = async () => {
    try {
      console.log('Fetching trading data for user:', user?.id);
      
      // Fetch all tradeable profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_tradeable', true)
        .order('market_cap', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user account data
      const { data: accountData, error: accountError } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (accountError) throw accountError;

      // Fetch user's shares
      const { data: sharesData, error: sharesError } = await supabase
        .from('shares')
        .select('id, tradeable_user_id, quantity, average_price')
        .eq('owner_id', user?.id);

      if (sharesError) throw sharesError;

      // Enrich shares data with profile information
      const enrichedShares: UserShares[] = [];
      if (sharesData) {
        for (const share of sharesData) {
          const traderProfile = profilesData?.find(p => p.user_id === share.tradeable_user_id);
          enrichedShares.push({
            ...share,
            trader_profile: traderProfile
          });
        }
      }

      console.log('Fetched data:', { profilesData, accountData, enrichedShares });
      
      setProfiles(profilesData || []);
      setUserAccount(accountData);
      setUserShares(enrichedShares);
    } catch (error) {
      console.error('Error fetching trading data:', error);
      toast({
        title: "Error",
        description: "Failed to load trading data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async (tradeableUserId: string, quantity: number, price: number, type: 'buy' | 'sell') => {
    if (!user) return;

    console.log('Handling trade:', { tradeableUserId, quantity, price, type });
    
    const result = await executeTradeTransaction(
      user.id,
      tradeableUserId,
      quantity,
      price,
      type
    );

    if (result.success) {
      toast({
        title: "Trade Executed!",
        description: `Successfully ${type === 'buy' ? 'bought' : 'sold'} ${quantity} shares for $${(quantity * price).toFixed(2)}`,
      });
      // Refresh data to show updated balances and holdings
      await fetchTradingData();
    } else {
      toast({
        title: "Trade Failed",
        description: result.error || "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'owned') {
      return matchesSearch && userShares.some(share => share.tradeable_user_id === profile.user_id);
    } else if (filterType === 'available') {
      return matchesSearch && profile.available_shares > 0;
    }
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
            <p className="text-lg text-muted-foreground">Loading trading data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Trading Overview */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold flex items-center">
              <TrendingUp className="h-8 w-8 mr-3 text-primary" />
              Trading Center
            </h1>
            {userAccount && (
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="text-lg py-2 px-4">
                  Balance: ${userAccount.balance.toFixed(2)}
                </Badge>
                <Badge variant="outline" className="text-lg py-2 px-4">
                  Portfolio: ${userAccount.total_portfolio_value.toFixed(2)}
                </Badge>
              </div>
            )}
          </div>
        </section>

        {/* My Holdings */}
        {userShares.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <BarChart3 className="h-6 w-6 mr-2 text-primary" />
              My Holdings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userShares.map((share) => (
                <Card key={share.id} className="bg-gradient-card border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">@{share.trader_profile?.username || 'Unknown'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Shares:</span>
                        <span className="font-medium">{share.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg Price:</span>
                        <span className="font-medium">${share.average_price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Current Price:</span>
                        <span className="font-medium">${share.trader_profile?.current_price ? Number(share.trader_profile.current_price).toFixed(2) : '0.00'}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm text-muted-foreground">Market Value:</span>
                        <span className="font-bold text-primary">
                          ${share.trader_profile ? (share.quantity * Number(share.trader_profile.current_price)).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Market Search & Filters */}
        <section>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search traders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterType === 'owned' ? 'default' : 'outline'}
                onClick={() => setFilterType('owned')}
                size="sm"
              >
                My Holdings
              </Button>
              <Button
                variant={filterType === 'available' ? 'default' : 'outline'}
                onClick={() => setFilterType('available')}
                size="sm"
              >
                Available
              </Button>
            </div>
          </div>
        </section>

        {/* Available Traders */}
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Filter className="h-6 w-6 mr-2 text-primary" />
            {filterType === 'all' && 'All Traders'}
            {filterType === 'owned' && 'My Holdings'}
            {filterType === 'available' && 'Available Shares'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => {
              const userShare = userShares.find(share => share.tradeable_user_id === profile.user_id);
              return (
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
                  tradeableUserId={profile.user_id}
                  ownedShares={userShare?.quantity || 0}
                  onBuy={(quantity, price) => handleTrade(profile.user_id, quantity, price, 'buy')}
                  onSell={(quantity, price) => handleTrade(profile.user_id, quantity, price, 'sell')}
                />
              );
            })}
          </div>
          
          {filteredProfiles.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Traders Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms.' : 'No traders match your current filter.'}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Trade;