# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PersonalStock is a trading platform where users can buy and sell shares in people and vote on their life decisions. Built with React, TypeScript, and Supabase, this application features real-time trading, portfolio management, and social decision-making mechanics.

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Radix UI components
- **Styling**: Tailwind CSS v3 with custom gradient themes
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **State Management**: React Query (@tanstack/react-query) + React Context
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Routing**: React Router v6

## Development Commands

```bash
# Development
npm run dev          # Start development server on localhost:8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint check
npm run preview      # Preview production build

# No test command available - tests need to be set up
```

## Architecture Overview

### Database Schema (Supabase)

Core tables with Row Level Security (RLS) enabled:

- **profiles** - User profiles with trading status (`is_tradeable`, `current_price`, `available_shares`)
- **user_accounts** - Account balances and portfolio values 
- **shares** - Ownership records linking users to their holdings
- **transactions** - Complete trade history with buy/sell records
- **proposals** - Voting proposals for tradeable users
- **votes** - Individual votes with voting power based on shareholding

### Application Structure

```
src/
├── components/           # React components
│   ├── DashboardHeader   # Navigation and user menu
│   ├── PortfolioCard     # Portfolio overview display
│   ├── TradingCard       # Individual trader card with buy/sell
│   ├── MarketTicker      # Market data display
│   └── ui/              # shadcn/ui component library
├── pages/               # Route components
│   ├── Index.tsx        # Dashboard with portfolio overview
│   ├── Trade.tsx        # Trading interface with search/filters
│   ├── Auth.tsx         # Authentication forms
│   └── NotFound.tsx     # 404 page
├── contexts/
│   └── AuthContext.tsx  # Supabase auth state management
├── utils/
│   └── tradeExecution.ts # Core trading logic and validation
├── hooks/               # Custom React hooks
└── integrations/
    └── supabase/        # Supabase client and TypeScript types
```

### Key Features

**Trading System**:
- Real-time share trading with instant balance updates
- Portfolio tracking with profit/loss calculations
- Market cap calculations and share availability
- Transaction history and trade validation

**User Management**:
- Supabase authentication with email/password
- Automatic profile and account creation on signup
- Users can opt-in to become "tradeable" (issue shares)
- Default starting balance: $1,000

**Social Features** (Partially Implemented):
- Voting system for shareholder decision-making
- Proposals with multiple choice options
- Voting power based on share ownership

## Development Patterns

### Authentication Flow
1. AuthContext manages Supabase auth state
2. Protected routes redirect to `/auth` if not authenticated
3. User profiles auto-created via database trigger on signup
4. RLS policies enforce data access based on `auth.uid()`

### Trading Transaction Flow
1. Validate user balance and share availability
2. Update buyer balance and seller's available shares
3. Create/update ownership records in shares table
4. Record transaction for audit trail
5. All operations use optimistic UI updates

### State Management
- **Global State**: AuthContext for user session
- **Server State**: React Query for API data with automatic caching
- **Form State**: React Hook Form for all user inputs
- **UI State**: Component-level useState for interactions

### Data Fetching Patterns
```typescript
// Example: Fetch trading data with React Query pattern
const { data: profiles } = await supabase
  .from('profiles')
  .select('*')
  .eq('is_tradeable', true)
  .order('market_cap', { ascending: false });
```

## Important Configuration

### Supabase Setup
- Project ID: `lkkslcmifoyfasizmend`
- RLS enabled on all tables with appropriate policies
- Auto-trigger creates profile + account on user signup
- Database migrations in `supabase/migrations/`

### TypeScript Configuration
- Path aliases: `@/*` maps to `./src/*`
- Relaxed settings for rapid development:
  - `noImplicitAny: false`
  - `strictNullChecks: false`
  - `noUnusedLocals: false`

### Vite Configuration
- Development server on port 8080
- React SWC plugin for fast refresh
- Lovable tagger for development component tracking

## Development Notes

### Mock Data Usage
- Price changes and performance metrics use `Math.random()` for demo purposes
- Replace with real market data APIs in production

### Security Considerations
- Supabase client keys are exposed (normal for public apps)
- RLS policies prevent unauthorized data access
- Trade validation happens client-side (add server-side validation)

### Styling System
- Custom Tailwind theme with gradient colors
- Component variants using `class-variance-authority`
- Responsive design with mobile-first approach
- Dark/light theme support via `next-themes`

## Advanced Features

### Professional Stock Charts
- **TradingView Lightweight Charts** integration for professional-grade financial visualization
- **Real-time OHLCV candlestick charts** with automatic data aggregation from transaction history
- **Technical indicators**: SMA (20, 50), EMA, VWAP with toggle controls
- **Volume analysis** with histogram overlay
- **Market status tracking** with pre-market, market hours, after-hours, and weekend detection
- **Interactive timeframes**: 1min, 5min, 15min, 1h, 1d intervals
- **Professional market data display**: Open, High, Low, Close, Volume statistics

### Chart Architecture
```typescript
// Key components for charting system:
src/components/
├── StockChart.tsx           # Main chart component with TradingView integration
├── StockChartModal.tsx      # Full-screen chart modal
└── TradingCard.tsx          # Updated with chart button

src/utils/
├── chartDataAggregation.ts  # OHLCV data processing from transactions
├── technicalIndicators.ts   # SMA, EMA, VWAP, RSI, MACD calculations
└── marketUtils.ts          # Market hours, status, realistic price simulation
```

### Chart Data Flow
1. **Transaction Aggregation**: Raw trade data → OHLCV candlestick format
2. **Time Interval Processing**: Configurable timeframes with proper time bucketing
3. **Technical Analysis**: Real-time indicator calculations on price data
4. **Market Context**: Realistic market hours and trading session awareness
5. **Sample Data Generation**: Automatic demo data when no real trades exist

### Known Limitations
- Trade execution not atomic (should use database functions)
- Limited error handling for network failures
- No test suite currently implemented
- Sample data used for demo purposes when no real transaction history exists

This is a Lovable-generated project with automatic deployment and version control integration.