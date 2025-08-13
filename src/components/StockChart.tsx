import React, { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi, 
  Time
} from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, Activity, Clock, LineChart } from 'lucide-react';
import { 
  fetchTransactionData, 
  aggregateToOHLCV, 
  generateSampleData,
  type TimeInterval,
  type ChartDataResult 
} from '@/utils/chartDataAggregation';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateVWAP, 
  findSupportResistanceLevels 
} from '@/utils/technicalIndicators';
import { 
  getMarketStatus, 
  formatMarketStatus, 
  getMarketStatusColor,
  getTradingSession 
} from '@/utils/marketUtils';

interface StockChartProps {
  tradeableUserId: string;
  username: string;
  currentPrice?: number;
  className?: string;
}

const StockChart: React.FC<StockChartProps> = ({ 
  tradeableUserId, 
  username, 
  currentPrice,
  className = '' 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  
  const [chartData, setChartData] = useState<ChartDataResult | null>(null);
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('1h');
  const [loading, setLoading] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showIndicators, setShowIndicators] = useState(true);
  const [marketStatus, setMarketStatus] = useState(() => getMarketStatus());

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      grid: {
        vertLines: {
          color: '#e2e8f0',
          style: 1,
          visible: true,
        },
        horzLines: {
          color: '#e2e8f0',
          style: 1,
          visible: true,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#3b82f6',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: '#3b82f6',
          style: 2,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 8,
        borderColor: '#e2e8f0',
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.4 : 0.1,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e', // Green color
      downColor: '#ef4444', // Red color  
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceScaleId: 'right',
    });

    // Create volume series if enabled
    let volumeSeries = null;
    if (showVolume) {
      volumeSeries = chart.addHistogramSeries({
        color: '#3b82f6',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
    }

    // Create technical indicator series if enabled
    let sma20Series = null;
    let sma50Series = null;
    let vwapSeries = null;
    
    if (showIndicators) {
      sma20Series = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
        title: 'SMA 20',
        priceScaleId: 'right',
      });
      
      sma50Series = chart.addLineSeries({
        color: '#8b5cf6',
        lineWidth: 2,
        title: 'SMA 50',
        priceScaleId: 'right',
      });
      
      vwapSeries = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
        lineStyle: 2, // Dashed line
        title: 'VWAP',
        priceScaleId: 'right',
      });
    }

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    sma20SeriesRef.current = sma20Series;
    sma50SeriesRef.current = sma50Series;
    vwapSeriesRef.current = vwapSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [showVolume, showIndicators]);

  // Fetch and update chart data
  useEffect(() => {
    const loadChartData = async () => {
      setLoading(true);
      try {
        // Fetch real transaction data
        let transactions = await fetchTransactionData(tradeableUserId);
        
        // If no real data, generate sample data for demonstration
        if (transactions.length === 0) {
          transactions = generateSampleData(tradeableUserId);
        }
        
        const result = aggregateToOHLCV(transactions, timeInterval);
        setChartData(result);
        
        // Update chart series
        if (candlestickSeriesRef.current) {
          candlestickSeriesRef.current.setData(
            result.candlestickData.map(item => ({
              time: item.time as Time,
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
            }))
          );
          
          if (showVolume && volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(
              result.volumeData.map(item => ({
                time: item.time as Time,
                value: item.value,
                color: item.value > 0 ? '#3b82f6' : '#94a3b8',
              }))
            );
          }
          
          // Calculate and update technical indicators
          if (showIndicators && result.candlestickData.length > 50) {
            const sma20Data = calculateSMA(result.candlestickData, 20);
            const sma50Data = calculateSMA(result.candlestickData, 50);
            const vwapData = calculateVWAP(result.candlestickData, result.volumeData);
            
            if (sma20SeriesRef.current && sma20Data.length > 0) {
              sma20SeriesRef.current.setData(
                sma20Data.map(item => ({
                  time: item.time as Time,
                  value: item.value,
                }))
              );
            }
            
            if (sma50SeriesRef.current && sma50Data.length > 0) {
              sma50SeriesRef.current.setData(
                sma50Data.map(item => ({
                  time: item.time as Time,
                  value: item.value,
                }))
              );
            }
            
            if (vwapSeriesRef.current && vwapData.length > 0) {
              vwapSeriesRef.current.setData(
                vwapData.map(item => ({
                  time: item.time as Time,
                  value: item.value,
                }))
              );
            }
          }
        }
        
      } catch (error) {
        console.error('Error loading chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [tradeableUserId, timeInterval, showVolume, showIndicators]);

  // Update market status every minute
  useEffect(() => {
    const updateMarketStatus = () => {
      setMarketStatus(getMarketStatus());
    };

    const interval = setInterval(updateMarketStatus, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const timeIntervals: { value: TimeInterval; label: string }[] = [
    { value: '1min', label: '1m' },
    { value: '5min', label: '5m' },
    { value: '15min', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '1d', label: '1d' },
  ];

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatChange = (change: number, percent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${formatPrice(change)} (${sign}${percent.toFixed(2)}%)`;
  };

  const isPositive = chartData ? chartData.priceChange >= 0 : true;

  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">@{username}</CardTitle>
              <p className="text-sm text-muted-foreground">Price Chart</p>
            </div>
          </div>
          
          {chartData && (
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                {formatPrice(currentPrice || chartData.currentPrice)}
              </div>
              <div className={`text-sm font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
                <div className="flex items-center space-x-1">
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{formatChange(chartData.priceChange, chartData.priceChangePercent)}</span>
                </div>
              </div>
              <div className="text-xs mt-1">
                <Badge 
                  variant={marketStatus.isOpen ? 'default' : 'secondary'} 
                  className={`text-xs ${getMarketStatusColor(marketStatus)}`}
                >
                  {formatMarketStatus(marketStatus)}
                </Badge>
              </div>
            </div>
          )}
        </div>
        
        {/* Chart Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex space-x-1">
            {timeIntervals.map((interval) => (
              <Button
                key={interval.value}
                variant={timeInterval === interval.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeInterval(interval.value)}
                className="h-7 px-2 text-xs"
              >
                {interval.label}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={showVolume ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowVolume(!showVolume)}
              className="h-7 px-2 text-xs"
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Volume
            </Button>
            
            <Button
              variant={showIndicators ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowIndicators(!showIndicators)}
              className="h-7 px-2 text-xs"
            >
              <LineChart className="h-3 w-3 mr-1" />
              Indicators
            </Button>
            
            {loading && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Loading...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div 
          ref={chartContainerRef} 
          className="w-full h-[400px] relative"
          style={{ minHeight: '400px' }}
        />
        
        {/* Market Stats */}
        {chartData && (
          <div className="p-4 border-t border-border space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Open</p>
                <p className="font-medium">{formatPrice(chartData.candlestickData[0]?.open || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">High</p>
                <p className="font-medium text-success">
                  {formatPrice(Math.max(...chartData.candlestickData.map(d => d.high)))}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Low</p>
                <p className="font-medium text-destructive">
                  {formatPrice(Math.min(...chartData.candlestickData.map(d => d.low)))}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Volume</p>
                <p className="font-medium">
                  {chartData.volumeData.reduce((sum, d) => sum + d.value, 0).toLocaleString()}
                </p>
              </div>
            </div>
            
            {/* Market Status Bar */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${marketStatus.isOpen ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
                <span className="text-sm font-medium">{getTradingSession()}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date().toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZoneName: 'short'
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockChart;