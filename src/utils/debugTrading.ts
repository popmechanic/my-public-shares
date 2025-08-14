import { supabase } from '@/integrations/supabase/client';

export interface TradingDebugInfo {
  user: {
    id: string;
    username: string;
    email?: string;
  };
  profile?: {
    id: string;
    user_id: string;
    username: string;
    is_tradeable: boolean;
    total_shares: number;
    available_shares: number;
    current_price: number;
  };
  account?: {
    id: string;
    user_id: string;
    balance: number;
    total_portfolio_value: number;
  };
  ownedShares: Array<{
    id: string;
    owner_id: string;
    tradeable_user_id: string;
    quantity: number;
    average_price: number;
    trader_username?: string;
  }>;
  transactions: Array<{
    id: string;
    buyer_id: string;
    seller_id: string | null;
    tradeable_user_id: string;
    transaction_type: string;
    quantity: number;
    price_per_share: number;
    total_amount: number;
    created_at: string;
    trader_username?: string;
  }>;
  calculatedTotals: {
    totalSharesBought: number;
    totalSharesSold: number;
    netShares: number;
    expectedAvailableShares?: number;
    actualAvailableShares?: number;
    shareDiscrepancy?: number;
  };
}

export const debugUserTradingData = async (username: string): Promise<TradingDebugInfo | null> => {
  try {
    console.log(`🔍 Debugging trading data for user: ${username}`);

    // Get user info
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting current user:', userError);
      return null;
    }

    // Get target user's profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return null;
    }

    // Get user's account data
    const { data: accountData, error: accountError } = await supabase
      .from('user_accounts')
      .select('*')
      .eq('user_id', profileData.user_id)
      .single();

    if (accountError) {
      console.error('Error fetching account:', accountError);
    }

    // Get all shares owned by this user
    const { data: sharesData, error: sharesError } = await supabase
      .from('shares')
      .select(`
        *,
        trader_profile:profiles!shares_tradeable_user_id_fkey(username)
      `)
      .eq('owner_id', profileData.user_id);

    if (sharesError) {
      console.error('Error fetching shares:', sharesError);
    }

    // Get all transactions involving this user
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        *,
        trader_profile:profiles!transactions_tradeable_user_id_fkey(username)
      `)
      .eq('buyer_id', profileData.user_id)
      .order('created_at', { ascending: false });

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
    }

    // Calculate totals from transactions
    const transactions = transactionsData || [];
    const totalSharesBought = transactions
      .filter(t => t.transaction_type === 'buy')
      .reduce((sum, t) => sum + t.quantity, 0);
    
    const totalSharesSold = transactions
      .filter(t => t.transaction_type === 'sell')
      .reduce((sum, t) => sum + t.quantity, 0);

    const netShares = totalSharesBought - totalSharesSold;

    // If this user is tradeable, check share consistency
    let expectedAvailableShares: number | undefined;
    let actualAvailableShares: number | undefined;
    let shareDiscrepancy: number | undefined;

    if (profileData.is_tradeable) {
      // Get all transactions where people bought shares in this user
      const { data: allTransactionsForUser, error: allTransError } = await supabase
        .from('transactions')
        .select('*')
        .eq('tradeable_user_id', profileData.user_id);

      if (!allTransError && allTransactionsForUser) {
        const totalBoughtFromUser = allTransactionsForUser
          .filter(t => t.transaction_type === 'buy')
          .reduce((sum, t) => sum + t.quantity, 0);
        
        const totalSoldBackToUser = allTransactionsForUser
          .filter(t => t.transaction_type === 'sell')
          .reduce((sum, t) => sum + t.quantity, 0);

        expectedAvailableShares = profileData.total_shares - (totalBoughtFromUser - totalSoldBackToUser);
        actualAvailableShares = profileData.available_shares;
        shareDiscrepancy = actualAvailableShares - expectedAvailableShares;
      }
    }

    const debugInfo: TradingDebugInfo = {
      user: {
        id: profileData.user_id,
        username: profileData.username,
        email: userData.user?.email,
      },
      profile: profileData,
      account: accountData,
      ownedShares: (sharesData || []).map(share => ({
        ...share,
        trader_username: share.trader_profile?.username,
      })),
      transactions: transactions.map(transaction => ({
        ...transaction,
        trader_username: transaction.trader_profile?.username,
      })),
      calculatedTotals: {
        totalSharesBought,
        totalSharesSold,
        netShares,
        expectedAvailableShares,
        actualAvailableShares,
        shareDiscrepancy,
      },
    };

    console.log('📊 Debug Info:', debugInfo);
    return debugInfo;

  } catch (error) {
    console.error('Error in debugUserTradingData:', error);
    return null;
  }
};

export const debugAllTradeableUsers = async (): Promise<void> => {
  try {
    console.log('🔍 Debugging all tradeable users...');

    const { data: tradeableUsers, error } = await supabase
      .from('profiles')
      .select('username, user_id, total_shares, available_shares')
      .eq('is_tradeable', true);

    if (error) {
      console.error('Error fetching tradeable users:', error);
      return;
    }

    for (const user of tradeableUsers) {
      console.log(`\n👤 Checking ${user.username}:`);
      
      // Get all transactions for this tradeable user
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('tradeable_user_id', user.user_id);

      if (transError) {
        console.error(`Error fetching transactions for ${user.username}:`, transError);
        continue;
      }

      const totalBought = transactions
        ?.filter(t => t.transaction_type === 'buy')
        .reduce((sum, t) => sum + t.quantity, 0) || 0;
      
      const totalSold = transactions
        ?.filter(t => t.transaction_type === 'sell')
        .reduce((sum, t) => sum + t.quantity, 0) || 0;

      const expectedAvailable = user.total_shares - (totalBought - totalSold);
      const discrepancy = user.available_shares - expectedAvailable;

      console.log(`  Total Shares: ${user.total_shares}`);
      console.log(`  Bought by others: ${totalBought}`);
      console.log(`  Sold back: ${totalSold}`);
      console.log(`  Expected Available: ${expectedAvailable}`);
      console.log(`  Actual Available: ${user.available_shares}`);
      console.log(`  Discrepancy: ${discrepancy}`);
      
      if (discrepancy !== 0) {
        console.warn(`  ⚠️  DISCREPANCY FOUND for ${user.username}: ${discrepancy} shares`);
      } else {
        console.log(`  ✅ Shares consistent for ${user.username}`);
      }
    }
  } catch (error) {
    console.error('Error in debugAllTradeableUsers:', error);
  }
};

// Function to fix share count discrepancies
export const fixShareCountDiscrepancies = async (): Promise<void> => {
  try {
    console.log('🔧 Fixing share count discrepancies...');

    const { data: tradeableUsers, error } = await supabase
      .from('profiles')
      .select('id, username, user_id, total_shares, available_shares')
      .eq('is_tradeable', true);

    if (error) {
      console.error('Error fetching tradeable users:', error);
      return;
    }

    for (const user of tradeableUsers) {
      // Get all transactions for this tradeable user
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('tradeable_user_id', user.user_id);

      if (transError) {
        console.error(`Error fetching transactions for ${user.username}:`, transError);
        continue;
      }

      const totalBought = transactions
        ?.filter(t => t.transaction_type === 'buy')
        .reduce((sum, t) => sum + t.quantity, 0) || 0;
      
      const totalSold = transactions
        ?.filter(t => t.transaction_type === 'sell')
        .reduce((sum, t) => sum + t.quantity, 0) || 0;

      const correctAvailableShares = user.total_shares - (totalBought - totalSold);

      if (user.available_shares !== correctAvailableShares) {
        console.log(`🔧 Fixing ${user.username}: ${user.available_shares} → ${correctAvailableShares}`);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ available_shares: correctAvailableShares })
          .eq('id', user.id);

        if (updateError) {
          console.error(`Error updating ${user.username}:`, updateError);
        } else {
          console.log(`✅ Fixed ${user.username}`);
        }
      }
    }

    console.log('🎉 Share count fix complete!');
  } catch (error) {
    console.error('Error fixing share counts:', error);
  }
};