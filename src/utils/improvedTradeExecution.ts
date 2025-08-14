import { supabase } from '@/integrations/supabase/client';

export interface TradeExecutionResult {
  success: boolean;
  error?: string;
  transactionId?: string;
}

export const executeTradeTransactionImproved = async (
  buyerId: string,
  tradeableUserId: string,
  quantity: number,
  pricePerShare: number,
  transactionType: 'buy' | 'sell'
): Promise<TradeExecutionResult> => {
  try {
    console.log('🔄 Executing improved trade:', { buyerId, tradeableUserId, quantity, pricePerShare, transactionType });
    
    const totalAmount = quantity * pricePerShare;

    // Start by checking constraints BEFORE making any changes
    console.log('📋 Step 1: Validating constraints...');

    // 1. Check buyer's balance
    const { data: buyerAccount, error: buyerError } = await supabase
      .from('user_accounts')
      .select('balance')
      .eq('user_id', buyerId)
      .single();

    if (buyerError) {
      console.error('❌ Error fetching buyer account:', buyerError);
      return { success: false, error: 'Failed to fetch buyer account information' };
    }

    if (transactionType === 'buy' && buyerAccount.balance < totalAmount) {
      console.error('❌ Insufficient funds');
      return { success: false, error: 'Insufficient funds' };
    }

    // 2. Check available shares
    const { data: tradeableProfile, error: profileError } = await supabase
      .from('profiles')
      .select('available_shares, current_price, total_shares')
      .eq('user_id', tradeableUserId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching tradeable profile:', profileError);
      return { success: false, error: 'Failed to fetch trader information' };
    }

    if (transactionType === 'buy' && tradeableProfile.available_shares < quantity) {
      console.error('❌ Insufficient shares available');
      return { success: false, error: 'Insufficient shares available' };
    }

    // 3. For sell orders, verify user owns enough shares
    if (transactionType === 'sell') {
      const { data: existingShares, error: existingSharesError } = await supabase
        .from('shares')
        .select('quantity')
        .eq('owner_id', buyerId)
        .eq('tradeable_user_id', tradeableUserId)
        .single();

      if (existingSharesError || !existingShares || existingShares.quantity < quantity) {
        console.error('❌ Insufficient shares to sell');
        return { success: false, error: 'Cannot sell shares you do not own' };
      }
    }

    console.log('✅ Step 1: All constraints validated');

    // Now execute the trade steps with better error handling
    console.log('💰 Step 2: Recording transaction...');

    // Record the transaction FIRST for audit trail
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        buyer_id: buyerId,
        seller_id: transactionType === 'sell' ? buyerId : null,
        tradeable_user_id: tradeableUserId,
        transaction_type: transactionType,
        quantity: quantity,
        price_per_share: pricePerShare,
        total_amount: totalAmount
      })
      .select('id')
      .single();

    if (transactionError) {
      console.error('❌ Error recording transaction:', transactionError);
      return { success: false, error: 'Failed to record transaction' };
    }

    console.log('✅ Step 2: Transaction recorded with ID:', transaction.id);

    // Step 3: Update buyer's balance
    console.log('💳 Step 3: Updating buyer balance...');
    const newBalance = transactionType === 'buy' 
      ? buyerAccount.balance - totalAmount
      : buyerAccount.balance + totalAmount;

    const { error: balanceError } = await supabase
      .from('user_accounts')
      .update({ balance: newBalance })
      .eq('user_id', buyerId);

    if (balanceError) {
      console.error('❌ Error updating balance:', balanceError);
      // Try to clean up the transaction record
      await supabase.from('transactions').delete().eq('id', transaction.id);
      return { success: false, error: 'Failed to update account balance' };
    }

    console.log('✅ Step 3: Balance updated');

    // Step 4: Update available shares with extra verification
    console.log('📊 Step 4: Updating available shares...');
    const newAvailableShares = transactionType === 'buy'
      ? tradeableProfile.available_shares - quantity
      : tradeableProfile.available_shares + quantity;

    // Double-check the math
    if (newAvailableShares < 0) {
      console.error('❌ Would result in negative available shares');
      // Rollback balance
      await supabase.from('user_accounts').update({ balance: buyerAccount.balance }).eq('user_id', buyerId);
      await supabase.from('transactions').delete().eq('id', transaction.id);
      return { success: false, error: 'Invalid share calculation' };
    }

    if (newAvailableShares > tradeableProfile.total_shares) {
      console.error('❌ Would result in more available shares than total shares');
      // Rollback balance
      await supabase.from('user_accounts').update({ balance: buyerAccount.balance }).eq('user_id', buyerId);
      await supabase.from('transactions').delete().eq('id', transaction.id);
      return { success: false, error: 'Invalid share calculation' };
    }

    const { error: sharesError } = await supabase
      .from('profiles')
      .update({ available_shares: newAvailableShares })
      .eq('user_id', tradeableUserId);

    if (sharesError) {
      console.error('❌ Error updating available shares:', sharesError);
      // Rollback balance
      await supabase.from('user_accounts').update({ balance: buyerAccount.balance }).eq('user_id', buyerId);
      await supabase.from('transactions').delete().eq('id', transaction.id);
      return { success: false, error: 'Failed to update share availability' };
    }

    console.log('✅ Step 4: Available shares updated');

    // Step 5: Update or create shares ownership record
    console.log('🏷️ Step 5: Updating ownership records...');
    const { data: existingShares, error: existingSharesError } = await supabase
      .from('shares')
      .select('*')
      .eq('owner_id', buyerId)
      .eq('tradeable_user_id', tradeableUserId)
      .maybeSingle();

    if (existingSharesError) {
      console.error('❌ Error checking existing shares:', existingSharesError);
      // Rollback previous changes
      await supabase.from('user_accounts').update({ balance: buyerAccount.balance }).eq('user_id', buyerId);
      await supabase.from('profiles').update({ available_shares: tradeableProfile.available_shares }).eq('user_id', tradeableUserId);
      await supabase.from('transactions').delete().eq('id', transaction.id);
      return { success: false, error: 'Failed to check existing shares' };
    }

    if (existingShares) {
      // Update existing shares
      const newQuantity = transactionType === 'buy'
        ? existingShares.quantity + quantity
        : existingShares.quantity - quantity;
      
      const newAveragePrice = transactionType === 'buy'
        ? ((existingShares.quantity * existingShares.average_price) + (quantity * pricePerShare)) / (existingShares.quantity + quantity)
        : existingShares.average_price; // Keep same average on sell

      if (newQuantity <= 0) {
        // Delete the shares record if quantity becomes 0 or negative
        const { error: deleteError } = await supabase
          .from('shares')
          .delete()
          .eq('id', existingShares.id);

        if (deleteError) {
          console.error('❌ Error deleting shares record:', deleteError);
          // Rollback
          await supabase.from('user_accounts').update({ balance: buyerAccount.balance }).eq('user_id', buyerId);
          await supabase.from('profiles').update({ available_shares: tradeableProfile.available_shares }).eq('user_id', tradeableUserId);
          await supabase.from('transactions').delete().eq('id', transaction.id);
          return { success: false, error: 'Failed to update shares record' };
        }
      } else {
        const { error: updateSharesError } = await supabase
          .from('shares')
          .update({ 
            quantity: newQuantity,
            average_price: newAveragePrice
          })
          .eq('id', existingShares.id);

        if (updateSharesError) {
          console.error('❌ Error updating shares:', updateSharesError);
          // Rollback
          await supabase.from('user_accounts').update({ balance: buyerAccount.balance }).eq('user_id', buyerId);
          await supabase.from('profiles').update({ available_shares: tradeableProfile.available_shares }).eq('user_id', tradeableUserId);
          await supabase.from('transactions').delete().eq('id', transaction.id);
          return { success: false, error: 'Failed to update shares record' };
        }
      }
    } else if (transactionType === 'buy') {
      // Create new shares record
      const { error: insertSharesError } = await supabase
        .from('shares')
        .insert({
          owner_id: buyerId,
          tradeable_user_id: tradeableUserId,
          quantity: quantity,
          average_price: pricePerShare
        });

      if (insertSharesError) {
        console.error('❌ Error creating shares record:', insertSharesError);
        // Rollback
        await supabase.from('user_accounts').update({ balance: buyerAccount.balance }).eq('user_id', buyerId);
        await supabase.from('profiles').update({ available_shares: tradeableProfile.available_shares }).eq('user_id', tradeableUserId);
        await supabase.from('transactions').delete().eq('id', transaction.id);
        return { success: false, error: 'Failed to create shares record' };
      }
    }

    console.log('✅ Step 5: Ownership records updated');
    console.log('🎉 Trade executed successfully:', transaction.id);
    
    return { 
      success: true, 
      transactionId: transaction.id 
    };

  } catch (error) {
    console.error('💥 Unexpected error during trade execution:', error);
    return { success: false, error: 'An unexpected error occurred during trade execution' };
  }
};