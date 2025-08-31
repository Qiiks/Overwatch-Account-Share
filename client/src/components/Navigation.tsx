import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LayoutDashboard, Settings, LogOut, User } from 'lucide-react';
import { GlassButton } from './ui/glass-button';

interface NavigationProps {
  user?: {
    username: string;
    isAdmin: boolean;
  };
  onLogout?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    if (onLogout) onLogout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  if (!user) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bebas tracking-wider text-primary">
            OVERWATCH SHARE
          </Link>
          <div className="flex gap-4">
            <Link to="/login">
              <GlassButton variant="default">Login</GlassButton>
            </Link>
            <Link to="/register">
              <GlassButton variant="primary">Register</GlassButton>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bebas tracking-wider text-primary">
          OVERWATCH SHARE
        </Link>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{user.username}</span>
            {user.isAdmin && (
              <span className="px-2 py-1 text-xs bg-primary/20 text-primary rounded-full border border-primary/30">
                Admin
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Link to="/">
              <GlassButton 
                variant={isActive('/') ? 'primary' : 'ghost'} 
                size="sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </GlassButton>
            </Link>
            
            <Link to="/dashboard">
              <GlassButton 
                variant={isActive('/dashboard') ? 'primary' : 'ghost'} 
                size="sm"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </GlassButton>
            </Link>
            
            {user.isAdmin && (
              <Link to="/admin">
                <GlassButton 
                  variant={isActive('/admin') ? 'primary' : 'ghost'} 
                  size="sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </GlassButton>
              </Link>
            )}
            
            <GlassButton 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </GlassButton>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;