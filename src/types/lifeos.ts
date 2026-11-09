export type TaskStatus =
  | 'inbox'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'partial'
  | 'postponed'
  | 'skipped'
  | 'cancelled';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export type AutonomyLevel = 'A0' | 'A1' | 'A2' | 'A3';

export type NavigationTab =
  | 'today'
  | 'calendar'
  | 'tasks'
  | 'goals'
  | 'ai_assistant'
  | 'brainstorm'
  | 'content_studio'
  | 'insights'
  | 'connections'
  | 'flutter_blueprint'
  | 'settings';

export interface PlanningConstraints {
  wakeTime: string; // e.g., "07:30"
  sleepTime: string; // e.g., "23:00"
  maxDailyWorkMinutes: number; // e.g., 360 (6h focused work outside fixed classes)
  breakBufferMinutes: number; // e.g., 15
  quietHoursStart: string; // e.g., "22:30"
  quietHoursEnd: string; // e.g., "07:30"
  protectFixedEvents: boolean;
  autoRescheduleEnabled: boolean; // False by default under A1
  autonomyLevel: AutonomyLevel;
  automationKillSwitch: boolean;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  timezone: string;
  constraints: PlanningConstraints;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string; // Tailwind semantic indicator token
  description: string;
  order: number;
  archived: boolean;
}

export interface Goal {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  targetDate: string; // YYYY-MM-DD
  status: 'active' | 'completed' | 'paused' | 'archived';
  priority: PriorityLevel;
  progressPercent: number;
  // Persistent Notion Sync Metadata
  notionPageId?: string;
  notionDatabaseId?: string;
  notionUrl?: string;
  notionLastSyncedAt?: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  goalId?: string;
  categoryId: string;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  priority: PriorityLevel;
  startDate: string;
  dueDate: string;
  // Persistent Notion Sync Metadata
  notionPageId?: string;
  notionDatabaseId?: string;
  notionUrl?: string;
  notionLastSyncedAt?: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface Task {
  id: string;
  projectId?: string;
  goalId?: string;
  categoryId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: PriorityLevel;
  dueAt: string; // YYYY-MM-DD
  scheduledDate?: string; // YYYY-MM-DD
  estimateMinutes: number;
  actualMinutes: number;
  recurrence?: 'none' | 'daily' | 'weekdays' | 'weekly';
  isFixedCommitment: boolean;
  locked: boolean;
  postponeCount: number;
  lastPostponeReason?: string;
  prerequisiteTaskIds: string[];
  subtasks: Subtask[];
  // Persistent Notion Sync Metadata
  notionPageId?: string;
  notionDatabaseId?: string;
  notionUrl?: string;
  notionLastSyncedAt?: string;
  notionDeleted?: boolean;
  updatedAt: string;
}

export interface ScheduleBlock {
  id: string;
  taskId?: string;
  title: string;
  categoryId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  source: 'user' | 'fixed_timetable' | 'ai_proposed';
  locked: boolean;
  accepted: boolean;
  notes?: string;
}

export interface Reminder {
  id: string;
  taskId: string;
  taskTitle: string;
  categoryId: string;
  triggerAt: string; // HH:mm
  date: string; // YYYY-MM-DD
  channel: 'in_app' | 'local_notification';
  state: 'scheduled' | 'triggered' | 'snoozed' | 'completed' | 'dismissed';
  snoozeCount: number;
  escalationFlag: boolean;
}

export interface TaskEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  eventType:
    | 'created'
    | 'status_changed'
    | 'postponed'
    | 'rescheduled'
    | 'timer_logged'
    | 'ai_proposed'
    | 'notion_synced';
  timestamp: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface IdeaNote {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  tags: string[];
  linkedGoalId?: string;
  linkedProjectId?: string;
  linkedTaskId?: string;
  notionPageId?: string;
  notionUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContentStage = 'idea' | 'script' | 'record' | 'edit' | 'publish';
export type ContentPlatform = 'YouTube' | 'Instagram' | 'Cross-Platform';

export interface ContentChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ContentItem {
  id: string;
  title: string;
  platform: ContentPlatform;
  stage: ContentStage;
  categoryId: string;
  targetPublishDate: string;
  hookOrAngle: string;
  scriptOutline: string;
  estimateMinutes: number;
  linkedTaskId?: string;
  checklist: ContentChecklistItem[];
}

export interface ProposedTaskUpdate {
  taskId: string;
  taskTitle: string;
  currentPriority: PriorityLevel;
  proposedPriority: PriorityLevel;
  currentStatus: TaskStatus;
  proposedStatus: TaskStatus;
  currentScheduledDate?: string;
  proposedScheduledDate: string;
  rationale: string;
  selected: boolean;
}

export interface ProposedNewRoadmapItem {
  tempId: string;
  type: 'goal' | 'project' | 'task';
  title: string;
  categoryId: string;
  priority: PriorityLevel;
  estimateMinutes: number;
  dueAt: string;
  description: string;
  selected: boolean;
}

export interface AIPlan {
  id: string;
  title: string;
  planType: 'daily_schedule' | 'overdue_reschedule' | 'inbox_organization' | 'brainstorm_roadmap' | 'notion_import_review';
  targetDate: string;
  generatedAt: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'undone';
  summary: string;
  assumptions: string[];
  overloadWarnings: string[];
  proposedBlocks: ScheduleBlock[];
  proposedTaskUpdates: ProposedTaskUpdate[];
  proposedNewItems?: ProposedNewRoadmapItem[];
  acceptedAt?: string;
}

export interface AIActionLog {
  id: string;
  timestamp: string;
  action: string;
  tool: string;
  autonomyLevel: AutonomyLevel;
  inputsSummary: string;
  resultSummary: string;
  approvalState: 'pending' | 'approved' | 'rejected' | 'undone';
  planId?: string;
  canUndo: boolean;
}

// ============================================================================
// NOTION INTEGRATION MODULE ENTITIES
// ============================================================================

export type NotionSyncDirection = 'two_way' | 'notion_to_lifeos' | 'lifeos_to_notion';
export type NotionTargetEntity = 'tasks' | 'projects' | 'goals' | 'notes';
export type NotionConflictPolicy = 'ask_user' | 'prefer_lifeos' | 'prefer_notion' | 'newest_wins';

export interface NotionPropertyMapping {
  titleProperty: string;
  statusProperty: string;
  priorityProperty: string;
  dueDateProperty: string;
  estimateMinutesProperty: string;
  categoryProperty: string;
}

export interface NotionDatabaseSchemaProperty {
  id: string;
  name: string;
  type: string;
  options?: string[];
}

export interface NotionDatabaseConfig {
  databaseId: string;
  title: string;
  icon?: string;
  url: string;
  enabled: boolean;
  targetEntity: NotionTargetEntity;
  syncDirection: NotionSyncDirection;
  defaultCategoryId: string;
  propertyMapping: NotionPropertyMapping;
  availableProperties: NotionDatabaseSchemaProperty[];
  lastSyncedAt?: string;
  syncedRecordCount: number;
}

export interface NotionSyncConflict {
  id: string;
  detectedAt: string;
  entityType: NotionTargetEntity;
  lifeosId: string;
  notionPageId: string;
  notionDatabaseId: string;
  title: string;
  conflictType: 'concurrent_modification' | 'deleted_in_notion' | 'deleted_in_lifeos' | 'status_mismatch';
  lifeosUpdatedAt: string;
  notionUpdatedAt: string;
  lifeosValues: {
    title: string;
    status: string;
    priority?: string;
    dueAt?: string;
    estimateMinutes?: number;
  };
  notionValues: {
    title: string;
    status: string;
    priority?: string;
    dueAt?: string;
    estimateMinutes?: number;
    archived?: boolean;
  };
  resolved: boolean;
  resolution?: 'keep_lifeos' | 'accept_notion' | 'stage_ai_draft' | 'unlink_keep_local';
}

export interface NotionSyncLogEntry {
  id: string;
  timestamp: string;
  trigger: 'manual' | 'auto_background' | 'single_item';
  status: 'success' | 'conflict_detected' | 'error';
  importedCount: number;
  updatedInLifeosCount: number;
  pushedToNotionCount: number;
  conflictCount: number;
  deletedSafelyHandledCount: number;
  durationMs: number;
  message: string;
  errorDetail?: string;
}

export interface NotionConnectionState {
  connected: boolean;
  authMode: 'oauth' | 'internal_token' | 'unconfigured';
  workspaceName?: string;
  workspaceIcon?: string;
  workspaceId?: string;
  botId?: string;
  ownerName?: string;
  oauthConfiguredOnServer: boolean;
  internalTokenConfiguredOnServer: boolean;
  redirectUri: string;
  sharedRedirectUri: string;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  conflictPolicy: NotionConflictPolicy;
  routeImportsThroughA1Draft: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: 'idle' | 'syncing' | 'success' | 'conflict' | 'error';
  lastError?: string;
  databases: NotionDatabaseConfig[];
  conflicts: NotionSyncConflict[];
  syncLogs: NotionSyncLogEntry[];
}
