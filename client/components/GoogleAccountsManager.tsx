'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

interface GoogleAccount {
  id: string;
  google_email: string;
  display_name: string;
  is_active: boolean;
  is_primary: boolean;
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  no_refresh_token:
    'Google did not return a refresh token, so codes cannot be relayed yet. Remove Overwatch Share from your Google account permissions, then link the mailbox again.',
  access_denied: 'Google sign-in was cancelled.',
  invalid_state: 'That mailbox link expired. Start it again.',
  authentication_failed: 'Google sign-in failed. Try again.',
};

export function GoogleAccountsManager() {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // The OAuth callback returns to this page with a status in the query string. Without this
  // the whole flow ended silently — indistinguishable from a link that did nothing.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('oauth_error');
    const success = params.get('oauth_success');

    if (error) {
      toast.error(OAUTH_ERROR_MESSAGES[error] || 'Linking the mailbox failed. Try again.', {
        duration: 8000,
      });
    } else if (success) {
      toast.success('Mailbox linked — Battle.net codes relay from it.');
    }

    if (error || success) {
      // Drop the status from the URL so a refresh does not replay the message.
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchAccounts = async () => {
    try {
      const data = await apiGet<{ accounts: GoogleAccount[] }>('/api/google-auth/accounts');
      setAccounts(data.accounts || []);
    } catch (error) {
      toast.error(errorMessage(error));
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
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const handleUnlinkAccount = async (id: string) => {
    try {
      await apiDelete(`/api/google-auth/accounts/${id}`);
      toast.success('Account unlinked successfully.');
      fetchAccounts(); // Refresh the list
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <section className="rounded-lg border border-line bg-panel">
      <header className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5">
        <h2 className="font-mono text-2xs tracking-label text-ink-2 uppercase">
          Google mailboxes · OTP
        </h2>
        <button
          onClick={handleLinkAccount}
          className="ml-auto rounded-md border border-line-2 px-2 py-1 font-mono text-2xs tracking-[0.06em] text-ink-2 uppercase transition-colors duration-150 ease-standard hover:bg-white/5 hover:text-ink"
        >
          Link mailbox
        </button>
      </header>

      {isLoading ? (
        <p className="px-3.5 py-6 font-mono text-2xs tracking-label text-ink-3 uppercase">
          Loading accounts…
        </p>
      ) : accounts.length === 0 ? (
        <p className="px-3.5 py-6 font-mono text-xs text-ink-3">
          No Google accounts linked for OTP fetching.
        </p>
      ) : (
        <ul>
          {accounts.map((account) => (
            <li key={account.id} className="border-b border-line px-3.5 py-2.5 last:border-b-0">
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-xs ${account.is_active ? 'text-ink' : 'text-ink-3 line-through'}`}
                >
                  {account.display_name}
                </span>
                {account.is_primary && (
                  <span className="rounded-sm border border-line-2 px-1.5 py-0.5 font-mono text-2xs tracking-[0.08em] text-ink-3 uppercase">
                    Primary
                  </span>
                )}
                {!account.is_active && (
                  <span className="rounded-sm bg-alarm px-1.5 py-0.5 font-mono text-2xs tracking-[0.08em] text-ground uppercase">
                    Reconnect required
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1.5">
                  {!account.is_active && (
                    <button
                      onClick={handleLinkAccount}
                      className="rounded-md border border-alarm/50 px-2 py-1 font-mono text-2xs tracking-[0.06em] text-alarm uppercase transition-colors duration-150 ease-standard hover:bg-alarm/10"
                    >
                      Reconnect
                    </button>
                  )}
                  <button
                    onClick={() => handleUnlinkAccount(account.id)}
                    className="rounded-md border border-line-2 px-2 py-1 font-mono text-2xs tracking-[0.06em] text-ink-2 uppercase transition-colors duration-150 ease-standard hover:bg-white/5 hover:text-ink"
                  >
                    Unlink
                  </button>
                </span>
              </div>
              <p className="mt-0.5 font-mono text-2xs text-ink-3">{account.google_email}</p>
              {!account.is_active && (
                <p className="mt-1 font-mono text-2xs text-alarm">
                  Battle.net codes are not being relayed for this mailbox.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
