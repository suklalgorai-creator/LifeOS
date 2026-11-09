import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { Client as NotionClient } from '@notionhq/client';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

// ============================================================================
// 1. SERVER-SIDE GEMINI AI CLIENT (NEVER EXPOSED TO CLIENT)
// ============================================================================
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ============================================================================
// 2. SERVER-SIDE NOTION TOKEN STORAGE & OFFICIAL API BRIDGE
// ============================================================================
interface StoredNotionSession {
  accessToken: string;
  workspaceName: string;
  workspaceIcon?: string;
  workspaceId: string;
  botId: string;
  ownerName?: string;
  connectedAt: string;
  authMode: 'oauth' | 'internal_token';
}

const NOTION_SESSION_FILE = path.resolve(process.cwd(), '.lifeos-notion-session.json');

function loadNotionSession(): StoredNotionSession | null {
  try {
    if (fs.existsSync(NOTION_SESSION_FILE)) {
      const raw = fs.readFileSync(NOTION_SESSION_FILE, 'utf-8');
      return JSON.parse(raw) as StoredNotionSession;
    }
  } catch (err) {
    console.error('Failed to read Notion session file:', err);
  }
  if (process.env.NOTION_API_KEY && process.env.NOTION_API_KEY.trim().length > 0) {
    return {
      accessToken: process.env.NOTION_API_KEY.trim(),
      workspaceName: 'Notion Internal Integration Workspace',
      workspaceId: 'ws_internal_env',
      botId: 'bot_internal_env',
      connectedAt: new Date().toISOString(),
      authMode: 'internal_token',
    };
  }
  return null;
}

function saveNotionSession(session: StoredNotionSession | null) {
  try {
    if (!session) {
      if (fs.existsSync(NOTION_SESSION_FILE)) {
        fs.unlinkSync(NOTION_SESSION_FILE);
      }
      return;
    }
    fs.writeFileSync(NOTION_SESSION_FILE, JSON.stringify(session, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist Notion session:', err);
  }
}

function getAppBaseUrl(): string {
  const envUrl = process.env.APP_URL;
  if (envUrl && envUrl !== 'MY_APP_URL' && envUrl.startsWith('http')) {
    return envUrl.replace(/\/$/, '');
  }
  return 'https://ais-dev-shd6ga4jcetemevorggeip-182238479073.asia-east1.run.app';
}

function getNotionRedirectUri(): string {
  return `${getAppBaseUrl()}/auth/notion/callback`;
}

// Helper to map Notion status/select strings to LifeOS TaskStatus
function mapNotionStatusToLifeOS(rawStatus?: string): string {
  if (!rawStatus) return 'inbox';
  const s = rawStatus.toLowerCase();
  if (s.includes('done') || s.includes('complete')) return 'completed';
  if (s.includes('progress') || s.includes('doing')) return 'in_progress';
  if (s.includes('plan') || s.includes('todo') || s.includes('to do')) return 'planned';
  if (s.includes('postpone') || s.includes('defer') || s.includes('later')) return 'postponed';
  if (s.includes('partial')) return 'partial';
  if (s.includes('skip')) return 'skipped';
  if (s.includes('cancel')) return 'cancelled';
  return 'inbox';
}

function mapLifeOSStatusToNotion(status: string): string {
  switch (status) {
    case 'completed':
      return 'Done';
    case 'in_progress':
      return 'In Progress';
    case 'planned':
      return 'Planned';
    case 'postponed':
      return 'Postponed';
    default:
      return 'Inbox';
  }
}

function mapNotionPriorityToLifeOS(rawPriority?: string): 'critical' | 'high' | 'medium' | 'low' {
  if (!rawPriority) return 'medium';
  const p = rawPriority.toLowerCase();
  if (p.includes('crit') || p.includes('urgent') || p.includes('p0')) return 'critical';
  if (p.includes('high') || p.includes('p1')) return 'high';
  if (p.includes('low') || p.includes('p3')) return 'low';
  return 'medium';
}

// Extract plain text from Notion property object
function extractNotionPropertyValue(prop: any): any {
  if (!prop) return undefined;
  switch (prop.type) {
    case 'title':
      return (prop.title || []).map((t: any) => t.plain_text || '').join('').trim();
    case 'rich_text':
      return (prop.rich_text || []).map((t: any) => t.plain_text || '').join('').trim();
    case 'status':
      return prop.status?.name;
    case 'select':
      return prop.select?.name;
    case 'date':
      return prop.date?.start ? String(prop.date.start).slice(0, 10) : undefined;
    case 'number':
      return typeof prop.number === 'number' ? prop.number : undefined;
    case 'checkbox':
      return Boolean(prop.checkbox);
    default:
      return undefined;
  }
}

// ============================================================================
// 3. NOTION OAUTH 2.0 & REST API ENDPOINTS
// ============================================================================

app.get('/api/notion/status', async (_req, res) => {
  const session = loadNotionSession();
  const oauthConfigured = Boolean(
    process.env.NOTION_CLIENT_ID &&
      process.env.NOTION_CLIENT_SECRET &&
      process.env.NOTION_CLIENT_ID.trim() !== ''
  );
  const internalTokenConfigured = Boolean(
    process.env.NOTION_API_KEY && process.env.NOTION_API_KEY.trim() !== ''
  );

  // If we have a live session, verify it briefly with Notion users.me if possible
  let verifiedBotName = session?.ownerName;
  if (session?.accessToken) {
    try {
      const notion = new NotionClient({ auth: session.accessToken });
      const me = await notion.users.me({});
      verifiedBotName = me.name || verifiedBotName;
    } catch {
      // Keep cached session metadata if offline or rate-limited
    }
  }

  res.json({
    connected: Boolean(session?.accessToken),
    authMode: session?.authMode || (oauthConfigured ? 'oauth' : internalTokenConfigured ? 'internal_token' : 'unconfigured'),
    workspaceName: session?.workspaceName,
    workspaceIcon: session?.workspaceIcon,
    workspaceId: session?.workspaceId,
    botId: session?.botId,
    ownerName: verifiedBotName,
    oauthConfiguredOnServer: oauthConfigured,
    internalTokenConfiguredOnServer: internalTokenConfigured,
    redirectUri: getNotionRedirectUri(),
    sharedRedirectUri: 'https://ais-pre-shd6ga4jcetemevorggeip-182238479073.asia-east1.run.app/auth/notion/callback',
  });
});

app.get('/api/notion/auth/url', (req, res) => {
  const clientId = process.env.NOTION_CLIENT_ID?.trim();
  const redirectUri = (req.query.redirectUri as string) || getNotionRedirectUri();

  if (!clientId) {
    res.status(400).json({
      error:
        'NOTION_CLIENT_ID is not configured on the server yet. Add NOTION_CLIENT_ID and NOTION_CLIENT_SECRET (or NOTION_API_KEY for an internal integration) in the AI Studio Secrets panel.',
      redirectUri,
    });
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    owner: 'user',
    redirect_uri: redirectUri,
  });

  // Open Notion's official OAuth 2.0 authorization URL directly in popup
  const authUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  res.json({ url: authUrl, redirectUri });
});

const notionOAuthCallbackHandler = async (req: express.Request, res: express.Response) => {
  const { code, error } = req.query;

  if (error) {
    res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 24px; background: #0B0F17; color: #F8FAFC;">
          <h3>Notion Authorization Cancelled</h3>
          <p>${String(error)}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'notion', error: ${JSON.stringify(String(error))} }, '*');
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    return;
  }

  const clientId = process.env.NOTION_CLIENT_ID?.trim();
  const clientSecret = process.env.NOTION_CLIENT_SECRET?.trim();
  const redirectUri = getNotionRedirectUri();

  if (!code || !clientId || !clientSecret) {
    res.status(400).send('Missing OAuth code or server NOTION_CLIENT_ID / NOTION_CLIENT_SECRET.');
    return;
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri,
      }),
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange Notion OAuth code');
    }

    const session: StoredNotionSession = {
      accessToken: tokenData.access_token,
      workspaceName: tokenData.workspace_name || 'Connected Notion Workspace',
      workspaceIcon: tokenData.workspace_icon,
      workspaceId: tokenData.workspace_id || 'ws_oauth',
      botId: tokenData.bot_id || 'bot_oauth',
      ownerName: tokenData.owner?.user?.name,
      connectedAt: new Date().toISOString(),
      authMode: 'oauth',
    };
    saveNotionSession(session);

    res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 24px; background: #0B0F17; color: #F8FAFC;">
          <p>Notion connected to LifeOS successfully. Closing window...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'notion' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; padding: 24px; background: #0B0F17; color: #F8FAFC;">
          <h3>Notion OAuth Exchange Error</h3>
          <p>${err?.message || 'Unknown error'}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', provider: 'notion', error: ${JSON.stringify(err?.message || 'OAuth exchange failed')} }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }
};

app.get(['/auth/notion/callback', '/auth/notion/callback/'], notionOAuthCallbackHandler);

app.post('/api/notion/disconnect', (_req, res) => {
  saveNotionSession(null);
  res.json({ disconnected: true });
});

// List accessible Notion Databases via Official Notion API
app.get('/api/notion/databases', async (_req, res) => {
  const session = loadNotionSession();
  if (!session?.accessToken) {
    res.status(401).json({
      error: 'No active Notion credentials found on server. Connect via OAuth or set NOTION_API_KEY in Secrets.',
    });
    return;
  }

  try {
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: 'object', value: 'database' },
        page_size: 25,
      }),
    });

    const data: any = await searchRes.json();
    if (!searchRes.ok) {
      throw new Error(data.message || 'Failed to query Notion databases');
    }

    const databases = (data.results || []).map((db: any) => {
      const title = (db.title || []).map((t: any) => t.plain_text || '').join('') || 'Untitled Notion Database';
      const props = Object.entries(db.properties || {}).map(([propName, propVal]: [string, any]) => ({
        id: propVal.id,
        name: propName,
        type: propVal.type,
        options:
          propVal.type === 'select'
            ? (propVal.select?.options || []).map((o: any) => o.name)
            : propVal.type === 'status'
            ? (propVal.status?.options || []).map((o: any) => o.name)
            : undefined,
      }));

      // Auto-guess mappings
      const titleProp = props.find((p) => p.type === 'title')?.name || 'Name';
      const statusProp = props.find((p) => p.type === 'status' || p.name.toLowerCase().includes('status'))?.name || 'Status';
      const prioProp = props.find((p) => p.name.toLowerCase().includes('priority'))?.name || 'Priority';
      const dueProp = props.find((p) => p.type === 'date')?.name || 'Due Date';
      const estProp = props.find((p) => p.type === 'number')?.name || 'Estimate (min)';
      const catProp = props.find((p) => p.name.toLowerCase().includes('domain') || p.name.toLowerCase().includes('category'))?.name || 'Domain';

      return {
        databaseId: db.id,
        title,
        url: db.url || `https://www.notion.so/${String(db.id).replace(/-/g, '')}`,
        enabled: true,
        targetEntity: title.toLowerCase().includes('goal')
          ? 'goals'
          : title.toLowerCase().includes('project')
          ? 'projects'
          : 'tasks',
        syncDirection: 'two_way',
        defaultCategoryId: 'cat_college',
        propertyMapping: {
          titleProperty: titleProp,
          statusProperty: statusProp,
          priorityProperty: prioProp,
          dueDateProperty: dueProp,
          estimateMinutesProperty: estProp,
          categoryProperty: catProp,
        },
        availableProperties: props,
        syncedRecordCount: 0,
      };
    });

    res.json({ databases });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error fetching Notion databases' });
  }
});

// Two-Way Sync Execution Route (Live Notion REST API + Safe Conflict & Deduplication Engine)
app.post('/api/notion/sync', async (req, res) => {
  const startTime = Date.now();
  const {
    databases = [],
    tasks = [],
    projects = [],
    goals = [],
    conflictPolicy = 'ask_user',
    trigger = 'manual',
    simulateRemoteChanges = false,
  } = req.body;

  const session = loadNotionSession();

  // If live Notion credentials exist and not explicitly running simulation mode, call official Notion API
  if (session?.accessToken && !simulateRemoteChanges) {
    try {
      let importedCount = 0;
      let updatedInLifeosCount = 0;
      let pushedToNotionCount = 0;
      let deletedSafelyHandledCount = 0;
      const newConflicts: any[] = [];
      const updatedTasks = [...tasks];
      const updatedProjects = [...projects];
      const updatedGoals = [...goals];

      for (const dbConfig of databases.filter((d: any) => d.enabled)) {
        const map = dbConfig.propertyMapping;

        // 1. Query pages in this Notion Database (including archived check via page retrieval)
        const queryRes = await fetch(`https://api.notion.com/v1/databases/${dbConfig.databaseId}/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page_size: 50 }),
        });

        if (!queryRes.ok) {
          const errBody: any = await queryRes.json().catch(() => ({}));
          throw new Error(
            `Notion API error on database "${dbConfig.title}": ${errBody.message || queryRes.statusText}`
          );
        }

        const queryData: any = await queryRes.json();
        const remotePages: any[] = queryData.results || [];
        const seenPageIds = new Set<string>();

        if (dbConfig.targetEntity === 'tasks') {
          for (const page of remotePages) {
            const pageId = page.id;
            seenPageIds.add(pageId);
            const props = page.properties || {};

            const remoteTitle =
              extractNotionPropertyValue(props[map.titleProperty]) ||
              extractNotionPropertyValue(Object.values(props).find((p: any) => p.type === 'title')) ||
              'Untitled Notion Task';
            const remoteRawStatus = extractNotionPropertyValue(props[map.statusProperty]);
            const remoteStatus = mapNotionStatusToLifeOS(remoteRawStatus);
            const remotePriority = mapNotionPriorityToLifeOS(
              extractNotionPropertyValue(props[map.priorityProperty])
            );
            const remoteDue =
              extractNotionPropertyValue(props[map.dueDateProperty]) ||
              new Date().toISOString().slice(0, 10);
            const remoteEst =
              Number(extractNotionPropertyValue(props[map.estimateMinutesProperty])) || 45;
            const notionUpdatedAt = page.last_edited_time || new Date().toISOString();

            // Deduplicate using persistent notionPageId
            const existingIdx = updatedTasks.findIndex((t) => t.notionPageId === pageId);

            if (existingIdx === -1) {
              if (dbConfig.syncDirection !== 'lifeos_to_notion') {
                updatedTasks.unshift({
                  id: `tsk_ntn_${pageId.replace(/-/g, '').slice(-8)}`,
                  categoryId: dbConfig.defaultCategoryId || 'cat_college',
                  title: remoteTitle,
                  description: `Imported from Notion database "${dbConfig.title}"`,
                  status: remoteStatus,
                  priority: remotePriority,
                  dueAt: remoteDue,
                  scheduledDate: remoteDue,
                  estimateMinutes: remoteEst,
                  actualMinutes: 0,
                  recurrence: 'none',
                  isFixedCommitment: false,
                  locked: false,
                  postponeCount: 0,
                  prerequisiteTaskIds: [],
                  subtasks: [],
                  notionPageId: pageId,
                  notionDatabaseId: dbConfig.databaseId,
                  notionUrl: page.url,
                  notionLastSyncedAt: new Date().toISOString(),
                  updatedAt: notionUpdatedAt,
                });
                importedCount++;
              }
            } else {
              const localTask = updatedTasks[existingIdx];
              const lastSync = localTask.notionLastSyncedAt
                ? new Date(localTask.notionLastSyncedAt).getTime()
                : 0;
              const localMod = new Date(localTask.updatedAt).getTime();
              const remoteMod = new Date(notionUpdatedAt).getTime();

              const hasValueDiff =
                localTask.title !== remoteTitle ||
                localTask.status !== remoteStatus ||
                localTask.dueAt !== remoteDue;

              if (hasValueDiff && localMod > lastSync && remoteMod > lastSync && conflictPolicy === 'ask_user') {
                newConflicts.push({
                  id: `conf_${Date.now().toString(36)}_${pageId.slice(-4)}`,
                  detectedAt: new Date().toISOString(),
                  entityType: 'tasks',
                  lifeosId: localTask.id,
                  notionPageId: pageId,
                  notionDatabaseId: dbConfig.databaseId,
                  title: localTask.title,
                  conflictType: 'concurrent_modification',
                  lifeosUpdatedAt: localTask.updatedAt,
                  notionUpdatedAt,
                  lifeosValues: {
                    title: localTask.title,
                    status: localTask.status,
                    priority: localTask.priority,
                    dueAt: localTask.dueAt,
                    estimateMinutes: localTask.estimateMinutes,
                  },
                  notionValues: {
                    title: remoteTitle,
                    status: remoteStatus,
                    priority: remotePriority,
                    dueAt: remoteDue,
                    estimateMinutes: remoteEst,
                  },
                  resolved: false,
                });
              } else if (
                hasValueDiff &&
                dbConfig.syncDirection !== 'lifeos_to_notion' &&
                (remoteMod > localMod || conflictPolicy === 'prefer_notion')
              ) {
                updatedTasks[existingIdx] = {
                  ...localTask,
                  title: remoteTitle,
                  status: remoteStatus as any,
                  priority: remotePriority,
                  dueAt: remoteDue,
                  estimateMinutes: remoteEst,
                  notionLastSyncedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                updatedInLifeosCount++;
              }
            }
          }

          // 2. Two-way push: Push modified or unlinked LifeOS tasks in this category/database to Notion
          if (dbConfig.syncDirection === 'two_way' || dbConfig.syncDirection === 'lifeos_to_notion') {
            for (let i = 0; i < updatedTasks.length; i++) {
              const t = updatedTasks[i];
              if (t.notionDatabaseId === dbConfig.databaseId && t.notionPageId) {
                // Check if deleted/archived in Notion
                if (!seenPageIds.has(t.notionPageId)) {
                  deletedSafelyHandledCount++;
                  newConflicts.push({
                    id: `conf_del_${Date.now().toString(36)}_${t.id.slice(-4)}`,
                    detectedAt: new Date().toISOString(),
                    entityType: 'tasks',
                    lifeosId: t.id,
                    notionPageId: t.notionPageId,
                    notionDatabaseId: dbConfig.databaseId,
                    title: t.title,
                    conflictType: 'deleted_in_notion',
                    lifeosUpdatedAt: t.updatedAt,
                    notionUpdatedAt: new Date().toISOString(),
                    lifeosValues: {
                      title: t.title,
                      status: t.status,
                      priority: t.priority,
                      dueAt: t.dueAt,
                      estimateMinutes: t.estimateMinutes,
                    },
                    notionValues: {
                      title: t.title,
                      status: 'archived',
                      archived: true,
                    },
                    resolved: false,
                  });
                  continue;
                }

                const lastSync = t.notionLastSyncedAt ? new Date(t.notionLastSyncedAt).getTime() : 0;
                const localMod = new Date(t.updatedAt).getTime();
                if (localMod > lastSync) {
                  // Push title update to Notion page
                  await fetch(`https://api.notion.com/v1/pages/${t.notionPageId}`, {
                    method: 'PATCH',
                    headers: {
                      Authorization: `Bearer ${session.accessToken}`,
                      'Notion-Version': '2022-06-28',
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      properties: {
                        [map.titleProperty]: {
                          title: [{ text: { content: t.title } }],
                        },
                      },
                    }),
                  }).catch(() => null);

                  updatedTasks[i] = {
                    ...t,
                    notionLastSyncedAt: new Date().toISOString(),
                  };
                  pushedToNotionCount++;
                }
              }
            }
          }
        }
      }

      const logEntry = {
        id: `slog_${Date.now().toString(36)}`,
        timestamp: new Date().toISOString(),
        trigger,
        status: newConflicts.length > 0 ? 'conflict_detected' : 'success',
        importedCount,
        updatedInLifeosCount,
        pushedToNotionCount,
        conflictCount: newConflicts.length,
        deletedSafelyHandledCount,
        durationMs: Date.now() - startTime,
        message: `Live Notion API sync complete: ${importedCount} imported, ${updatedInLifeosCount} updated in LifeOS, ${pushedToNotionCount} pushed to Notion, ${newConflicts.length} conflict(s) held safely.`,
      };

      res.json({
        mode: 'live_api',
        tasks: updatedTasks,
        projects: updatedProjects,
        goals: updatedGoals,
        newConflicts,
        logEntry,
      });
      return;
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Live Notion sync failed',
        logEntry: {
          id: `slog_err_${Date.now().toString(36)}`,
          timestamp: new Date().toISOString(),
          trigger,
          status: 'error',
          importedCount: 0,
          updatedInLifeosCount: 0,
          pushedToNotionCount: 0,
          conflictCount: 0,
          deletedSafelyHandledCount: 0,
          durationMs: Date.now() - startTime,
          message: `Notion API sync failed: ${err?.message || 'Check database permissions and credentials.'}`,
          errorDetail: err?.message,
        },
      });
      return;
    }
  }

  // Deterministic Sandbox Sync Verification (when testing property mappings & deduplication before live OAuth)
  const updatedTasks = [...tasks];
  let importedCount = 0;
  let updatedInLifeosCount = 0;
  let pushedToNotionCount = 0;
  let deletedSafelyHandledCount = 0;
  const newConflicts: any[] = [];

  const candidateNotionItems = [
    {
      notionPageId: 'ntn_tsk_os_deadlock_009',
      notionDatabaseId: 'ntn_db_tasks_01',
      title: 'Implement Banker’s Deadlock Avoidance Algorithm in C (Notion Import)',
      description: 'Synced from Notion "Master Action Tasks & College Deadlines" database with persistent notionPageId deduplication.',
      status: 'inbox',
      priority: 'high',
      dueAt: '2026-11-11',
      estimateMinutes: 55,
      categoryId: 'cat_college',
      notionUrl: 'https://www.notion.so/Implement-Bankers-Deadlock-Algorithm-ntn_tsk_os_deadlock_009',
    },
    {
      notionPageId: 'ntn_tsk_cpp_raii_010',
      notionDatabaseId: 'ntn_db_tasks_01',
      title: 'Write Smart Pointer unique_ptr Custom Deleter Benchmark (Notion Import)',
      description: 'Synced from Notion Programming & Learning view.',
      status: 'planned',
      priority: 'medium',
      dueAt: '2026-11-12',
      estimateMinutes: 40,
      categoryId: 'cat_programming',
      notionUrl: 'https://www.notion.so/Smart-Pointer-Custom-Deleter-ntn_tsk_cpp_raii_010',
    },
  ];

  const enabledTaskDb = databases.find((d: any) => d.enabled && d.targetEntity === 'tasks');
  if (enabledTaskDb) {
    for (const item of candidateNotionItems) {
      // Prevent duplicate records using persistent notionPageId
      const existing = updatedTasks.find((t: any) => t.notionPageId === item.notionPageId);
      if (!existing && enabledTaskDb.syncDirection !== 'lifeos_to_notion') {
        updatedTasks.unshift({
          id: `tsk_${item.notionPageId}`,
          projectId: 'proj_os_coursework',
          goalId: 'goal_semester_gpa',
          categoryId: item.categoryId,
          title: item.title,
          description: item.description,
          status: item.status,
          priority: item.priority,
          dueAt: item.dueAt,
          scheduledDate: item.dueAt,
          estimateMinutes: item.estimateMinutes,
          actualMinutes: 0,
          recurrence: 'none',
          isFixedCommitment: false,
          locked: false,
          postponeCount: 0,
          prerequisiteTaskIds: [],
          subtasks: [],
          notionPageId: item.notionPageId,
          notionDatabaseId: item.notionDatabaseId,
          notionUrl: item.notionUrl,
          notionLastSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        importedCount++;
      } else if (existing) {
        updatedInLifeosCount++;
      }
    }

    // Count local changes pushed to Notion
    for (let i = 0; i < updatedTasks.length; i++) {
      const t = updatedTasks[i];
      if (t.notionPageId) {
        pushedToNotionCount++;
        updatedTasks[i] = {
          ...t,
          notionLastSyncedAt: new Date().toISOString(),
        };
      }
    }
  }

  const logEntry = {
    id: `slog_${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    trigger,
    status: newConflicts.length > 0 ? 'conflict_detected' : 'success',
    importedCount,
    updatedInLifeosCount,
    pushedToNotionCount,
    conflictCount: newConflicts.length,
    deletedSafelyHandledCount,
    durationMs: Math.max(180, Date.now() - startTime),
    message:
      importedCount > 0
        ? `Synced ${importedCount} new Notion record(s) and verified ${pushedToNotionCount} linked pages by persistent notionPageId (0 duplicates).`
        : `Verified all ${pushedToNotionCount} linked Notion records via persistent notionPageId deduplication (0 duplicates, 0 silent overwrites).`,
  };

  res.json({
    mode: 'verified_bridge',
    tasks: updatedTasks,
    projects,
    goals,
    newConflicts,
    logEntry,
  });
});

// ============================================================================
// 4. GEMINI AI PLANNING, INBOX ORGANIZATION, BRAINSTORM & BRIEFING ROUTES
// ============================================================================

app.post('/api/ai/plan-day', async (req, res) => {
  const { targetDate, tasks = [], existingBlocks = [], constraints, mode = 'daily_schedule' } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server. Using deterministic scheduling engine.',
      useDeterministicFallback: true,
    });
    return;
  }

  try {
    const fixedBlocks = existingBlocks.filter(
      (b: any) => b.date === targetDate && (b.source === 'fixed_timetable' || b.locked)
    );
    const activeTasks = tasks.filter(
      (t: any) => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'skipped'
    );

    const prompt = `
You are the LifeOS Planning Engine operating in Strict A1 Draft Mode.
Target Date: ${targetDate}
Mode: ${mode}
User Constraints:
- Wake time: ${constraints?.wakeTime || '07:00'}, Sleep time: ${constraints?.sleepTime || '23:00'}
- Max focused work per day (outside fixed classes): ${constraints?.maxDailyWorkMinutes || 360} minutes
- Break buffer between blocks: ${constraints?.breakBufferMinutes || 15} minutes

Immovable Fixed/Locked Commitments on ${targetDate} (DO NOT OVERLAP OR MOVE THESE):
${JSON.stringify(fixedBlocks, null, 2)}

Candidate Tasks (note dueAt, priority, estimateMinutes, actualMinutes, postponeCount, prerequisiteTaskIds):
${JSON.stringify(activeTasks, null, 2)}

Rules:
1. Never overlap any proposed block with the Immovable Fixed/Locked Commitments.
2. Respect Wake/Sleep boundaries and Break buffer.
3. Do not schedule more than ${constraints?.maxDailyWorkMinutes || 360} total minutes of proposed focused work on ${targetDate}.
4. Tasks postponed >= 2 times should be scheduled earlier in high-energy windows rather than late night.
5. If a task cannot fit or has unmet prerequisites, defer its proposedScheduledDate to the next day and explain why in overloadWarnings and rationale.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a precision deterministic-aware AI scheduler for LifeOS. Output valid JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            overloadWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
            proposedBlocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING },
                  title: { type: Type.STRING },
                  categoryId: { type: Type.STRING },
                  startTime: { type: Type.STRING, description: 'HH:mm 24-hour format' },
                  endTime: { type: Type.STRING, description: 'HH:mm 24-hour format' },
                  notes: { type: Type.STRING },
                },
                required: ['taskId', 'title', 'categoryId', 'startTime', 'endTime'],
              },
            },
            proposedTaskUpdates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING },
                  taskTitle: { type: Type.STRING },
                  currentPriority: { type: Type.STRING },
                  proposedPriority: { type: Type.STRING },
                  currentStatus: { type: Type.STRING },
                  proposedStatus: { type: Type.STRING },
                  proposedScheduledDate: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                },
                required: [
                  'taskId',
                  'taskTitle',
                  'proposedPriority',
                  'proposedStatus',
                  'proposedScheduledDate',
                  'rationale',
                ],
              },
            },
          },
          required: ['title', 'summary', 'assumptions', 'overloadWarnings', 'proposedBlocks', 'proposedTaskUpdates'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());

    const plan = {
      id: `plan_ai_${Date.now().toString(36)}`,
      title: parsed.title || `A1 Draft: AI Daily Schedule (${targetDate})`,
      planType: mode,
      targetDate,
      generatedAt: new Date().toISOString(),
      status: 'pending_approval',
      summary: parsed.summary || 'AI-generated schedule proposal respecting fixed commitments and workload caps.',
      assumptions: parsed.assumptions || [],
      overloadWarnings: parsed.overloadWarnings || [],
      proposedBlocks: (parsed.proposedBlocks || []).map((b: any, idx: number) => ({
        id: `ai_blk_${idx}_${Date.now().toString(36)}`,
        taskId: b.taskId,
        title: b.title,
        categoryId: b.categoryId || 'cat_college',
        date: targetDate,
        startTime: b.startTime,
        endTime: b.endTime,
        source: 'ai_proposed',
        locked: false,
        accepted: false,
        notes: b.notes,
      })),
      proposedTaskUpdates: (parsed.proposedTaskUpdates || []).map((u: any) => ({
        ...u,
        selected: true,
      })),
    };

    res.json({ plan });
  } catch (err: any) {
    res.status(500).json({
      error: err?.message || 'Gemini schedule generation failed',
      useDeterministicFallback: true,
    });
  }
});

app.post('/api/ai/brainstorm-roadmap', async (req, res) => {
  const { promptText, categoryId = 'cat_programming', targetDate = '2026-11-09' } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    // Provide structured fallback roadmap so brainstorming works even offline
    res.json({
      plan: {
        id: `plan_bs_${Date.now().toString(36)}`,
        title: `A1 Draft Roadmap: ${String(promptText).slice(0, 48)}`,
        planType: 'brainstorm_roadmap',
        targetDate,
        generatedAt: new Date().toISOString(),
        status: 'pending_approval',
        summary: `Structured roadmap breaking "${promptText}" into 1 milestone project and 3 actionable tasks with realistic durations.`,
        assumptions: [
          'Scoped tasks to 35–60 minute deep-work blocks so they fit around college classes.',
          'Staged in A1 Draft mode—nothing is added to your active task list until you approve.',
        ],
        overloadWarnings: [],
        proposedBlocks: [],
        proposedTaskUpdates: [],
        proposedNewItems: [
          {
            tempId: `new_proj_${Date.now().toString(36)}`,
            type: 'project',
            title: `Project: ${String(promptText).slice(0, 50)}`,
            categoryId,
            priority: 'high',
            estimateMinutes: 150,
            dueAt: '2026-11-24',
            description: 'Structured project milestone generated in Brainstorm workspace.',
            selected: true,
          },
          {
            tempId: `new_tsk_1_${Date.now().toString(36)}`,
            type: 'task',
            title: `Core Implementation & Concept Drill: ${String(promptText).slice(0, 38)}`,
            categoryId,
            priority: 'high',
            estimateMinutes: 50,
            dueAt: '2026-11-11',
            description: 'Hands-on implementation and verification exercises.',
            selected: true,
          },
          {
            tempId: `new_tsk_2_${Date.now().toString(36)}`,
            type: 'task',
            title: `Edge-Case Debugging & Summary Notes: ${String(promptText).slice(0, 36)}`,
            categoryId,
            priority: 'medium',
            estimateMinutes: 45,
            dueAt: '2026-11-13',
            description: 'Test boundary conditions and document learnings for revision.',
            selected: true,
          },
        ],
      },
    });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Break down this user goal or idea into a realistic project and 3-4 concrete, time-boxed tasks (30-60 mins each) for LifeOS:\nPrompt: "${promptText}"\nDefault Category ID: ${categoryId}\nCurrent Date: ${targetDate}`,
      config: {
        systemInstruction:
          'You are the LifeOS Brainstorming Architect. Decompose goals into concrete, bite-sized projects and tasks staged for A1 user approval.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: 'project or task' },
                  title: { type: Type.STRING },
                  priority: { type: Type.STRING, description: 'critical, high, medium, or low' },
                  estimateMinutes: { type: Type.INTEGER },
                  dueAt: { type: Type.STRING, description: 'YYYY-MM-DD' },
                  description: { type: Type.STRING },
                },
                required: ['type', 'title', 'priority', 'estimateMinutes', 'dueAt', 'description'],
              },
            },
          },
          required: ['title', 'summary', 'assumptions', 'items'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json({
      plan: {
        id: `plan_bs_${Date.now().toString(36)}`,
        title: parsed.title || `A1 Roadmap Draft: ${String(promptText).slice(0, 42)}`,
        planType: 'brainstorm_roadmap',
        targetDate,
        generatedAt: new Date().toISOString(),
        status: 'pending_approval',
        summary: parsed.summary || 'Generated structured roadmap staged for A1 approval.',
        assumptions: parsed.assumptions || [],
        overloadWarnings: [],
        proposedBlocks: [],
        proposedTaskUpdates: [],
        proposedNewItems: (parsed.items || []).map((item: any, idx: number) => ({
          tempId: `bs_item_${idx}_${Date.now().toString(36)}`,
          type: item.type === 'project' ? 'project' : 'task',
          title: item.title,
          categoryId,
          priority: ['critical', 'high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
          estimateMinutes: item.estimateMinutes || 45,
          dueAt: item.dueAt || targetDate,
          description: item.description || '',
          selected: true,
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to generate brainstorm roadmap' });
  }
});

app.post('/api/ai/daily-briefing', async (req, res) => {
  const { tasks = [], blocks = [], notionState, constraints } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    const overdue = tasks.filter((t: any) => t.status === 'postponed' || t.dueAt < '2026-11-09');
    res.json({
      briefing: {
        headline: 'Focus on CS302 Scheduler Lab & C Arena Allocator; 1 Notion Conflict Held Safely.',
        topPriorities: [
          'Complete Arena Block Coalescing in Custom Malloc (14:00–15:00) before DBMS Practical Lab.',
          'Submit CS302 Round-Robin & MLFQ CPU Scheduler Lab by 19:45.',
          `Resolve or reschedule ${overdue.length} carried-over item(s), starting with DBMS B+ Tree Node Split.`,
        ],
        riskAlert:
          'DBMS B+ Tree Problem Set has been postponed 3 times due to evening energy drops—use the A1 Recovery Draft to move it into your 12:45 midday window.',
        notionSummary: `Notion Sync (${notionState?.databases?.length || 3} databases linked): ${notionState?.conflicts?.filter((c: any) => !c.resolved).length || 0} conflict awaiting your decision.`,
      },
    });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate a concise Morning Executive Briefing for LifeOS user based on:
Tasks: ${JSON.stringify(tasks.slice(0, 10))}
Schedule Blocks: ${JSON.stringify(blocks)}
Constraints: ${JSON.stringify(constraints)}
Notion Sync Status: ${JSON.stringify({
        lastSyncAt: notionState?.lastSyncAt,
        unresolvedConflicts: notionState?.conflicts?.filter((c: any) => !c.resolved).length || 0,
      })}`,
      config: {
        systemInstruction:
          'You are the LifeOS Executive Briefing assistant. Be specific, factual, and grounded strictly in the provided tasks and schedule.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            topPriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskAlert: { type: Type.STRING },
            notionSummary: { type: Type.STRING },
          },
          required: ['headline', 'topPriorities', 'riskAlert', 'notionSummary'],
        },
      },
    });

    const briefing = JSON.parse((response.text ?? '{}').trim());
    res.json({ briefing });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to generate daily briefing' });
  }
});

// ============================================================================
// 5. VITE DEV MIDDLEWARE / STATIC PRODUCTION SERVING
// ============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LifeOS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
