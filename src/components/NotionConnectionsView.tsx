import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Link2,
  Unlink,
  AlertTriangle,
  CheckCircle2,
  Database,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Sliders,
} from 'lucide-react';
import {
  NotionConnectionState,
  NotionDatabaseConfig,
  NotionSyncConflict,
  NotionSyncDirection,
  NotionTargetEntity,
  Category,
} from '../types/lifeos';

interface NotionConnectionsViewProps {
  notionState: NotionConnectionState;
  categories: Category[];
  onUpdateNotionState: (updater: (prev: NotionConnectionState) => NotionConnectionState) => void;
  onTriggerSync: (trigger: 'manual' | 'auto_background', simulateRemoteChanges?: boolean) => Promise<void>;
  onResolveConflict: (
    conflict: NotionSyncConflict,
    resolution: 'keep_lifeos' | 'accept_notion' | 'stage_ai_draft' | 'unlink_keep_local'
  ) => void;
  isSyncing: boolean;
}

export const NotionConnectionsView: React.FC<NotionConnectionsViewProps> = ({
  notionState,
  categories,
  onUpdateNotionState,
  onTriggerSync,
  onResolveConflict,
  isSyncing,
}) => {
  const [copiedUri, setCopiedUri] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [expandedDbId, setExpandedDbId] = useState<string | null>(
    notionState.databases[0]?.databaseId || null
  );
  const [fetchingRemoteDbs, setFetchingRemoteDbs] = useState(false);

  // Sync live server OAuth/token configuration status on mount
  useEffect(() => {
    let mounted = true;
    fetch('/api/notion/status')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted || !data) return;
        onUpdateNotionState((prev) => ({
          ...prev,
          connected: Boolean(data.connected),
          authMode: data.authMode || prev.authMode,
          workspaceName: data.workspaceName || prev.workspaceName,
          workspaceId: data.workspaceId || prev.workspaceId,
          botId: data.botId || prev.botId,
          ownerName: data.ownerName || prev.ownerName,
          oauthConfiguredOnServer: Boolean(data.oauthConfiguredOnServer),
          internalTokenConfiguredOnServer: Boolean(data.internalTokenConfiguredOnServer),
          redirectUri: data.redirectUri || prev.redirectUri,
          sharedRedirectUri: data.sharedRedirectUri || prev.sharedRedirectUri,
        }));
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, []);

  // Listen for OAuth popup completion postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'notion') {
        setStatusMessage('Notion OAuth 2.0 connected successfully. Refreshing workspace databases...');
        fetch('/api/notion/status')
          .then((r) => r.json())
          .then((data) => {
            onUpdateNotionState((prev) => ({
              ...prev,
              connected: Boolean(data.connected),
              authMode: data.authMode || 'oauth',
              workspaceName: data.workspaceName || 'Connected Notion Workspace',
              oauthConfiguredOnServer: Boolean(data.oauthConfiguredOnServer),
              internalTokenConfiguredOnServer: Boolean(data.internalTokenConfiguredOnServer),
            }));
          });
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR' && event.data?.provider === 'notion') {
        setStatusMessage(`Notion OAuth error: ${event.data?.error || 'Authorization cancelled'}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onUpdateNotionState]);

  const handleConnectOAuthPopup = async () => {
    setStatusMessage(null);
    try {
      const res = await fetch(
        `/api/notion/auth/url?redirectUri=${encodeURIComponent(notionState.redirectUri)}`
      );
      const data = await res.json();
      if (!res.ok || !data.url) {
        setStatusMessage(
          data.error ||
            'Configure NOTION_CLIENT_ID and NOTION_CLIENT_SECRET (or NOTION_API_KEY) in the AI Studio Secrets panel to launch live Notion OAuth.'
        );
        return;
      }
      // Open Notion provider URL directly in popup per iframe security rules
      const popup = window.open(data.url, 'notion_oauth_popup', 'width=620,height=720');
      if (!popup) {
        setStatusMessage('Popup blocked by browser. Please allow popups for this site.');
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to request Notion OAuth URL from server.');
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/notion/disconnect', { method: 'POST' }).catch(() => null);
    onUpdateNotionState((prev) => ({
      ...prev,
      connected: false,
      authMode: 'unconfigured',
    }));
    setStatusMessage('Disconnected server-side Notion session.');
  };

  const handleDiscoverLiveDatabases = async () => {
    setFetchingRemoteDbs(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/notion/databases');
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage(
          data.error ||
            'Using configured Notion database schemas. Connect live credentials in Secrets to query remote workspace databases.'
        );
      } else if (Array.isArray(data.databases) && data.databases.length > 0) {
        onUpdateNotionState((prev) => ({
          ...prev,
          databases: data.databases,
        }));
        setStatusMessage(`Discovered ${data.databases.length} database(s) from your Notion workspace.`);
      } else {
        setStatusMessage(
          'Connected to Notion, but 0 databases were shared with the integration yet. In Notion, open your database → "..." → Connections → Add your integration.'
        );
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Could not reach server Notion discovery endpoint.');
    } finally {
      setFetchingRemoteDbs(false);
    }
  };

  const handleCopyUri = (uri: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedUri(uri);
    setTimeout(() => setCopiedUri(null), 2000);
  };

  const updateDbConfig = (dbId: string, patch: Partial<NotionDatabaseConfig>) => {
    onUpdateNotionState((prev) => ({
      ...prev,
      databases: prev.databases.map((db) => (db.databaseId === dbId ? { ...db, ...patch } : db)),
    }));
  };

  const unresolvedConflicts = notionState.conflicts.filter((c) => !c.resolved);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Settings · External Connections · Official Notion API v2022-06-28
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Notion Two-Way Integration & Conflict Guard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Synchronize Notion databases with LifeOS Tasks, Projects, and Goals using persistent{' '}
            <code className="font-mono text-xs text-indigo-600 dark:text-indigo-400">notionPageId</code>{' '}
            deduplication. LifeOS remains your primary deterministic scheduler and reminder engine; all AI
            schedule adjustments follow Strict A1 Draft Approval.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onTriggerSync('manual', false)}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing with Notion...' : 'Sync Now'}
          </button>

          <button
            onClick={handleDiscoverLiveDatabases}
            disabled={fetchingRemoteDbs}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/70 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            {fetchingRemoteDbs ? 'Scanning...' : 'Scan Workspace Databases'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-4">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium whitespace-nowrap cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Connection Status & Server-Side OAuth / API Setup Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                01. Connection & Server-Side Credential Isolation
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                {notionState.connected
                  ? `Connected (${notionState.authMode === 'oauth' ? 'OAuth 2.0' : 'Server Token'})`
                  : 'Verified Bridge Ready · Live OAuth Optional'}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {notionState.workspaceName || 'Suklal’s Second Brain (Notion)'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Last synced:{' '}
                  <span className="font-mono tabular-nums">
                    {notionState.lastSyncAt
                      ? new Date(notionState.lastSyncAt).toLocaleString()
                      : 'Never'}
                  </span>{' '}
                  · Mode: Server-Side Express Proxy (<code className="font-mono">/api/notion/*</code>)
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notionState.connected ? (
                  <button
                    onClick={handleDisconnect}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleConnectOAuthPopup}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-900 bg-slate-100 dark:bg-white hover:bg-slate-200 dark:hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Connect Notion via OAuth 2.0
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Exact OAuth Redirect URIs & Permission Checklist */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Official Notion OAuth 2.0 / Internal Integration Setup Checklist
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Credentials are read exclusively on the Express backend via{' '}
              <code className="font-mono">NOTION_CLIENT_ID</code>,{' '}
              <code className="font-mono">NOTION_CLIENT_SECRET</code>, or{' '}
              <code className="font-mono">NOTION_API_KEY</code> in AI Studio Secrets—never exposed to the
              browser bundle. Register these exact Redirect URIs in{' '}
              <a
                href="https://www.notion.so/my-integrations"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 underline inline-flex items-center gap-1"
              >
                notion.so/my-integrations <ExternalLink className="w-3 h-3" />
              </a>
              :
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Development Callback URL
                  </div>
                  <div className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate">
                    {notionState.redirectUri}
                  </div>
                </div>
                <button
                  onClick={() => handleCopyUri(notionState.redirectUri)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedUri === notionState.redirectUri ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy URI
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Shared / Deployed Callback URL
                  </div>
                  <div className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate">
                    {notionState.sharedRedirectUri}
                  </div>
                </div>
                <button
                  onClick={() => handleCopyUri(notionState.sharedRedirectUri)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedUri === notionState.sharedRedirectUri ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy URI
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              Required Notion Capabilities: <span className="text-slate-700 dark:text-slate-300">Read content</span> ·{' '}
              <span className="text-slate-700 dark:text-slate-300">Update content</span> ·{' '}
              <span className="text-slate-700 dark:text-slate-300">Insert content</span> ·{' '}
              <span className="text-slate-700 dark:text-slate-300">Read user information (without email)</span>
            </div>
          </div>
        </div>

        {/* Sync Automation, Conflict Policy & A1 Draft Governance */}
        <div className="lg:col-span-5 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              02. Sync Governance, Background Polling & A1 Safety
            </div>

            {/* Auto-Sync Toggle */}
            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Automatic Background Sync
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Polls Notion delta changes on schedule without overwriting local locks
                </div>
              </div>
              <button
                onClick={() =>
                  onUpdateNotionState((prev) => ({
                    ...prev,
                    autoSyncEnabled: !prev.autoSyncEnabled,
                  }))
                }
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  notionState.autoSyncEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {notionState.autoSyncEnabled ? 'Enabled' : 'Paused'}
              </button>
            </div>

            {/* Polling Interval */}
            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/80">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Background Sync Interval
              </div>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                {[5, 15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() =>
                      onUpdateNotionState((prev) => ({
                        ...prev,
                        autoSyncIntervalMinutes: mins,
                      }))
                    }
                    className={`px-2.5 py-1 text-xs font-mono tabular-nums rounded-md transition-colors cursor-pointer ${
                      notionState.autoSyncIntervalMinutes === mins
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Conflict Policy */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                Concurrent Edit & Deletion Conflict Policy
              </label>
              <select
                value={notionState.conflictPolicy}
                onChange={(e) =>
                  onUpdateNotionState((prev) => ({
                    ...prev,
                    conflictPolicy: e.target.value as any,
                  }))
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="ask_user">
                  Quarantine & Ask User (Recommended — Never silently overwrite)
                </option>
                <option value="prefer_lifeos">
                  Prefer LifeOS Schedule & Status (Keep local execution state)
                </option>
                <option value="prefer_notion">Prefer Notion Values on Pull</option>
              </select>
            </div>

            {/* Route new Notion imports through A1 Draft */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div>
                <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  Stage Imported Notion Tasks in A1 AI Schedule Draft
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Prevents newly imported Notion deadlines from auto-altering today’s locked calendar
                </div>
              </div>
              <input
                type="checkbox"
                checked={notionState.routeImportsThroughA1Draft}
                onChange={(e) =>
                  onUpdateNotionState((prev) => ({
                    ...prev,
                    routeImportsThroughA1Draft: e.target.checked,
                  }))
                }
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/70">
              <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {notionState.databases.filter((d) => d.enabled).length}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Synced DBs</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/70">
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                0
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Duplicates</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/70">
              <div
                className={`text-lg font-bold font-mono tabular-nums ${
                  unresolvedConflicts.length > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {unresolvedConflicts.length}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Open Conflicts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Resolution Center (Safe Handling of Concurrent Edits & Deleted Records) */}
      {unresolvedConflicts.length > 0 && (
        <div className="p-6 bg-white dark:bg-[#111827] border border-amber-300/80 dark:border-amber-700/60 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Safe Conflict Quarantine ({unresolvedConflicts.length} Record Awaiting Decision)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Both LifeOS and Notion modified this record since the last sync cursor. No data was
                  overwritten. Choose how to reconcile:
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {unresolvedConflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Page ID: {conflict.notionPageId} · Entity: {conflict.entityType.toUpperCase()} · Type:{' '}
                      {conflict.conflictType.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                      {conflict.title}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => onResolveConflict(conflict, 'keep_lifeos')}
                      className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Keep LifeOS Version & Push
                    </button>
                    <button
                      onClick={() => onResolveConflict(conflict, 'accept_notion')}
                      className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Accept Notion Values
                    </button>
                    <button
                      onClick={() => onResolveConflict(conflict, 'stage_ai_draft')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-violet-600/10 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 hover:bg-violet-600/20 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Stage in A1 Schedule Draft
                    </button>
                  </div>
                </div>

                {/* Side-by-Side Diff Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">
                      LifeOS Local State (Updated{' '}
                      <span className="font-mono tabular-nums">
                        {new Date(conflict.lifeosUpdatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      )
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      Title: <span className="text-slate-900 dark:text-slate-100">{conflict.lifeosValues.title}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                      Status: {conflict.lifeosValues.status} · Priority: {conflict.lifeosValues.priority} · Due:{' '}
                      {conflict.lifeosValues.dueAt} · Est: {conflict.lifeosValues.estimateMinutes}m
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="font-semibold text-amber-700 dark:text-amber-300">
                      Notion Remote State (Updated{' '}
                      <span className="font-mono tabular-nums">
                        {new Date(conflict.notionUpdatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      )
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      Title: <span className="text-slate-900 dark:text-slate-100">{conflict.notionValues.title}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                      Status: {conflict.notionValues.status} · Priority: {conflict.notionValues.priority} · Due:{' '}
                      {conflict.notionValues.dueAt} · Est: {conflict.notionValues.estimateMinutes}m
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Database & Property Mapping Configuration */}
      <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              03. Selective Database & Property Mapping
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              Configured Notion Databases & Two-Way Field Adapters
            </h3>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Select which databases sync and map Notion properties to LifeOS fields
          </div>
        </div>

        <div className="space-y-4">
          {notionState.databases.map((db) => {
            const isExpanded = expandedDbId === db.databaseId;
            return (
              <div
                key={db.databaseId}
                className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
              >
                <div className="p-4 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={db.enabled}
                      onChange={(e) => updateDbConfig(db.databaseId, { enabled: e.target.checked })}
                      className="mt-1 w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {db.title}
                        </span>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          · ID: {db.databaseId}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                        Target: {db.targetEntity.toUpperCase()} · Synced Records: {db.syncedRecordCount} · Last Sync:{' '}
                        {db.lastSyncedAt ? new Date(db.lastSyncedAt).toLocaleTimeString() : 'Pending'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {/* Target Entity Selector */}
                    <select
                      value={db.targetEntity}
                      onChange={(e) =>
                        updateDbConfig(db.databaseId, {
                          targetEntity: e.target.value as NotionTargetEntity,
                        })
                      }
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200"
                    >
                      <option value="tasks">Sync → Tasks</option>
                      <option value="projects">Sync → Projects</option>
                      <option value="goals">Sync → Goals</option>
                      <option value="notes">Sync → Brainstorm Notes</option>
                    </select>

                    {/* Sync Direction Selector */}
                    <select
                      value={db.syncDirection}
                      onChange={(e) =>
                        updateDbConfig(db.databaseId, {
                          syncDirection: e.target.value as NotionSyncDirection,
                        })
                      }
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200"
                    >
                      <option value="two_way">Two-Way Sync (⇄)</option>
                      <option value="notion_to_lifeos">Import Only (Notion → LifeOS)</option>
                      <option value="lifeos_to_notion">Export Only (LifeOS → Notion)</option>
                    </select>

                    <button
                      onClick={() => setExpandedDbId(isExpanded ? null : db.databaseId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      {isExpanded ? 'Hide Property Map' : 'Map Properties'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-slate-500 dark:text-slate-400 block mb-1">
                        Title Property (Notion `title`)
                      </label>
                      <input
                        type="text"
                        value={db.propertyMapping.titleProperty}
                        onChange={(e) =>
                          updateDbConfig(db.databaseId, {
                            propertyMapping: {
                              ...db.propertyMapping,
                              titleProperty: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-slate-500 dark:text-slate-400 block mb-1">
                        Status Property (Maps to 8 LifeOS States)
                      </label>
                      <input
                        type="text"
                        value={db.propertyMapping.statusProperty}
                        onChange={(e) =>
                          updateDbConfig(db.databaseId, {
                            propertyMapping: {
                              ...db.propertyMapping,
                              statusProperty: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-slate-500 dark:text-slate-400 block mb-1">
                        Priority Property (`Critical` / `High` / `Medium` / `Low`)
                      </label>
                      <input
                        type="text"
                        value={db.propertyMapping.priorityProperty}
                        onChange={(e) =>
                          updateDbConfig(db.databaseId, {
                            propertyMapping: {
                              ...db.propertyMapping,
                              priorityProperty: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-slate-500 dark:text-slate-400 block mb-1">
                        Deadline Property (Notion `date`)
                      </label>
                      <input
                        type="text"
                        value={db.propertyMapping.dueDateProperty}
                        onChange={(e) =>
                          updateDbConfig(db.databaseId, {
                            propertyMapping: {
                              ...db.propertyMapping,
                              dueDateProperty: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-slate-500 dark:text-slate-400 block mb-1">
                        Estimated Duration Property (Notion `number` mins)
                      </label>
                      <input
                        type="text"
                        value={db.propertyMapping.estimateMinutesProperty}
                        onChange={(e) =>
                          updateDbConfig(db.databaseId, {
                            propertyMapping: {
                              ...db.propertyMapping,
                              estimateMinutesProperty: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-slate-500 dark:text-slate-400 block mb-1">
                        Default LifeOS Category Fallback
                      </label>
                      <select
                        value={db.defaultCategoryId}
                        onChange={(e) =>
                          updateDbConfig(db.databaseId, { defaultCategoryId: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Audit History Table */}
      <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              04. Sync Execution Log & Deduplication Audit
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              Recent Notion Sync Runs
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Timestamp</th>
                <th className="py-2.5 px-3 font-medium">Trigger</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium text-right">Imported</th>
                <th className="py-2.5 px-3 font-medium text-right">Pushed</th>
                <th className="py-2.5 px-3 font-medium text-right">Conflicts</th>
                <th className="py-2.5 pl-4 font-medium">Audit Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
              {notionState.syncLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                  <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {log.trigger}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`font-medium ${
                        log.status === 'success'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : log.status === 'conflict_detected'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {log.status === 'success'
                        ? 'Success'
                        : log.status === 'conflict_detected'
                        ? 'Conflict Quarantined'
                        : 'Error'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {log.importedCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200">
                    {log.pushedToNotionCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {log.conflictCount}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-600 dark:text-slate-300">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
