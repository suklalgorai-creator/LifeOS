import { Goal, Project, Task } from '../types/lifeos';

export interface EngineeringDocSection {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  category: 'PRD & Product' | 'Modular Architecture' | '10M+ User Scalability' | 'Notion & Integrations' | 'Roadmap & QA';
  readTime: string;
  summary: string;
  architectureDiagram?: string;
  keyMetrics?: Array<{ label: string; target: string; detail: string }>;
  sections: Array<{
    heading: string;
    body: string[];
    codeBlock?: {
      language: string;
      filename: string;
      code: string;
    };
  }>;
}

export interface MasterRoadmapPhase {
  id: string;
  phaseNumber: string;
  name: string;
  scaleTarget: string;
  durationEstimate: string;
  status: 'completed' | 'in_progress' | 'planned';
  exitCriteria: string;
  tasks: Array<{
    id: string;
    title: string;
    domain: 'Architecture' | 'Backend & Scale' | 'AI Engine' | 'Flutter & Client' | 'Notion & Sync' | 'Security & QA';
    priority: 'critical' | 'high' | 'medium';
    estimateHours: number;
    completed: boolean;
  }>;
}

export const MASTER_ROADMAP_PHASES: MasterRoadmapPhase[] = [
  {
    id: 'phase_0_1',
    phaseNumber: 'Phase 0–1',
    name: 'Core Domain Foundation & Deterministic Planning Engine',
    scaleTarget: 'Single Owner → 1,000 Early Adopters',
    durationEstimate: 'Weeks 1–3',
    status: 'completed',
    exitCriteria: 'Goal → Project → Task → Schedule Block lifecycle and local-first + API persistence verified with zero data loss.',
    tasks: [
      {
        id: 'rm_tsk_01',
        title: 'Define Clean Architecture domain entities (Goal, Project, Task, ScheduleBlock, Reminder, AIPlan)',
        domain: 'Architecture',
        priority: 'critical',
        estimateHours: 6,
        completed: true,
      },
      {
        id: 'rm_tsk_02',
        title: 'Implement deterministic slot finder & conflict detector protecting fixed commitments and daily workload caps',
        domain: 'AI Engine',
        priority: 'critical',
        estimateHours: 8,
        completed: true,
      },
      {
        id: 'rm_tsk_03',
        title: 'Build 8-state task lifecycle grid with live focus stopwatch (planned vs actual minutes) and postponement reasons',
        domain: 'Flutter & Client',
        priority: 'high',
        estimateHours: 10,
        completed: true,
      },
    ],
  },
  {
    id: 'phase_2_4',
    phaseNumber: 'Phase 2–4',
    name: 'Strict A1 Draft AI Planner, Brainstorm Studio & Official Notion Sync',
    scaleTarget: '1,000 → 50,000 Active Users',
    durationEstimate: 'Weeks 4–7',
    status: 'in_progress',
    exitCriteria: 'Zero unapproved AI mutations; idempotent two-way Notion sync with conflict isolation and OAuth 2.0 popup flow.',
    tasks: [
      {
        id: 'rm_tsk_04',
        title: 'Integrate server-side Gemini structured JSON planner with A1 Draft Approval Diff Drawer and snapshot Undo stack',
        domain: 'AI Engine',
        priority: 'critical',
        estimateHours: 12,
        completed: true,
      },
      {
        id: 'rm_tsk_05',
        title: 'Build Official Notion API OAuth 2.0 & two-way property mapper with persistent notionPageId deduplication',
        domain: 'Notion & Sync',
        priority: 'critical',
        estimateHours: 14,
        completed: true,
      },
      {
        id: 'rm_tsk_06',
        title: 'Implement Notion concurrent-modification & deleted-page conflict resolution center without silent overwrites',
        domain: 'Notion & Sync',
        priority: 'high',
        estimateHours: 8,
        completed: true,
      },
      {
        id: 'rm_tsk_07',
        title: 'Ship Phase 2 AI Brainstorming Idea-to-Roadmap converter and YouTube/Instagram Content Studio pipeline',
        domain: 'Flutter & Client',
        priority: 'high',
        estimateHours: 10,
        completed: true,
      },
    ],
  },
  {
    id: 'phase_5_7',
    phaseNumber: 'Phase 5–7',
    name: 'Multi-Tenant Cloud SQL/Supabase Partitioning, Offline-First Sync & Distributed Queues',
    scaleTarget: '50,000 → 1,000,000 Active Users',
    durationEstimate: 'Weeks 8–13',
    status: 'planned',
    exitCriteria: 'P95 API latency < 85ms; background Notion & Google Calendar sync workers process 50K jobs/min with rate-limit token buckets.',
    tasks: [
      {
        id: 'rm_tsk_08',
        title: 'Deploy PostgreSQL hash-partitioned tables (tasks, schedule_blocks, task_events) with strict Row-Level Security (RLS)',
        domain: 'Backend & Scale',
        priority: 'critical',
        estimateHours: 16,
        completed: false,
      },
      {
        id: 'rm_tsk_09',
        title: 'Implement Flutter Drift/SQLite local-first CRDT outbox queue for sub-10ms offline reads and background delta sync',
        domain: 'Flutter & Client',
        priority: 'critical',
        estimateHours: 18,
        completed: false,
      },
      {
        id: 'rm_tsk_10',
        title: 'Architect Redis + BullMQ distributed worker fleet respecting Notion 3 req/sec per-workspace rate limits',
        domain: 'Notion & Sync',
        priority: 'high',
        estimateHours: 14,
        completed: false,
      },
      {
        id: 'rm_tsk_11',
        title: 'Add FCM/APNs push notification dispatcher with timezone-aware quiet-hours suppression and escalation caps',
        domain: 'Backend & Scale',
        priority: 'high',
        estimateHours: 12,
        completed: false,
      },
    ],
  },
  {
    id: 'phase_8_10',
    phaseNumber: 'Phase 8–10',
    name: 'Global Multi-Region 10M+ User Scale, AI Gateway Caching & Permissioned Native Bridges',
    scaleTarget: '1,000,000 → 10,000,000+ Active Users',
    durationEstimate: 'Weeks 14–22',
    status: 'planned',
    exitCriteria: '99.99% availability SLA across 3 regions; LLM cost per active user < $0.04/mo via deterministic pre-filtering and semantic caching.',
    tasks: [
      {
        id: 'rm_tsk_12',
        title: 'Deploy multi-region read replicas + PgBouncer connection pooling (100K concurrent connections) & Kafka event bus',
        domain: 'Backend & Scale',
        priority: 'critical',
        estimateHours: 24,
        completed: false,
      },
      {
        id: 'rm_tsk_13',
        title: 'Build AI Gateway with token-bucket quotas, deterministic pre-pass, and Redis semantic prompt cache (65% LLM cost reduction)',
        domain: 'AI Engine',
        priority: 'critical',
        estimateHours: 20,
        completed: false,
      },
      {
        id: 'rm_tsk_14',
        title: 'Ship signed Desktop Companion & Android MethodChannel bridges with allowlisted actions, audit logs, and kill switch',
        domain: 'Security & QA',
        priority: 'high',
        estimateHours: 18,
        completed: false,
      },
      {
        id: 'rm_tsk_15',
        title: 'Execute SOC2 Type II & GDPR compliance audit: KMS envelope encryption for OAuth tokens, 1-click data export/erasure',
        domain: 'Security & QA',
        priority: 'critical',
        estimateHours: 16,
        completed: false,
      },
    ],
  },
];

export const ENGINEERING_DOC_SECTIONS: EngineeringDocSection[] = [
  {
    id: 'doc_01_prd',
    number: '01',
    title: 'Product Requirements Document (PRD v2.0 — Personal to 10M+ Scale)',
    subtitle: 'Problem statement, core execution loop, functional inventory (FR-01 to FR-24), and quantitative SLAs.',
    category: 'PRD & Product',
    readTime: '6 min read',
    summary:
      'Defines LifeOS from its single-user executive planning core to a multi-million-user cross-platform AI operating system. Bridges long-term goals and scattered Notion databases into realistic, constraint-checked daily execution.',
    keyMetrics: [
      { label: 'Task Completion Lift', target: '+38% Weekly', detail: 'Completed vs scheduled tasks after deterministic capacity capping' },
      { label: 'Schedule Realism Ratio', target: '0.85 – 1.10x', detail: 'Planned minutes vs tracked actual minutes per domain' },
      { label: 'P95 Client Interaction', target: '< 16ms Local', detail: 'Optimistic local-first state mutations with async server sync' },
      { label: 'Global Availability SLA', target: '99.99% Uptime', detail: 'Active-active regional API tier + offline-capable client' },
    ],
    sections: [
      {
        heading: '1.1 Core Problem & Value Proposition',
        body: [
          'Users capture ambitious plans in scattered workspaces (Notion pages, raw todo lists, calendar apps) but fail to execute because existing tools do not reconcile competing life domains (College, Programming, Content Creation, Personal Projects) against finite daily energy, fixed commitments, and prerequisite dependencies.',
          'LifeOS solves this by making the Deterministic + AI Schedule Engine the single source of execution truth while treating external workspaces like Notion as synchronized data sources.',
        ],
      },
      {
        heading: '1.2 Complete Functional Requirements Inventory (FR-01 to FR-24)',
        body: [
          'FR-01 to FR-04 (Core Hierarchy): Create/edit/archive life domains, multi-milestone Goals, Projects, Tasks, and ordered Subtasks with 8 explicit statuses (inbox, planned, in_progress, completed, partial, postponed, skipped, cancelled).',
          'FR-05 to FR-08 (Deterministic + AI Scheduling & A1 Approval): Protect immovable fixed commitments, enforce daily focused-work caps and break buffers, detect overload, and stage all AI schedule/priority proposals in an editable A1 Draft Approval Drawer with snapshot Undo.',
          'FR-09 to FR-11 (Reminders & Live Time Tracking): Quiet-hours-aware reminders with snooze/escalations; manual start/stop focus stopwatch logging actual vs estimated minutes.',
          'FR-12 to FR-13 (Brainstorming & Content Studio): Convert raw ideas into structured Goal/Project/Task roadmaps via Gemini; manage YouTube/Instagram content pipelines (Idea → Script → Record → Edit → Publish).',
          'FR-14 (Official Two-Way Notion Integration): Connect via server-side OAuth 2.0 or Internal Token, select databases and property mappings, prevent duplicates via persistent notionPageId, run manual or background sync, and isolate concurrent edits or remote deletions in a safe Conflict Resolution Center.',
          'FR-15 to FR-24 (Million-User Enterprise Readiness): Offline-first local database cache with outbox delta sync, multi-tenant Postgres RLS, KMS-encrypted OAuth credential vault, rate-limited webhook & sync workers, and cross-platform Flutter native bridges.',
        ],
      },
    ],
  },
  {
    id: 'doc_02_modular_arch',
    number: '02',
    title: 'Modular Clean Architecture (Flutter + Full-Stack Service Layer)',
    subtitle: 'Strict Presentation / Domain / Data separation, repository contracts, and platform-channel isolation.',
    category: 'Modular Architecture',
    readTime: '8 min read',
    summary:
      'Enforces feature-first modular boundaries so UI components, deterministic scheduling rules, AI tool adapters, and external integrations (Notion, Google Calendar) evolve independently without tight coupling.',
    architectureDiagram: `┌──────────────────────────────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER (Flutter Widgets / React Views)                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │ TodayBriefing│ │ CalendarGrid │ │ A1DiffDrawer │ │ NotionSyncUI │ │ContentStdio│  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └─────┬──────┘  │
└─────────┼────────────────┼────────────────┼────────────────┼───────────────┼─────────┘
          │                ▼                ▼                ▼               │
┌─────────┴──────────────────────────────────────────────────────────────────┴─────────┐
│                        DOMAIN LAYER (Pure Business & Scheduling Rules)               │
│  • ScheduleConstraintEngine (Fixed Slots, Max Cap, Wake/Sleep, Break Buffers)        │
│  • RescheduleChurnAnalyzer (Postponement >= 3x Micro-Block Splitter)                 │
│  • AutonomyGuardUseCase (Enforces A0/A1/A2/A3 Approval & Snapshot Undo Log)          │
│  • SyncConflictDetector (Vector Timestamp Comparison & Safe Deletion Policy)         │
│  • Repository Interfaces: ITaskRepository, IPlanRepository, INotionSyncRepository    │
└─────────┬─────────────────────────────────┬────────────────────────────────┬─────────┘
          ▼                                 ▼                                ▼
┌─────────────────────────┐   ┌───────────────────────────┐   ┌────────────────────────┐
│  LOCAL DATA SOURCE      │   │  REMOTE API & AI GATEWAY  │   │  INTEGRATION ADAPTERS  │
│  • Drift (SQLite) / IDB │   │  • /api/ai/plan-day       │   │  • NotionRestAdapter   │
│  • Optimistic Outbox    │   │  • /api/ai/brainstorm     │   │  • GCalAdapter (Phase7)│
│  • Offline Sync Cursor  │   │  • Server Gemini SDK      │   │  • NativePlatformBridge│
└─────────────────────────┘   └───────────────────────────┘   └────────────────────────┘`,
    sections: [
      {
        heading: '2.1 Feature-First Modular Directory Contract (Flutter & TypeScript Parity)',
        body: [
          'Every feature module encapsulates its own presentation state controllers, domain use cases, and repository implementations behind abstract interfaces. External integrations never mutate core task tables directly—they emit normalized DTOs through the SyncConflictDetector.',
        ],
        codeBlock: {
          language: 'dart',
          filename: 'lib/domain/usecases/propose_daily_schedule_usecase.dart',
          code: `abstract class ISchedulePlannerService {
  Future<AIPlanDraft> generateDailyDraft({
    required DateTime targetDate,
    required List<TaskEntity> candidateTasks,
    required List<ScheduleBlockEntity> immovableBlocks,
    required PlanningConstraints constraints,
  });
}

class ProposeDailyScheduleUseCase {
  final ISchedulePlannerService aiPlanner;
  final DeterministicConstraintValidator validator;
  final IAuditLogRepository auditLog;

  const ProposeDailyScheduleUseCase(this.aiPlanner, this.validator, this.auditLog);

  Future<Result<AIPlanDraft>> execute(PlanRequestParams params) async {
    // 1. Pre-validate immovable commitments and compute available capacity
    final availableWindows = validator.computeFreeWindows(
      wakeTime: params.constraints.wakeTime,
      sleepTime: params.constraints.sleepTime,
      fixedBlocks: params.immovableBlocks,
      bufferMinutes: params.constraints.breakBufferMinutes,
    );

    // 2. Request structured schedule proposal from server-side AI Gateway
    final rawDraft = await aiPlanner.generateDailyDraft(
      targetDate: params.targetDate,
      candidateTasks: params.candidateTasks,
      immovableBlocks: params.immovableBlocks,
      constraints: params.constraints,
    );

    // 3. Post-validate that zero fixed commitments were overlapped
    final sanitizedDraft = validator.enforceHardConstraints(rawDraft, availableWindows);

    // 4. Record in immutable audit trail as A1 Pending Approval (never auto-commit)
    await auditLog.recordProposal(sanitizedDraft, autonomyLevel: AutonomyLevel.a1Draft);
    return Result.success(sanitizedDraft);
  }
}`,
        },
      },
    ],
  },
  {
    id: 'doc_03_million_user_scale',
    number: '03',
    title: 'Million-User Distributed Architecture & Scalability Engineering',
    subtitle: 'Horizontal scaling, database partitioning, distributed sync queues, AI cost governance, and DR.',
    category: '10M+ User Scalability',
    readTime: '10 min read',
    summary:
      'Complete infrastructure blueprint to scale LifeOS from 1 user to 10,000,000+ MAU (~2.5M DAU, 45,000 peak RPS, and 15M daily background Notion/Calendar sync jobs) while maintaining sub-100ms API latency and sustainable AI unit economics.',
    architectureDiagram: `┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        GLOBAL EDGE & CLIENT TIER (10M+ MAU)                            │
│   Flutter Mobile (Android/iOS)  │  Web / PWA Spa  │  Desktop Companion                 │
│   (Local SQLite/Drift Cache + Optimistic UI + Delta Sync Cursor)                       │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ HTTPS / WSS (Cloudflare Edge + Envoy API GW)
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     STATELESS API & AI GATEWAY CLUSTER (Auto-Scaled K8s / Cloud Run)   │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  ┌───────────────────────┐  │
│  │ Core Planning & Sync API│  │ AI Orchestrator Gateway  │  │ OAuth & Webhook Ingest│  │
│  │ (JWT Auth + Rate Limit) │  │ • Deterministic Pre-Pass │  │ • Notion HMAC Verify  │  │
│  │                         │  │ • Redis Semantic Cache   │  │ • Token KMS Vault     │  │
│  └────────────┬────────────┘  └─────────────┬────────────┘  └───────────┬───────────┘  │
└───────────────┼─────────────────────────────┼───────────────────────────┼──────────────┘
                │                             │                           │
     ┌──────────┴──────────┐                  ▼                           ▼
     ▼                     ▼        ┌──────────────────┐      ┌──────────────────────────┐
┌──────────────┐  ┌───────────────┐ │ Gemini API Pool  │      │ Kafka / BullMQ Sync Bus  │
│ PgBouncer    │  │ Redis Cluster │ │ • Flash Routing  │      │ • Per-Workspace Rate     │
│ Pooler Tier  │  │ • Hot State   │ │ • Circuit Breaker│      │   Limiter (3 req/s Notion│
└──────┬───────┘  └───────────────┘ └──────────────────┘      │ • Dead-Letter Retry Queue│
       ▼                                                      └───────────┬──────────────┘
┌──────────────────────────────────────────────────────────┐              │
│   PARTITIONED POSTGRESQL CLUSTER (Primary + Read Replicas│◄─────────────┘
│   • Hash Partitioned by user_id (64 Shards)              │
│   • Time-Range Partitioned task_events & ai_action_logs  │
│   • Strict Row-Level Security (RLS) + KMS Token Columns  │
└──────────────────────────────────────────────────────────┘`,
    keyMetrics: [
      { label: 'Peak Throughput', target: '45,000 RPS', detail: 'Stateless horizontal autoscaling behind Envoy + Cloudflare Edge' },
      { label: 'Database Sharding', target: '64 Hash Partitions', detail: 'Partitioned by user_id with monthly range partitions for logs' },
      { label: 'Notion Sync Rate', target: '3 req/sec / token', detail: 'Distributed Redis token-bucket per user workspace prevents 429s' },
      { label: 'AI Unit Cost @ 1M MAU', target: '$0.038 / User / Mo', detail: 'Achieved via deterministic slot pre-calculation + semantic cache' },
    ],
    sections: [
      {
        heading: '3.1 Database Partitioning, Indexing & Multi-Tenant Isolation (PostgreSQL)',
        body: [
          'At 10M users averaging 150 tasks and 300 schedule blocks per user, the core tables hold 1.5B+ rows. Single-table B-tree indexes degrade without partitioning.',
          'Solution: Partition `tasks`, `schedule_blocks`, and `reminders` by `HASH (user_id)` across 64 logical shards, and partition append-only tables (`task_events`, `ai_action_logs`, `notion_sync_logs`) by `RANGE (created_at)` monthly with automated 90-day cold archival to Parquet object storage.',
          'Every query includes `user_id` in the partition key so reads hit a single partition in < 4ms.',
        ],
        codeBlock: {
          language: 'sql',
          filename: 'supabase/migrations/20261109_01_scalable_lifeos_schema.sql',
          code: `-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Core Tasks Table (Hash Partitioned by user_id for 10M+ User Scale)
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id UUID NOT NULL,
  project_id UUID,
  goal_id UUID,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('inbox','planned','in_progress','completed','partial','postponed','skipped','cancelled')),
  priority TEXT NOT NULL CHECK (priority IN ('critical','high','medium','low')),
  due_at DATE,
  scheduled_date DATE,
  estimate_minutes INT NOT NULL DEFAULT 30,
  actual_minutes INT NOT NULL DEFAULT 0,
  is_fixed_commitment BOOLEAN NOT NULL DEFAULT FALSE,
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  postpone_count INT NOT NULL DEFAULT 0,
  last_postpone_reason TEXT,
  -- Persistent Notion Deduplication & Conflict Vector Metadata
  notion_page_id TEXT,
  notion_database_id TEXT,
  notion_last_synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
) PARTITION BY HASH (user_id);

-- Create 16 initial hash partitions (expandable to 64/256)
CREATE TABLE public.tasks_p0 PARTITION OF public.tasks FOR VALUES WITH (MODULUS 16, REMAINDER 0);
CREATE TABLE public.tasks_p1 PARTITION OF public.tasks FOR VALUES WITH (MODULUS 16, REMAINDER 1);

-- Unique partial index preventing duplicate Notion imports per user
CREATE UNIQUE INDEX idx_tasks_user_notion_page
  ON public.tasks (user_id, notion_page_id)
  WHERE notion_page_id IS NOT NULL;

-- Hot composite index for Today Dashboard & AI Scheduler queries
CREATE INDEX idx_tasks_user_schedule_status
  ON public.tasks (user_id, scheduled_date, status, priority);

-- Strict Row-Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users isolate own tasks" ON public.tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`,
        },
      },
      {
        heading: '3.2 AI Gateway Cost & Latency Engineering at Million-User Scale',
        body: [
          'Calling an LLM on every keystroke or task toggle would bankrupt unit economics at 1M+ DAU. LifeOS enforces a 3-tier AI Gateway:',
          '1. Deterministic First-Pass (0 LLM tokens): The client/edge computes free calendar windows, checks daily workload caps, and validates prerequisites deterministically in < 2ms.',
          '2. Hash-Based Semantic Plan Cache (Redis): If the user’s active task set hash + constraint hash has not changed since the last draft generation, serve the cached A1 Draft immediately.',
          '3. Tiered Model Routing (`gemini-3.8-flash` vs `gemini-4-argon`): Routine daily schedule packing and inbox parsing route to `gemini-3.8-flash` with strict JSON schema constraints; multi-week curriculum roadmaps optionally route to `gemini-4-argon`.',
        ],
      },
    ],
  },
  {
    id: 'doc_04_notion_sync_spec',
    number: '04',
    title: 'Official Notion Integration & Two-Way Sync Specification',
    subtitle: 'Server-side OAuth 2.0 token vault, idempotent notionPageId deduplication, rate limiting, and conflict safety.',
    category: 'Notion & Integrations',
    readTime: '7 min read',
    summary:
      'Architectural specification for the Notion Integration Module. Guarantees that credentials remain strictly server-side, duplicate records are impossible, deleted Notion pages never silently wipe scheduled work, and LifeOS remains the primary scheduling engine.',
    sections: [
      {
        heading: '4.1 Server-Side Credential Security & OAuth 2.0 Flow',
        body: [
          'React/Flutter clients never hold Notion API secrets. OAuth authorization opens `https://api.notion.com/v1/oauth/authorize` directly in a popup window.',
          'The Express callback (`/auth/notion/callback`) exchanges the authorization code using HTTP Basic Auth (`CLIENT_ID:CLIENT_SECRET`) on the backend, encrypts the resulting `access_token` at rest using AES-256-GCM (KMS envelope encryption in production), and notifies the opener window via `postMessage`.',
        ],
      },
      {
        heading: '4.2 Idempotent Two-Way Sync & Conflict Resolution State Machine',
        body: [
          '1. Persistent `notionPageId` Deduplication: Every imported Notion page stores its canonical UUID in `notionPageId` (indexed uniquely per `user_id`). Subsequent syncs match on `notionPageId` before ever creating a new record.',
          '2. Three-Way Timestamp Comparison (`updatedAt` vs `notionUpdatedAt` vs `notionLastSyncedAt`):',
          '   • If only Notion changed (`notionUpdatedAt > notionLastSyncedAt` and `lifeos.updatedAt <= notionLastSyncedAt`) → apply update in LifeOS.',
          '   • If only LifeOS changed (`lifeos.updatedAt > notionLastSyncedAt` and `notionUpdatedAt <= notionLastSyncedAt`) → push PATCH to `https://api.notion.com/v1/pages/:page_id`.',
          '   • If BOTH changed since `notionLastSyncedAt` → halt mutation on that record and emit a `NotionSyncConflict` entry so the user can choose Keep LifeOS, Accept Notion, or Stage in A1 Draft.',
          '3. Safe Deletion Handling: If a linked Notion page is archived or missing from query results, LifeOS flags a `deleted_in_notion` conflict rather than deleting the user’s scheduled task or time logs.',
        ],
      },
    ],
  },
  {
    id: 'doc_05_security_qa',
    number: '05',
    title: 'Security, AI Safety (A0–A3 Autonomy) & Comprehensive QA Test Matrix',
    subtitle: 'Prompt-injection defense, permission boundaries, unit/integration/AI evaluation suites.',
    category: 'Roadmap & QA',
    readTime: '5 min read',
    summary:
      'Defines the security guardrails and automated verification suites required before promoting any release across mobile, web, and backend tiers.',
    sections: [
      {
        heading: '5.1 Untrusted External Content & Prompt Injection Defense',
        body: [
          'Connected Notion pages or imported notes may contain arbitrary text. When passing task titles or notes to Gemini, LifeOS wraps external fields in strict XML data delimiters (`<untrusted_task_data>...</untrusted_task_data>`) and enforces a structured JSON `responseSchema` with zero tool-execution privileges during planning.',
          'Under Strict A1 Draft Mode, no AI output can directly invoke external write APIs, delete user records, or overwrite locked calendar slots.',
        ],
      },
      {
        heading: '5.2 Automated QA & Acceptance Test Matrix',
        body: [
          '• Unit Suite T-01 (Immovable Slot Protection): Verify that 100% of `fixed_timetable` and `locked: true` schedule blocks remain unchanged across all deterministic and AI rescheduling runs.',
          '• Unit Suite T-02 (Workload Cap & Postponement Escalation): Verify that daily scheduled focused work never exceeds `maxDailyWorkMinutes` and tasks with `postponeCount >= 3` trigger recovery slot suggestions instead of notification spam.',
          '• Integration Suite T-03 (Notion Idempotency & Conflict Safety): Run 5 consecutive sync cycles on identical Notion payloads and assert 0 duplicate tasks created; simulate concurrent local + remote edits and assert conflict quarantine.',
        ],
      },
    ],
  },
];

export function createRoadmapImportBundle(): {
  goal: Goal;
  project: Project;
  tasks: Task[];
} {
  const now = new Date().toISOString();
  const goalId = 'goal_lifeos_10m_scale';
  const projectId = 'proj_lifeos_distributed_arch';

  const goal: Goal = {
    id: goalId,
    categoryId: 'cat_vibe_coding',
    title: 'Scale LifeOS Architecture to 10M+ Users (Production Roadmap)',
    description:
      'Execute the 10-phase engineering roadmap: PostgreSQL hash partitioning, Flutter Drift offline-first CRDT sync, Redis/BullMQ Notion sync workers, and AI Gateway semantic caching.',
    targetDate: '2027-03-31',
    status: 'active',
    priority: 'critical',
    progressPercent: 45,
    updatedAt: now,
  };

  const project: Project = {
    id: projectId,
    goalId,
    categoryId: 'cat_vibe_coding',
    title: 'LifeOS Phase 5–10 Distributed Cloud & Flutter Migration',
    description:
      'Implement multi-tenant RLS partitions, per-workspace Notion rate limiters (3 req/s), and cross-platform Flutter native bridges.',
    status: 'active',
    priority: 'critical',
    startDate: '2026-11-09',
    dueDate: '2027-01-30',
    updatedAt: now,
  };

  const tasks: Task[] = MASTER_ROADMAP_PHASES.flatMap((phase) =>
    phase.tasks
      .filter((t) => !t.completed)
      .map((t, idx) => ({
        id: `tsk_${t.id}`,
        projectId,
        goalId,
        categoryId: 'cat_vibe_coding',
        title: `[${phase.phaseNumber}] ${t.title}`,
        description: `Domain: ${t.domain} · Scale Target: ${phase.scaleTarget} · Exit Criteria: ${phase.exitCriteria}`,
        status: idx < 2 ? 'planned' : 'inbox',
        priority: t.priority,
        dueAt: `2026-11-${String(12 + idx * 2).padStart(2, '0')}`,
        scheduledDate: idx === 0 ? '2026-11-09' : undefined,
        estimateMinutes: Math.min(90, t.estimateHours * 5),
        actualMinutes: 0,
        recurrence: 'none',
        isFixedCommitment: false,
        locked: false,
        postponeCount: 0,
        prerequisiteTaskIds: [],
        subtasks: [
          {
            id: `sub_${t.id}_1`,
            taskId: `tsk_${t.id}`,
            title: 'Write domain interface contract & unit test suite',
            completed: false,
            order: 1,
          },
          {
            id: `sub_${t.id}_2`,
            taskId: `tsk_${t.id}`,
            title: 'Benchmark P95 latency & verify RLS security isolation',
            completed: false,
            order: 2,
          },
        ],
        updatedAt: now,
      }))
  );

  return { goal, project, tasks };
}
