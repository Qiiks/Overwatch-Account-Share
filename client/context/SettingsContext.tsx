'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

interface Settings {
  allow_registration: boolean;
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  refetchSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Public route: GET /api/auth/registration-status -> { allow_registration }
      const data = await apiGet<{ allow_registration?: boolean }>('/auth/registration-status');
      setSettings({ allow_registration: data?.allow_registration === true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
      // Fail closed: never advertise an open registration gate we could not confirm.
      setSettings({ allow_registration: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider
      value={{ settings, loading, error, refetchSettings: fetchSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
