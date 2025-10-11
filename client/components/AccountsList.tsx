'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import { CyberpunkCredentialDisplay } from './CyberpunkCredentialDisplay';
import { Shield, Users, User, Lock, Unlock } from 'lucide-react';

interface AccountOwner {
  id: string;
  username: string;
}

interface OverwatchAccount {
  id: string;
  accountTag: string;
  accountEmail: string;
  accountPassword: string;
  rank?: string;
  mainHeroes?: string[];
  owner: AccountOwner;
  hasAccess: boolean;
  accessType: 'owner' | 'shared' | 'none';
  otp?: string;
}

interface Credentials {
  accountTag: string;
  accountEmail: string;
  accountPassword: string;
  otp: string;
  hasAccess: boolean;
  accessType: string;
}

interface AccountsListProps {
  onDataChange?: () => void | Promise<void>;
}

export function AccountsList({ onDataChange }: AccountsListProps = {}) {
  const [accounts, setAccounts] = useState<OverwatchAccount[]>([]);
  const [credentials, setCredentials] = useState<Record<string, Credentials>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Fetch credentials for a specific account
  const fetchCredentials = async (accountId: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5001";
      const token = localStorage.getItem("auth_token");
      
      const response = await fetch(
        `${apiBase}/api/overwatch-accounts/${accountId}/credentials`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` })
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setCredentials(prev => ({
          ...prev,
          [accountId]: data.data
        }));
        toast.success('Credentials fetched successfully');
      } else {
        toast.error('Failed to fetch credentials');
      }
    } catch (error) {
      console.error("Error fetching credentials:", error);
      toast.error('Failed to fetch credentials');
    }
  };

  // Request access to an account
  const requestAccess = async (accountId: string) => {
    toast.info('Access request feature coming soon!');
    // TODO: Implement access request functionality
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';
        
        // Use the new endpoint that returns all accounts with conditional credentials
        const res = await fetch(`${apiBase}/api/overwatch-accounts/all-public`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        
        if (!res.ok) {
          // Fallback to the regular endpoint if the new one doesn't exist yet
          const fallbackRes = await fetch(`${apiBase}/api/overwatch-accounts`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          
          if (!fallbackRes.ok) throw new Error('Failed to fetch accounts.');
          
          const fallbackData = await fallbackRes.json();
          const accountsData = fallbackData.data || [];
          
          // Map old format to new format
          const mappedAccounts = accountsData.map((acc: any) => ({
            id: acc.id,
            accountTag: acc.accountTag || acc.accounttag,
            accountEmail: acc.accountEmail || acc.accountemail || 'ENCRYPTED',
            accountPassword: 'ENCRYPTED',
            rank: acc.rank,
            mainHeroes: acc.mainHeroes || acc.mainheroes,
            owner: acc.owner || { id: acc.owner_id, username: 'Unknown' },
            hasAccess: acc.isOwner || false,
            accessType: acc.isOwner ? 'owner' : 'none',
            otp: acc.otp,
          }));
          
          setAccounts(mappedAccounts);
        } else {
          const response = await res.json();
          setAccounts(response.data || []);
        }
      } catch (error: any) {
        console.error('Error fetching accounts:', error);
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();

    // Establish WebSocket connection with authentication
    const socketUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';
    const token = localStorage.getItem('auth_token');
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'], // Allow both transports
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: token || undefined // Send token if available
      }
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected for OTP updates');
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
    });

    // Listen for OTP events
    newSocket.on('otp', (data: { accountTag: string; otp: string }) => {
      console.log('Received OTP update:', data);
      
      // Update the accounts state with the new OTP
      setAccounts(prevAccounts =>
        prevAccounts.map(account =>
          account.accountTag === data.accountTag
            ? { ...account, otp: data.otp }
            : account
        )
      );
      
      // Update credentials if we have them cached
      setCredentials(prev => {
        const updatedCreds = { ...prev };
        Object.keys(updatedCreds).forEach(key => {
          if (updatedCreds[key].accountTag === data.accountTag) {
            updatedCreds[key].otp = data.otp;
          }
        });
        return updatedCreds;
      });
    });

    setSocket(newSocket);

    // Cleanup function to disconnect socket when component unmounts
    return () => {
      if (newSocket) {
        console.log('Disconnecting WebSocket');
        newSocket.disconnect();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-cyan-400 terminal-text">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold neon-cyan mb-2">OVERWATCH ACCOUNTS DATABASE</h2>
        <p className="text-gray-400 text-sm">
          All accounts are visible • Credentials require authorization
        </p>
      </div>

      {/* Accounts Grid */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {accounts.length > 0 ? (
          accounts.map(account => (
            <div 
              key={account.id} 
              className="account-card bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-lg p-6 relative overflow-hidden"
            >
              {/* Account Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-cyan-300 flex items-center gap-2">
                    {account.accountTag}
                    {account.hasAccess && account.accessType === 'owner' && (
                      <span title="Owner">
                        <Shield size={16} className="text-green-400" />
                      </span>
                    )}
                    {account.hasAccess && account.accessType === 'shared' && (
                      <span title="Shared Access">
                        <Users size={16} className="text-blue-400" />
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                    <User size={12} />
                    Owner: {account.owner?.username || 'Unknown'}
                  </p>
                  {account.rank && (
                    <p className="text-sm text-purple-400 mt-1">Rank: {account.rank}</p>
                  )}
                </div>
                
                {/* Access Badge */}
                <div className="flex gap-2">
                  {account.hasAccess ? (
                    <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded text-xs text-green-400 flex items-center gap-1">
                      <Unlock size={12} />
                      {account.accessType === 'owner' ? 'OWNER' : 'SHARED'}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-400 flex items-center gap-1">
                      <Lock size={12} />
                      LOCKED
                    </span>
                  )}
                </div>
              </div>

              {/* Credentials Display */}
              <div className="space-y-4">
                <CyberpunkCredentialDisplay
                  label="Battle.net Email"
                  value={credentials[account.id]?.accountEmail || account.accountEmail}
                  isEncrypted={!account.hasAccess}
                  hasAccess={account.hasAccess}
                  onDecrypt={() => fetchCredentials(account.id)}
                  accountId={account.id}
                />
                
                <CyberpunkCredentialDisplay
                  label="Password"
                  value={credentials[account.id]?.accountPassword || account.accountPassword}
                  isEncrypted={!account.hasAccess}
                  hasAccess={account.hasAccess}
                  onDecrypt={() => fetchCredentials(account.id)}
                  accountId={account.id}
                />
                
                <CyberpunkCredentialDisplay
                  label="OTP Code"
                  value={
                    credentials[account.id]?.otp || 
                    account.otp || 
                    (account.hasAccess ? '--:--:--' : 'CIPHER::OTP::LOCKED')
                  }
                  isEncrypted={!account.hasAccess}
                  hasAccess={account.hasAccess}
                  onDecrypt={() => fetchCredentials(account.id)}
                  accountId={account.id}
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                {account.hasAccess ? (
                  <>
                    {account.accessType === 'owner' && (
                      <button className="flex-1 px-4 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded text-sm text-cyan-300 hover:bg-cyan-500/30 transition-all">
                        Manage Account
                      </button>
                    )}
                    <button
                      onClick={() => {
                        // If ShareAccountModal integration is added later, pass onDataChange as onActionSuccess
                        // For now, just log or handle the share action
                        console.log('Share access clicked for account:', account.id);
                      }}
                      className="flex-1 px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded text-sm text-purple-300 hover:bg-purple-500/30 transition-all"
                    >
                      Share Access
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => requestAccess(account.id)}
                    className="flex-1 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded text-sm text-yellow-300 hover:bg-yellow-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Lock size={14} />
                    Request Access
                  </button>
                )}
              </div>

              {/* Main Heroes Display */}
              {account.mainHeroes && account.mainHeroes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-cyan-500/20">
                  <p className="text-xs text-gray-400 mb-2">Main Heroes:</p>
                  <div className="flex gap-2 flex-wrap">
                    {account.mainHeroes.map((hero, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs text-cyan-400"
                      >
                        {hero}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Scan line effect */}
              <div className="scan-line"></div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-12">
            <Lock size={48} className="mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">No Overwatch accounts found in the database.</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-8 pt-8 border-t border-cyan-500/20 text-center">
        <p className="text-xs text-gray-500">
          Total Accounts: {accounts.length} • 
          Accessible: {accounts.filter(a => a.hasAccess).length} • 
          Locked: {accounts.filter(a => !a.hasAccess).length}
        </p>
      </div>
    </div>
  );
}