import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardHeader = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="border-b border-border bg-card shadow-trading">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              PersonalStock
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-6">
            <Link to="/" className="text-foreground hover:text-primary transition-colors">
              Dashboard
            </Link>
            <Link to="/trade" className="text-foreground hover:text-primary transition-colors">
              Trade
            </Link>
            <Link to="/vote" className="text-foreground hover:text-primary transition-colors">
              Vote
            </Link>
            <Link to="/leaderboard" className="text-foreground hover:text-primary transition-colors">
              Leaderboard
            </Link>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">
                {user?.email?.split('@')[0] || 'Trader'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;