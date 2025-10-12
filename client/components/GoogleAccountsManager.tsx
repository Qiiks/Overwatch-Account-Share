'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from './ui/GlassCard';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { apiGet, apiPost, apiDelete } from '@/lib/api';

interface GoogleAccount {
  id: string;
  email: string;
  display_name: string;
  is_active: boolean;
  is_primary: boolean;
}

export function GoogleAccountsManager() {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      const data = await apiGet<{ accounts: GoogleAccount[] }>('/api/google-auth/accounts');
      setAccounts(data.accounts || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);
  
  const handleLinkAccount = async () => {
    try {
      const data = await apiPost<{ authUrl: string }>('/api/google-auth/otp/init', {
        redirectUrl: window.location.pathname
      });
      window.location.href = data.authUrl;
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUnlinkAccount = async (id: string) => {
    try {
      await apiDelete(`/api/google-auth/accounts/${id}`);
      toast.success('Account unlinked successfully.');
      fetchAccounts(); // Refresh the list
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-4">Linked Google Accounts for OTP</h3>
      <div className="space-y-4 mb-6">
        {isLoading ? (
          <p>Loading accounts...</p>
        ) : accounts.length > 0 ? (
          accounts.map(account => (
            <div key={account.id} className="flex justify-between items-center p-3 bg-white/10 rounded-lg">
              <div>
                <p className="font-medium">{account.display_name}</p>
                <p className="text-sm text-gray-400">{account.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {account.is_primary && <Badge>Primary</Badge>}
                <Button variant="destructive" size="sm" onClick={() => handleUnlinkAccount(account.id)}>Unlink</Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No Google accounts linked for OTP fetching.</p>
        )}
      </div>
      <Button onClick={handleLinkAccount}>Link New Google Account</Button>
    </GlassCard>
  );
}