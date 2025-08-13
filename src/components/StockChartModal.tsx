import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import StockChart from './StockChart';

interface StockChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeableUserId: string;
  username: string;
  fullName: string;
  currentPrice: number;
}

const StockChartModal: React.FC<StockChartModalProps> = ({
  isOpen,
  onClose,
  tradeableUserId,
  username,
  fullName,
  currentPrice,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {fullName} (@{username}) - Stock Chart
          </DialogTitle>
          <DialogDescription>
            Professional trading chart with technical analysis
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <StockChart
            tradeableUserId={tradeableUserId}
            username={username}
            currentPrice={currentPrice}
            className="border-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StockChartModal;