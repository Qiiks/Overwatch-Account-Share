import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Share2, Users, Key, Shield, Clock, Settings, Crown } from 'lucide-react';
import DotGrid from '../components/DotGrid';
import Navigation from '../components/Navigation';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '../components/ui/glass-card';
import { GlassButton } from '../components/ui/glass-button';
import { useToast } from '../hooks/use-toast';
import AddAccountModal from '../components/modals/AddAccountModal';
import ShareAccountModal from '../components/modals/ShareAccountModal';
import AccountSettingsModal from '../components/modals/AccountSettingsModal';
import ManageAccountModal from '../components/modals/ManageAccountModal';
  
  interface AccountData {
    _id: string;
  gamertag: string;
  rank: string;
  heroes: string[];
  lastUsed: string;
  sharedWith: any[];
  status: 'available' | 'in-use' | 'maintenance';
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [modals, setModals] = useState({
    addAccount: false,
    shareAccount: false,
    accountSettings: false,
    manageAccount: false
  });
  const [selectedAccount, setSelectedAccount] = useState<AccountData | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [dashboardResponse, userResponse] = await Promise.all([
          fetch('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (dashboardResponse.ok && userResponse.ok) {
          const dashboardData = await dashboardResponse.json();
          const userData = await userResponse.json();
          setUser(userData.data);
          setAccounts(dashboardData.accounts);
          setRecentActivity(dashboardData.recentActivity);
          setOnlineUsers(dashboardData.onlineUsers);
        } else {
          throw new Error('Failed to fetch dashboard data');
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data.",
          variant: "destructive",
        });
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-green-500/20 text-green-400 border-green-400/30">Available</div>;
      case 'in-use':
        return <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-yellow-500/20 text-yellow-400 border-yellow-400/30">In Use</div>;
      case 'maintenance':
        return <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-red-500/20 text-red-400 border-red-400/30">Maintenance</div>;
      default:
        return <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">Unknown</div>;
    }
  };

  const openModal = (modalName: string, account?: AccountData) => {
    if (account) setSelectedAccount(account);
    setModals(prev => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName: string) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    if (modalName === 'manageAccount' || modalName === 'shareAccount') {
      setSelectedAccount(null);
    }
  };

  const handleAddAccount = (accountData: any) => {
    const newAccount: AccountData = {
      _id: Date.now().toString(),
      gamertag: accountData.gamertag,
      rank: accountData.rank,
      heroes: accountData.mainHeroes,
      lastUsed: 'Never',
      sharedWith: [],
      status: 'available'
    };
    setAccounts(prev => [...prev, newAccount]);
  };

  const handleUpdateAccount = (updatedAccount: AccountData) => {
    setAccounts(prev => prev.map(acc => 
      acc._id === updatedAccount._id ? updatedAccount : acc
    ));
  };

  const handleDeleteAccount = (accountId: string) => {
    setAccounts(prev => prev.filter(acc => acc._id !== accountId));
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <DotGrid />
        <div className="animate-pulse text-primary">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <DotGrid />
      <Navigation user={user} onLogout={handleLogout} />
      
      <main className="relative z-10 pt-20 px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bebas tracking-wide text-glass-foreground mb-2">
              DASHBOARD
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.username}! Manage your Overwatch accounts and sharing permissions.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <GlassCard>
              <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <GlassCardTitle className="text-sm font-medium">Owned Accounts</GlassCardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-2xl font-bold text-primary">{user?.accountsOwned}</div>
                <p className="text-xs text-muted-foreground">Active gaming accounts</p>
              </GlassCardContent>
            </GlassCard>

            <GlassCard>
              <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <GlassCardTitle className="text-sm font-medium">Shared Access</GlassCardTitle>
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-2xl font-bold text-primary">{user?.accountsShared}</div>
                <p className="text-xs text-muted-foreground">Total shared connections</p>
              </GlassCardContent>
            </GlassCard>

            <GlassCard>
              <GlassCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <GlassCardTitle className="text-sm font-medium">Active Users</GlassCardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-2xl font-bold text-primary">{onlineUsers}</div>
                <p className="text-xs text-muted-foreground">Currently online</p>
              </GlassCardContent>
            </GlassCard>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4 mb-8">
            <GlassButton
              variant="primary"
              className="flex items-center gap-2"
              onClick={() => openModal('addAccount')}
            >
              <Plus className="h-4 w-4" />
              Add New Account
            </GlassButton>
            <GlassButton
              variant="default"
              className="flex items-center gap-2"
              onClick={() => openModal('shareAccount')}
            >
              <Share2 className="h-4 w-4" />
              Share Account
            </GlassButton>
            <GlassButton
              variant="default"
              className="flex items-center gap-2"
              onClick={() => openModal('accountSettings')}
            >
              <Settings className="h-4 w-4" />
              Account Settings
            </GlassButton>
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <GlassCard key={account._id} className="hover:scale-105 transition-transform duration-200">
                <GlassCardHeader>
                  <div className="flex items-center justify-between">
                    <GlassCardTitle className="text-lg">{account.gamertag}</GlassCardTitle>
                    {getStatusBadge(account.status)}
                  </div>
                  <GlassCardDescription>
                    Rank: {account.rank} • Shared with {account.sharedWith.length} users
                  </GlassCardDescription>
                </GlassCardHeader>
                
                <GlassCardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-glass-foreground mb-2">Main Heroes</h4>
                      <div className="flex flex-wrap gap-1">
                        {account.heroes.map((hero) => (
                          <div key={hero} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs">
                            {hero}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Last used: {account.lastUsed}
                    </div>
                    
                    <div className="flex gap-2">
                      <GlassButton 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openModal('manageAccount', account)}
                      >
                        Manage
                      </GlassButton>
                      <GlassButton 
                        size="sm" 
                        variant="default" 
                        className="flex-1"
                        onClick={() => openModal('shareAccount', account)}
                      >
                        Share
                      </GlassButton>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="mt-12">
            <h2 className="text-2xl font-bebas tracking-wide text-glass-foreground mb-6">
              RECENT ACTIVITY
            </h2>
            
            <GlassCard>
              <GlassCardContent className="p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-primary/5">
                      {activity.type === 'share' && <Shield className="h-5 w-5 text-green-400" />}
                      {activity.type === 'update' && <Key className="h-5 w-5 text-blue-400" />}
                      {activity.type === 'join' && <Users className="h-5 w-5 text-purple-400" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AddAccountModal
        isOpen={modals.addAccount}
        onClose={() => closeModal('addAccount')}
        onSubmit={handleAddAccount}
      />
      
      <ShareAccountModal
        isOpen={modals.shareAccount}
        onClose={() => closeModal('shareAccount')}
        account={selectedAccount}
      />
      
      <AccountSettingsModal
        isOpen={modals.accountSettings}
        onClose={() => closeModal('accountSettings')}
      />
      
      <ManageAccountModal
        isOpen={modals.manageAccount}
        onClose={() => closeModal('manageAccount')}
        account={selectedAccount}
        onUpdate={handleUpdateAccount}
        onDelete={handleDeleteAccount}
      />
    </div>
  );
};

export default Dashboard;