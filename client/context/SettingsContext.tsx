'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

interface Settings {
  allow_registration: boolean;
  registration_enabled_by?: string;
  registration_enabled_at?: string;
  registration_disabled_by?: string;
  registration_disabled_at?: string;
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

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiGet<
        | Settings
        | { data: Settings }
        | { success?: boolean; data?: Settings }
      >('/api/settings');

      const parsedSettings = (() => {
        if (!response) {
          return null;
        }

        if (typeof (response as Settings).allow_registration === 'boolean') {
          return response as Settings;
        }

        if (response && typeof (response as { data?: Settings }).data?.allow_registration === 'boolean') {
          return (response as { data: Settings }).data;
        }

        return null;
      })();

      if (!parsedSettings) {
        throw new Error('Received unexpected settings payload');
      }

      setSettings(parsedSettings);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
      // Set default settings on error to allow the app to function
      setSettings({ allow_registration: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refetchSettings = async () => {
    await fetchSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refetchSettings }}>
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