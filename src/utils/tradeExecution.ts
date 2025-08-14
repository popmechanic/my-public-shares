import { supabase } from '@/integrations/supabase/client';

export interface TradeExecutionResult {
  success: boolean;
  error?: string;
  transactionId?: string;
}

export const executeTradeTransaction = async (
  buyerId: string,
  tradeableUserId: string,
  quantity: number,
  pricePerShare: number,
  transactionType: 'buy' | 'sell'
): Promise<TradeExecutionResult> => {
  try {
    console.log('Executing trade:', { buyerId, tradeableUserId, quantity, pricePerShare, transactionType });
    
    const totalAmount = quantity * pricePerShare;

    // Start a transaction-like operation using multiple database calls
    // In a real app, you'd use a database transaction or stored procedure
    
    // 1. Check buyer's balance
    const { data: buyerAccount, error: buyerError } = await supabase
      .from('user_accounts')
      .select('balance')
      .eq('user_id', buyerId)
      .single();

    if (buyerError) {
      console.error('Error fetching buyer account:', buyerError);
      return { success: false, error: 'Failed to fetch buyer account information' };
    }

    if (transactionType === 'buy' && buyerAccount.balance < totalAmount) {
      return { success: false, error: 'Insufficient funds' };
    }

    // 2. Check available shares
    const { data: tradeableProfile, error: profileError } = await supabase
      .from('profiles')
      .select('available_shares, current_price')
      .eq('user_id', tradeableUserId)
      .single();

    if (profileError) {
      console.error('Error fetching tradeable profile:', profileError);
      return { success: false, error: 'Failed to fetch trader information' };
    }

    if (transactionType === 'buy' && tradeableProfile.available_shares < quantity) {
      return { success: false, error: 'Insufficient shares available' };
    }

    // 3. Update buyer's balance
    const newBalance = transactionType === 'buy' 
      ? buyerAccount.balance - totalAmount
      : buyerAccount.balance + totalAmount;

    const { error: balanceError } = await supabase
      .from('user_accounts')
      .update({ balance: newBalance })
      .eq('user_id', buyerId);

    if (balanceError) {
      console.error('Error updating balance:', balanceError);
      return { success: false, error: 'Failed to update account balance' };
    }

    // 4. Update available shares
    const newAvailableShares = transactionType === 'buy'
      ? tradeableProfile.available_shares - quantity
      : tradeableProfile.available_shares + quantity;

    console.log('🔄 Updating available shares:', {
      tradeableUserId,
      currentShares: tradeableProfile.available_shares,
      newShares: newAvailableShares,
      change: transactionType === 'buy' ? -quantity : quantity
    });

    const { error: sharesError } = await supabase
      .from('profiles')
      .update({ available_shares: newAvailableShares })
      .eq('user_id', tradeableUserId);

    if (sharesError) {
      console.error('❌ Error updating available shares:', {
        error: sharesError,
        tradeableUserId,
        newAvailableShares,
        errorCode: sharesError.code,
        errorMessage: sharesError.message,
        errorDetails: sharesError.details,
        errorHint: sharesError.hint
      });
      
      // Check if this is an RLS policy error
      if (sharesError.message?.includes('policy') || sharesError.code === '42501') {
        return { success: false, error: 'Permission denied: Cannot update share availability. This may be a Row Level Security policy issue.' };
      }
      
      return { success: false, error: 'Failed to update share availability' };
    }

    console.log('✅ Successfully updated available shares');

    // 5. Update or create shares ownership record
    const { data: existingShares, error: existingSharesError } = await supabase
      .from('shares')
      .select('*')
      .eq('owner_id', buyerId)
      .eq('tradeable_user_id', tradeableUserId)
      .maybeSingle();

    if (existingSharesError) {
      console.error('Error checking existing shares:', existingSharesError);
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
          console.error('Error deleting shares record:', deleteError);
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
          console.error('Error updating shares:', updateSharesError);
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
        console.error('Error creating shares record:', insertSharesError);
        return { success: false, error: 'Failed to create shares record' };
      }
    } else {
      return { success: false, error: 'Cannot sell shares you do not own' };
    }

    // 6. Record the transaction
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
      console.error('Error recording transaction:', transactionError);
      return { success: false, error: 'Failed to record transaction' };
    }

    console.log('Trade executed successfully:', transaction.id);
    return { 
      success: true, 
      transactionId: transaction.id 
    };

  } catch (error) {
    console.error('Unexpected error during trade execution:', error);
    return { success: false, error: 'An unexpected error occurred during trade execution' };
  }
};