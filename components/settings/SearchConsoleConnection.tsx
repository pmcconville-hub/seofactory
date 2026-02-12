import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/Button';
import { getSupabaseClient } from '../../services/supabaseClient';

interface ConnectedAccount {
  id: string;
  account_email: string;
  scopes: string[];
  updated_at: string;
}

interface GscProperty {
  siteUrl: string;
  permissionLevel: string;
}

interface SearchConsoleConnectionProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const SearchConsoleConnection: React.FC<SearchConsoleConnectionProps> = ({
  supabaseUrl,
  supabaseAnonKey,
  onConnect,
  onDisconnect,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Properties per account
  const [propertiesMap, setPropertiesMap] = useState<Record<string, GscProperty[]>>({});
  const [loadingProperties, setLoadingProperties] = useState<Record<string, boolean>>({});
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  const getClient = useCallback(() => {
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return getSupabaseClient(supabaseUrl, supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  // Fetch connected Google accounts on mount
  const fetchAccounts = useCallback(async () => {
    const supabase = getClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    try {
      // analytics_accounts is not in generated types yet — use type assertion
      const { data, error: fetchError } = await (supabase as any)
        .from('analytics_accounts')
        .select('id, account_email, scopes, updated_at')
        .eq('provider', 'google')
        .order('updated_at', { ascending: false });

      if (fetchError) {
        console.warn('[SearchConsoleConnection] Failed to fetch accounts:', fetchError.message);
        setAccounts([]);
      } else {
        setAccounts((data as ConnectedAccount[]) || []);
      }
    } catch (err) {
      console.warn('[SearchConsoleConnection] Error:', err);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [getClient]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Listen for OAuth completion from the popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GSC_CONNECTED') {
        setIsConnecting(false);
        fetchAccounts(); // Refresh the list
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchAccounts]);

  const handleConnect = useCallback(() => {
    setIsConnecting(true);
    setError(null);
    onConnect();
    // Reset connecting state after timeout (in case popup is blocked)
    setTimeout(() => setIsConnecting(false), 30000);
  }, [onConnect]);

  const handleDisconnect = useCallback(async (accountId: string) => {
    const supabase = getClient();
    if (!supabase) return;
    try {
      await (supabase as any).from('analytics_accounts').delete().eq('id', accountId);
      setAccounts(prev => prev.filter(a => a.id !== accountId));
      setPropertiesMap(prev => {
        const next = { ...prev };
        delete next[accountId];
        return next;
      });
      onDisconnect();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    }
  }, [getClient, onDisconnect]);

  const handleLoadProperties = useCallback(async (accountId: string) => {
    // Toggle expanded state
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
      return;
    }

    setExpandedAccount(accountId);

    // If already loaded, don't re-fetch
    if (propertiesMap[accountId]) return;

    const supabase = getClient();
    if (!supabase) return;

    setLoadingProperties(prev => ({ ...prev, [accountId]: true }));
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('gsc-list-properties', {
        body: { accountId },
      });

      if (fnError || !data?.ok) {
        const msg = data?.error || fnError?.message || 'Failed to load properties';
        setError(msg);
        setPropertiesMap(prev => ({ ...prev, [accountId]: [] }));
      } else {
        setPropertiesMap(prev => ({ ...prev, [accountId]: data.properties || [] }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load properties');
      setPropertiesMap(prev => ({ ...prev, [accountId]: [] }));
    } finally {
      setLoadingProperties(prev => ({ ...prev, [accountId]: false }));
    }
  }, [getClient, expandedAccount, propertiesMap]);

  const permissionColor = (level: string) => {
    switch (level) {
      case 'siteOwner': return 'text-green-400';
      case 'siteFullUser': return 'text-blue-400';
      case 'siteRestrictedUser': return 'text-amber-400';
      default: return 'text-gray-400';
    }
  };

  const permissionLabel = (level: string) => {
    switch (level) {
      case 'siteOwner': return 'Owner';
      case 'siteFullUser': return 'Full';
      case 'siteRestrictedUser': return 'Restricted';
      default: return level;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-orange-400">Google Search Console</h3>
      <p className="text-sm text-gray-400 -mt-3">
        Connect your Search Console to enable performance tracking and audit correlations.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-md">
          <span className="text-gray-500 text-sm">Checking connection...</span>
        </div>
      ) : accounts.length > 0 ? (
        <div className="space-y-3">
          {accounts.map((account) => {
            const isExpanded = expandedAccount === account.id;
            const properties = propertiesMap[account.id];
            const isLoadingProps = loadingProperties[account.id];

            return (
              <div key={account.id} className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-900/20 border border-green-800 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 text-sm font-medium">Connected</span>
                    <span className="text-gray-300 text-sm">{account.account_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadProperties(account.id)}
                      className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
                    >
                      {isExpanded ? 'Hide Properties' : 'Show Properties'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(account.id)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                {/* Property list */}
                {isExpanded && (
                  <div className="ml-4 space-y-1">
                    {isLoadingProps ? (
                      <div className="p-2 text-sm text-gray-500">Loading properties...</div>
                    ) : properties && properties.length > 0 ? (
                      <>
                        <div className="text-xs text-gray-500 mb-2">
                          {properties.length} {properties.length === 1 ? 'property' : 'properties'} available
                        </div>
                        {properties.map((prop) => (
                          <div
                            key={prop.siteUrl}
                            className="flex items-center justify-between p-2 bg-gray-800/50 border border-gray-700/50 rounded text-sm"
                          >
                            <span className="text-gray-200 font-mono text-xs truncate">
                              {prop.siteUrl}
                            </span>
                            <span className={`text-xs ${permissionColor(prop.permissionLevel)}`}>
                              {permissionLabel(prop.permissionLevel)}
                            </span>
                          </div>
                        ))}
                        <p className="text-xs text-gray-600 mt-1">
                          Property linking to projects is available in each map's audit settings.
                        </p>
                      </>
                    ) : properties ? (
                      <div className="p-2 text-sm text-gray-500">
                        No Search Console properties found for this account.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add another account */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleConnect}
            disabled={isConnecting}
            className="text-sm"
          >
            {isConnecting ? 'Connecting...' : 'Connect Another Account'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-md">
            <span className="text-gray-500 text-sm">Not connected</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={handleConnect}
              disabled={isConnecting}
              className="text-sm"
            >
              {isConnecting ? 'Connecting...' : 'Connect Google Search Console'}
            </Button>
            <span className="text-xs text-gray-500">Or import CSV manually in the audit panel</span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
};
