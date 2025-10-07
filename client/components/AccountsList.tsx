'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

interface OverwatchAccount {
  id: string;
  accounttag: string;
  accountemail: string;
  otp?: string; // Optional OTP field for real-time updates
}

export function AccountsList() {
  const [accounts, setAccounts] = useState<OverwatchAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/overwatch-accounts`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch accounts.');
        const response = await res.json();
        // Fix: Access data.data instead of data.accounts based on API response structure
        const accountsData = response.data || response.accounts || [];
        // Map backend fields to component expectations
        const mappedAccounts = accountsData.map((acc: any) => ({
          id: acc.id,
          accounttag: acc.accountTag || acc.accounttag,
          accountemail: acc.accountEmail || acc.accountemail,
          otp: acc.otp,
        }));
        setAccounts(mappedAccounts);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();

    // Establish WebSocket connection
    const socketUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
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
          account.accounttag === data.accountTag
            ? { ...account, otp: data.otp }
            : account
        )
      );
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
    return <p className="p-4 text-center">Loading accounts...</p>;
  }

  return (
    <div className="divide-y divide-gray-700">
      {accounts.length > 0 ? (
        accounts.map(account => (
          <div key={account.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-bold text-lg">{account.accounttag}</p>
              <p className="text-sm text-gray-400">{account.accountemail}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Last OTP:</p>
              <p className="font-mono text-lg text-green-400">
                {account.otp || '--:--:--'}
              </p>
            </div>
          </div>
        ))
      ) : (
        <p className="p-4 text-center text-gray-400">No Overwatch accounts found.</p>
      )}
    </div>
  );
}