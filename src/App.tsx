/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  CheckSquare,
  Target,
  Sparkles,
  Lightbulb,
  Video,
  BarChart3,
  Link2,
  FileCode2,
  Settings,
  LayoutDashboard,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Plus,
  Lock,
  Unlock,
  Bell,
  AlertTriangle,
  RotateCcw,
  Sun,
  Moon,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  NavigationTab,
  UserProfile,
  Category,
  Goal,
  Project,
  Task,
  TaskStatus,
  PriorityLevel,
  ScheduleBlock,
  Reminder,
  TaskEvent,
  IdeaNote,
  ContentItem,
  ContentStage,
  AIPlan,
  AIActionLog,
  NotionConnectionState,
  NotionSyncConflict,
} from './types/lifeos';
import {
  TODAY_DATE,
  INITIAL_USER_PROFILE,
  INITIAL_CATEGORIES,
  INITIAL_GOALS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_SCHEDULE_BLOCKS,
  INITIAL_REMINDERS,
  INITIAL_TASK_EVENTS,
  INITIAL_IDEA_NOTES,
  INITIAL_CONTENT_ITEMS,
  INITIAL_AI_PLANS,
  INITIAL_AI_ACTION_LOGS,
  INITIAL_NOTION_CONNECTION,
} from './data/seedData';
import {
  buildDeterministicScheduleDraft,
  detectScheduleConflicts,
  getBlockDurationMinutes,
} from './utils/schedulerEngine';
import { createRoadmapImportBundle } from './data/millionUserDocsData';
import { NotionConnectionsView } from './components/NotionConnectionsView';
import { ScaleAndDocsHub } from './components/ScaleAndDocsHub';
import { AIProposalDrawer } from './components/AIProposalDrawer';
import { BrainstormAndContentView } from './components/BrainstormAndContentView';
import { InsightsAndReviewView } from './components/InsightsAndReviewView';

const STORAGE_KEY = 'lifeos_workspace_state_v2';

interface UndoSnapshot {
  tasks: Task[];
  blocks: ScheduleBlock[];
  projects: Project[];
  goals: Goal[];
  planId: string;
}

export default function App() {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<NavigationTab>('today');
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Core LifeOS State (Persisted to localStorage)
  const [profile, setProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>(INITIAL_SCHEDULE_BLOCKS);
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
  const [taskEvents, setTaskEvents] = useState<TaskEvent[]>(INITIAL_TASK_EVENTS);
  const [ideaNotes, setIdeaNotes] = useState<IdeaNote[]>(INITIAL_IDEA_NOTES);
  const [contentItems, setContentItems] = useState<ContentItem[]>(INITIAL_CONTENT_ITEMS);
  const [aiPlans, setAiPlans] = useState<AIPlan[]>(INITIAL_AI_PLANS);
  const [aiActionLogs, setAiActionLogs] = useState<AIActionLog[]>(INITIAL_AI_ACTION_LOGS);
  const [notionState, setNotionState] = useState<NotionConnectionState>(INITIAL_NOTION_CONNECTION);

  // Undo Snapshot Stack for A1 Plan Commits
  const [lastUndoSnapshot, setLastUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [roadmapImported, setRoadmapImported] = useState<boolean>(false);

  // UI Transient Controls
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_DATE);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [quickCaptureOpen, setQuickCaptureOpen] = useState<boolean>(false);
  const [quickTitle, setQuickTitle] = useState<string>('');
  const [quickCategory, setQuickCategory] = useState<string>('cat_programming');
  const [quickPriority, setQuickPriority] = useState<PriorityLevel>('high');
  const [quickEstimate, setQuickEstimate] = useState<number>(45);
  const [quickDueDate, setQuickDueDate] = useState<string>(TODAY_DATE);

  // Postponement Reason Inline Prompt State
  const [postponingTaskId, setPostponingTaskId] = useState<string | null>(null);
  const [postponeReasonInput, setPostponeReasonInput] = useState<string>(
    'Evening energy drop after college lab'
  );

  // Live Focus Timer State
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>('tsk_c_pointer_arena');
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // AI & Sync Loading States
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [isSyncingNotion, setIsSyncingNotion] = useState<boolean>(false);
  const [dailyBriefing, setDailyBriefing] = useState<{
    headline: string;
    topPriorities: string[];
    riskAlert: string;
    notionSummary: string;
  }>({
    headline: 'Focus on CS302 Scheduler Lab & C Arena Allocator; 1 Notion Conflict Quarantined.',
    topPriorities: [
      'Complete Arena Block Coalescing in Custom Malloc (14:00–15:00) before DBMS Practical Lab.',
      'Submit CS302 Round-Robin & MLFQ CPU Scheduler Lab by 19:45.',
      'Approve or adjust the A1 Recovery Draft for DBMS B+ Tree Node Split (postponed 3x).',
    ],
    riskAlert:
      'DBMS B+ Tree Problem Set was postponed 3 times in evening slots—A1 Draft shifts it to your 12:45 midday window.',
    notionSummary:
      '3 Notion databases linked via persistent notionPageId · 1 concurrent modification held safely for your review.',
  });
  const [isLoadingBriefing, setIsLoadingBriefing] = useState<boolean>(false);

  // New Goal / Project Creation Form State
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCat, setNewGoalCat] = useState('cat_programming');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('2026-12-30');
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockStart, setNewBlockStart] = useState('12:45');
  const [newBlockEnd, setNewBlockEnd] = useState('13:30');
  const [newBlockFixed, setNewBlockFixed] = useState(false);

  // Load persisted workspace on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.goals) setGoals(parsed.goals);
        if (parsed.projects) setProjects(parsed.projects);
        if (parsed.tasks) setTasks(parsed.tasks);
        if (parsed.scheduleBlocks) setScheduleBlocks(parsed.scheduleBlocks);
        if (parsed.reminders) setReminders(parsed.reminders);
        if (parsed.taskEvents) setTaskEvents(parsed.taskEvents);
        if (parsed.ideaNotes) setIdeaNotes(parsed.ideaNotes);
        if (parsed.contentItems) setContentItems(parsed.contentItems);
        if (parsed.aiPlans) setAiPlans(parsed.aiPlans);
        if (parsed.aiActionLogs) setAiActionLogs(parsed.aiActionLogs);
        if (parsed.notionState) setNotionState(parsed.notionState);
      }
    } catch {
      // Fallback to seed data
    }
  }, []);

  // Persist workspace changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          profile,
          categories,
          goals,
          projects,
          tasks,
          scheduleBlocks,
          reminders,
          taskEvents,
          ideaNotes,
          contentItems,
          aiPlans,
          aiActionLogs,
          notionState,
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [
    profile,
    categories,
    goals,
    projects,
    tasks,
    scheduleBlocks,
    reminders,
    taskEvents,
    ideaNotes,
    contentItems,
    aiPlans,
    aiActionLogs,
    notionState,
  ]);

  // Sync Dark Mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Live Focus Timer Interval
  useEffect(() => {
    if (!timerRunning || !activeTimerTaskId) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, activeTimerTaskId]);

  // Automatic Background Notion Sync Timer (when enabled and kill switch is off)
  const syncTriggerRef = useRef<(trigger: 'manual' | 'auto_background') => Promise<void>>(
    async () => {}
  );

  const handleTriggerNotionSync = async (
    trigger: 'manual' | 'auto_background',
    simulateRemoteChanges = false
  ) => {
    if (profile.constraints.automationKillSwitch && trigger === 'auto_background') return;
    setIsSyncingNotion(true);
    try {
      const res = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databases: notionState.databases,
          tasks,
          projects,
          goals,
          conflictPolicy: notionState.conflictPolicy,
          trigger,
          simulateRemoteChanges,
        }),
      });
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
      }
      if (data.logEntry) {
        setNotionState((prev) => ({
          ...prev,
          lastSyncAt: data.logEntry.timestamp,
          lastSyncStatus:
            data.newConflicts?.length > 0 ? 'conflict' : res.ok ? 'success' : 'error',
          conflicts: [...(data.newConflicts || []), ...prev.conflicts],
          syncLogs: [data.logEntry, ...prev.syncLogs.slice(0, 19)],
        }));
      }
    } catch (err: any) {
      setNotionState((prev) => ({
        ...prev,
        lastSyncStatus: 'error',
        lastError: err?.message || 'Network error during Notion sync',
      }));
    } finally {
      setIsSyncingNotion(false);
    }
  };

  syncTriggerRef.current = handleTriggerNotionSync;

  useEffect(() => {
    if (!notionState.autoSyncEnabled || profile.constraints.automationKillSwitch) return;
    const ms = Math.max(1, notionState.autoSyncIntervalMinutes) * 60 * 1000;
    const timer = setInterval(() => {
      syncTriggerRef.current('auto_background');
    }, ms);
    return () => clearInterval(timer);
  }, [
    notionState.autoSyncEnabled,
    notionState.autoSyncIntervalMinutes,
    profile.constraints.automationKillSwitch,
  ]);

  // Helper: Record Task Event
  const logTaskEvent = (
    taskId: string,
    taskTitle: string,
    eventType: TaskEvent['eventType'],
    oldValue?: string,
    newValue?: string,
    reason?: string
  ) => {
    setTaskEvents((prev) => [
      {
        id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
        taskId,
        taskTitle,
        eventType,
        timestamp: new Date().toISOString(),
        oldValue,
        newValue,
        reason,
      },
      ...prev,
    ]);
  };

  // Task Status Transition Handler
  const handleUpdateTaskStatus = (taskId: string, nextStatus: TaskStatus, reason?: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const isPostpone = nextStatus === 'postponed';
        logTaskEvent(
          t.id,
          t.title,
          isPostpone ? 'postponed' : 'status_changed',
          t.status,
          nextStatus,
          reason
        );
        return {
          ...t,
          status: nextStatus,
          postponeCount: isPostpone ? t.postponeCount + 1 : t.postponeCount,
          lastPostponeReason: isPostpone && reason ? reason : t.lastPostponeReason,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    setPostponingTaskId(null);
  };

  // Toggle Subtask Completion
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, completed: !s.completed } : s
              ),
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
  };

  // Start / Stop Focus Timer & Log Elapsed Minutes
  const handleToggleTimerForTask = (task: Task) => {
    if (activeTimerTaskId === task.id && timerRunning) {
      // Stop and commit elapsed minutes
      const addedMinutes = Math.max(1, Math.round(timerSeconds / 60));
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                actualMinutes: t.actualMinutes + addedMinutes,
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
      logTaskEvent(
        task.id,
        task.title,
        'timer_logged',
        `${task.actualMinutes}m`,
        `${task.actualMinutes + addedMinutes}m`,
        `Logged +${addedMinutes}m focus session`
      );
      setTimerRunning(false);
      setTimerSeconds(0);
    } else {
      setActiveTimerTaskId(task.id);
      setTimerSeconds(0);
      setTimerRunning(true);
      if (task.status === 'inbox' || task.status === 'planned') {
        handleUpdateTaskStatus(task.id, 'in_progress', 'Started live focus stopwatch');
      }
    }
  };

  // Quick Capture Task Handler
  const handleQuickCaptureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const newTask: Task = {
      id: `tsk_${Date.now().toString(36)}`,
      categoryId: quickCategory,
      title: quickTitle.trim(),
      description: 'Captured via Quick Capture bar.',
      status: quickDueDate === TODAY_DATE ? 'planned' : 'inbox',
      priority: quickPriority,
      dueAt: quickDueDate,
      scheduledDate: quickDueDate === TODAY_DATE ? TODAY_DATE : undefined,
      estimateMinutes: Number(quickEstimate) || 30,
      actualMinutes: 0,
      recurrence: 'none',
      isFixedCommitment: false,
      locked: false,
      postponeCount: 0,
      prerequisiteTaskIds: [],
      subtasks: [],
      updatedAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    logTaskEvent(newTask.id, newTask.title, 'created', undefined, newTask.status, 'Quick Capture');
    setQuickTitle('');
    setQuickCaptureOpen(false);
  };

  // Generate Daily Plan or Overdue Recovery Plan (Server Gemini + Deterministic Fallback)
  const handleGenerateScheduleDraft = async (mode: 'daily_schedule' | 'overdue_reschedule') => {
    if (profile.constraints.automationKillSwitch) return;
    setIsGeneratingPlan(true);
    try {
      const res = await fetch('/api/ai/plan-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDate: selectedDate,
          tasks,
          existingBlocks: scheduleBlocks,
          constraints: profile.constraints,
          mode,
        }),
      });
      const data = await res.json();
      let draftPlan: AIPlan;

      if (res.ok && data.plan) {
        draftPlan = data.plan;
      } else {
        // Use deterministic conflict-free scheduler fallback
        draftPlan = buildDeterministicScheduleDraft({
          targetDate: selectedDate,
          tasks,
          existingBlocks: scheduleBlocks,
          constraints: profile.constraints,
          categories,
          mode,
        });
      }

      setAiPlans((prev) => [
        draftPlan,
        ...prev.map((p) => (p.status === 'pending_approval' ? { ...p, status: 'rejected' as const } : p)),
      ]);

      setAiActionLogs((prev) => [
        {
          id: `log_${Date.now().toString(36)}`,
          timestamp: new Date().toISOString(),
          action:
            mode === 'overdue_reschedule'
              ? 'Proposed Overdue Recovery Schedule Draft'
              : 'Proposed Daily Schedule Draft',
          tool: res.ok && data.plan ? 'gemini-3.8-flash + constraint_validator' : 'deterministic_slot_engine',
          autonomyLevel: 'A1',
          inputsSummary: `${tasks.length} tasks, ${scheduleBlocks.filter((b) => b.locked || b.source === 'fixed_timetable').length} immovable slots`,
          resultSummary: `Staged ${draftPlan.proposedBlocks.length} blocks for user approval`,
          approvalState: 'pending',
          planId: draftPlan.id,
          canUndo: false,
        },
        ...prev,
      ]);
    } catch {
      const fallback = buildDeterministicScheduleDraft({
        targetDate: selectedDate,
        tasks,
        existingBlocks: scheduleBlocks,
        constraints: profile.constraints,
        categories,
        mode,
      });
      setAiPlans((prev) => [fallback, ...prev]);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Approve & Commit Staged A1 Plan (Records Undo Snapshot First)
  const handleApprovePlan = (plan: AIPlan) => {
    // 1. Save Undo Snapshot
    setLastUndoSnapshot({
      tasks: [...tasks],
      blocks: [...scheduleBlocks],
      projects: [...projects],
      goals: [...goals],
      planId: plan.id,
    });

    // 2. Commit schedule blocks (preserving fixed/locked blocks on that date)
    if (plan.proposedBlocks.length > 0) {
      setScheduleBlocks((prev) => {
        const preserved = prev.filter(
          (b) => b.date !== plan.targetDate || b.source === 'fixed_timetable' || b.locked
        );
        const committed = plan.proposedBlocks.map((b) => ({
          ...b,
          accepted: true,
        }));
        return [...preserved, ...committed];
      });
    }

    // 3. Commit selected task priority/date updates
    const selectedUpdates = plan.proposedTaskUpdates.filter((u) => u.selected);
    if (selectedUpdates.length > 0) {
      setTasks((prev) =>
        prev.map((t) => {
          const upd = selectedUpdates.find((u) => u.taskId === t.id);
          if (!upd) return t;
          return {
            ...t,
            priority: upd.proposedPriority,
            status: upd.proposedStatus,
            scheduledDate: upd.proposedScheduledDate,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    }

    // 4. Commit selected new roadmap items (from Brainstorm decomposer)
    const selectedNew = (plan.proposedNewItems || []).filter((i) => i.selected);
    if (selectedNew.length > 0) {
      const newProjs: Project[] = [];
      const newTsks: Task[] = [];
      for (const item of selectedNew) {
        if (item.type === 'project') {
          newProjs.push({
            id: `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
            categoryId: item.categoryId,
            title: item.title,
            description: item.description,
            status: 'active',
            priority: item.priority,
            startDate: TODAY_DATE,
            dueDate: item.dueAt,
            updatedAt: new Date().toISOString(),
          });
        } else {
          newTsks.push({
            id: `tsk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
            categoryId: item.categoryId,
            title: item.title,
            description: item.description,
            status: 'planned',
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
            updatedAt: new Date().toISOString(),
          });
        }
      }
      if (newProjs.length > 0) setProjects((prev) => [...newProjs, ...prev]);
      if (newTsks.length > 0) setTasks((prev) => [...newTsks, ...prev]);
    }

    // 5. Mark plan approved & update audit log
    setAiPlans((prev) =>
      prev.map((p) =>
        p.id === plan.id ? { ...p, status: 'approved', acceptedAt: new Date().toISOString() } : p
      )
    );
    setAiActionLogs((prev) =>
      prev.map((l) =>
        l.planId === plan.id
          ? {
              ...l,
              approvalState: 'approved',
              resultSummary: 'Approved and committed by user (Undo snapshot saved)',
              canUndo: true,
            }
          : l
      )
    );
  };

  const handleRejectPlan = (planId: string) => {
    setAiPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, status: 'rejected' } : p))
    );
    setAiActionLogs((prev) =>
      prev.map((l) =>
        l.planId === planId
          ? { ...l, approvalState: 'rejected', resultSummary: 'Rejected by user (0 changes applied)' }
          : l
      )
    );
  };

  const handleUndoLastPlan = () => {
    if (!lastUndoSnapshot) return;
    setTasks(lastUndoSnapshot.tasks);
    setScheduleBlocks(lastUndoSnapshot.blocks);
    setProjects(lastUndoSnapshot.projects);
    setGoals(lastUndoSnapshot.goals);
    setAiPlans((prev) =>
      prev.map((p) => (p.id === lastUndoSnapshot.planId ? { ...p, status: 'undone' } : p))
    );
    setAiActionLogs((prev) =>
      prev.map((l) =>
        l.planId === lastUndoSnapshot.planId
          ? { ...l, approvalState: 'undone', resultSummary: 'Rolled back via 1-click Undo', canUndo: false }
          : l
      )
    );
    setLastUndoSnapshot(null);
  };

  // Resolve Notion Conflict
  const handleResolveNotionConflict = (
    conflict: NotionSyncConflict,
    resolution: 'keep_lifeos' | 'accept_notion' | 'stage_ai_draft' | 'unlink_keep_local'
  ) => {
    if (resolution === 'accept_notion') {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === conflict.lifeosId
            ? {
                ...t,
                title: conflict.notionValues.title,
                status: (conflict.notionValues.status as TaskStatus) || t.status,
                priority: (conflict.notionValues.priority as PriorityLevel) || t.priority,
                dueAt: conflict.notionValues.dueAt || t.dueAt,
                estimateMinutes: conflict.notionValues.estimateMinutes || t.estimateMinutes,
                notionLastSyncedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
    } else if (resolution === 'keep_lifeos') {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === conflict.lifeosId
            ? {
                ...t,
                notionLastSyncedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
    } else if (resolution === 'stage_ai_draft') {
      const stagedDraft: AIPlan = {
        id: `plan_ntn_conf_${Date.now().toString(36)}`,
        title: `A1 Draft: Reconcile Notion Conflict ("${conflict.title}")`,
        planType: 'notion_import_review',
        targetDate: TODAY_DATE,
        generatedAt: new Date().toISOString(),
        status: 'pending_approval',
        summary: `Staged Notion remote changes for "${conflict.title}" in A1 Draft mode so you can review priority (${conflict.notionValues.priority}) and duration (${conflict.notionValues.estimateMinutes}m) before committing.`,
        assumptions: [
          `Linked Notion Page ID: ${conflict.notionPageId}`,
          'Preserves your existing locked college schedule blocks.',
        ],
        overloadWarnings: [],
        proposedBlocks: [],
        proposedTaskUpdates: [
          {
            taskId: conflict.lifeosId,
            taskTitle: conflict.notionValues.title,
            currentPriority: (conflict.lifeosValues.priority as PriorityLevel) || 'high',
            proposedPriority: (conflict.notionValues.priority as PriorityLevel) || 'critical',
            currentStatus: (conflict.lifeosValues.status as TaskStatus) || 'postponed',
            proposedStatus: 'planned',
            currentScheduledDate: conflict.lifeosValues.dueAt,
            proposedScheduledDate: conflict.notionValues.dueAt || TODAY_DATE,
            rationale: 'Reconciles remote Notion edit via A1 Draft approval.',
            selected: true,
          },
        ],
      };
      setAiPlans((prev) => [stagedDraft, ...prev]);
      setActiveTab('today');
    }

    setNotionState((prev) => ({
      ...prev,
      conflicts: prev.conflicts.map((c) =>
        c.id === conflict.id ? { ...c, resolved: true, resolution } : c
      ),
    }));
  };

  // Brainstorming Idea-to-Roadmap Decomposer
  const handleConvertIdeaToRoadmapDraft = async (promptText: string, categoryId: string) => {
    setIsGeneratingPlan(true);
    try {
      const res = await fetch('/api/ai/brainstorm-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText, categoryId, targetDate: TODAY_DATE }),
      });
      const data = await res.json();
      if (data.plan) {
        setAiPlans((prev) => [data.plan, ...prev]);
        setActiveTab('today');
      }
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Refresh Morning AI Briefing
  const handleRefreshBriefing = async () => {
    setIsLoadingBriefing(true);
    try {
      const res = await fetch('/api/ai/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          blocks: scheduleBlocks.filter((b) => b.date === TODAY_DATE),
          notionState,
          constraints: profile.constraints,
        }),
      });
      const data = await res.json();
      if (data.briefing) {
        setDailyBriefing(data.briefing);
      }
    } finally {
      setIsLoadingBriefing(false);
    }
  };

  // Import Phase 5–10 Million-User Engineering Roadmap into LifeOS Tasks
  const handleImportMillionUserRoadmap = () => {
    if (roadmapImported) {
      setActiveTab('tasks');
      return;
    }
    const bundle = createRoadmapImportBundle();
    setGoals((prev) => [bundle.goal, ...prev.filter((g) => g.id !== bundle.goal.id)]);
    setProjects((prev) => [bundle.project, ...prev.filter((p) => p.id !== bundle.project.id)]);
    setTasks((prev) => [
      ...bundle.tasks.filter((nt) => !prev.some((et) => et.id === nt.id)),
      ...prev,
    ]);
    setRoadmapImported(true);
    setActiveTab('tasks');
  };

  // Computed Metrics for Today View
  const activePendingPlan = aiPlans.find((p) => p.status === 'pending_approval') || null;
  const todayBlocks = scheduleBlocks
    .filter((b) => b.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const scheduleConflicts = detectScheduleConflicts(todayBlocks);

  const todayFocusedMinutes = todayBlocks
    .filter((b) => b.source !== 'fixed_timetable')
    .reduce((acc, b) => acc + getBlockDurationMinutes(b), 0);
  const todayFixedMinutes = todayBlocks
    .filter((b) => b.source === 'fixed_timetable')
    .reduce((acc, b) => acc + getBlockDurationMinutes(b), 0);

  const overdueTasks = tasks.filter(
    (t) =>
      t.status !== 'completed' &&
      t.status !== 'cancelled' &&
      t.status !== 'skipped' &&
      (t.dueAt < TODAY_DATE || t.status === 'postponed')
  );

  const topPriorityTasks = tasks
    .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
    .sort((a, b) => {
      const rank: Record<PriorityLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      return rank[b.priority] - rank[a.priority];
    })
    .slice(0, 3);

  const activeReminders = reminders.filter((r) => r.state === 'triggered' || r.state === 'scheduled');
  const activeTimerTask = tasks.find((t) => t.id === activeTimerTaskId);
  const unresolvedNotionConflicts = notionState.conflicts.filter((c) => !c.resolved).length;

  const formatStopwatch = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const getCategoryName = (catId: string) =>
    categories.find((c) => c.id === catId)?.name || 'General';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100">
      {/* =====================================================================
          STRICT 3-ZONE TOP BAR CONTRACT (frontend-design §2)
          Zone 1: Single text element wordmark
          Zone 2: 4–5 single-line text nav links
          Zone 3: 1 primary action button
         ===================================================================== */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        {/* Zone 1: Brand Wordmark (single text element) */}
        <a
          href="#today"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('today');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          LifeOS
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button
            onClick={() => setActiveTab('today')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'today' ? 'text-slate-900 dark:text-white underline underline-offset-8' : ''
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'calendar' ? 'text-slate-900 dark:text-white underline underline-offset-8' : ''
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'tasks' ? 'text-slate-900 dark:text-white underline underline-offset-8' : ''
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'connections'
                ? 'text-slate-900 dark:text-white underline underline-offset-8'
                : ''
            }`}
          >
            Notion Sync
          </button>
          <button
            onClick={() => setActiveTab('flutter_blueprint')}
            className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'flutter_blueprint'
                ? 'text-slate-900 dark:text-white underline underline-offset-8'
                : ''
            }`}
          >
            10M Scale & PRD
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setQuickCaptureOpen((prev) => !prev)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Quick Capture Task
          </button>
        </div>
      </header>

      {/* Main Workspace Shell: Left Navigation Rail (260px) + Active Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Sidebar Navigation Rail */}
        <aside className="w-full lg:w-64 shrink-0 bg-white dark:bg-[#111827] border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-6">
          <div className="space-y-6">
            {/* Live Focus Stopwatch Strip inside Sidebar */}
            {activeTimerTask && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Active Focus Timer</span>
                  <span className="font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatStopwatch(timerSeconds)}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {activeTimerTask.title}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  <span>
                    Logged: {activeTimerTask.actualMinutes}m / {activeTimerTask.estimateMinutes}m
                  </span>
                  <button
                    onClick={() => handleToggleTimerForTask(activeTimerTask)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-600 text-white rounded cursor-pointer"
                  >
                    {timerRunning ? (
                      <>
                        <Pause className="w-3 h-3" /> Log & Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" /> Start
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Full Navigation List */}
            <div className="space-y-1">
              <div className="px-3 pb-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Execution & Planning
              </div>
              {[
                { id: 'today', label: 'Home / Today', icon: LayoutDashboard },
                { id: 'calendar', label: 'Calendar & Schedule', icon: Calendar },
                { id: 'tasks', label: 'Tasks & Inbox', icon: CheckSquare },
                { id: 'goals', label: 'Goals & Projects', icon: Target },
                { id: 'ai_assistant', label: 'AI Planner (A1 Drafts)', icon: Sparkles },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as NavigationTab)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.id === 'ai_assistant' && activePendingPlan && (
                      <span className="font-mono text-[11px] text-violet-400">1 Draft</span>
                    )}
                  </button>
                );
              })}

              <div className="px-3 pt-4 pb-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Creation, Sync & Scale
              </div>
              {[
                { id: 'brainstorm', label: 'Brainstorm / Notes', icon: Lightbulb },
                { id: 'content_studio', label: 'Content Studio', icon: Video },
                { id: 'insights', label: 'Insights & Review', icon: BarChart3 },
                { id: 'connections', label: 'Connections (Notion)', icon: Link2 },
                { id: 'flutter_blueprint', label: 'Scale, PRD & Roadmap', icon: FileCode2 },
                { id: 'settings', label: 'Settings & Privacy', icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as NavigationTab)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {item.id === 'connections' && unresolvedNotionConflicts > 0 && (
                      <span className="font-mono text-[11px] text-amber-500">
                        {unresolvedNotionConflicts}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workspace Footer Controls (Theme Toggle + Autonomy Level Summary) */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>Autonomy Mode: {profile.constraints.autonomyLevel} (Draft)</span>
              <button
                onClick={() => setDarkMode((d) => !d)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:opacity-90 cursor-pointer"
              >
                {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{darkMode ? 'Light' : 'Dark'}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Viewport Content Canvas */}
        <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-6">
          {/* Quick Capture Inline Drawer (When Toggled) */}
          {quickCaptureOpen && (
            <form
              onSubmit={handleQuickCaptureSubmit}
              className="p-5 bg-white dark:bg-[#111827] border border-indigo-500/60 rounded-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Quick Capture Task or Deadline
                </span>
                <button
                  type="button"
                  onClick={() => setQuickCaptureOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5">
                  <input
                    type="text"
                    required
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder="Task title (e.g., Debug C segfault in custom realloc)..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <select
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <select
                    value={quickPriority}
                    onChange={(e) => setQuickPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="critical">Critical Priority</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <input
                    type="number"
                    min={10}
                    max={240}
                    value={quickEstimate}
                    onChange={(e) => setQuickEstimate(Number(e.target.value))}
                    className="w-full px-2.5 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    title="Estimated minutes"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
                  >
                    Save Task
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* =================================================================
              VIEW 1: HOME / TODAY EXECUTIVE DASHBOARD
             ================================================================= */}
          {activeTab === 'today' && (
            <div className="space-y-8">
              {/* Top Executive Header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    Monday, 9 November 2026 · {profile.timezone} · Strict A1 Draft Governance
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1 text-balance">
                    Executive Command Center — {profile.displayName}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleGenerateScheduleDraft('daily_schedule')}
                    disabled={isGeneratingPlan}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGeneratingPlan ? 'Generating Draft...' : 'Propose AI Daily Schedule (A1)'}
                  </button>

                  <button
                    onClick={() => handleTriggerNotionSync('manual', false)}
                    disabled={isSyncingNotion}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNotion ? 'animate-spin' : ''}`} />
                    Sync Notion ({notionState.databases.filter((d) => d.enabled).length} DBs)
                  </button>

                  <button
                    onClick={() => setActiveTab('flutter_blueprint')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    10M+ Scale & PRD Pack
                  </button>
                </div>
              </div>

              {/* A1 Proposal Approval Drawer (If Pending Draft or Undo Snapshot Exists) */}
              <AIProposalDrawer
                activePlan={activePendingPlan}
                categories={categories}
                canUndoLastPlan={Boolean(lastUndoSnapshot)}
                onApprovePlan={handleApprovePlan}
                onRejectPlan={handleRejectPlan}
                onUndoLastPlan={handleUndoLastPlan}
                onUpdateProposedBlockTime={(blockId, startTime, endTime) => {
                  if (!activePendingPlan) return;
                  setAiPlans((prev) =>
                    prev.map((p) =>
                      p.id === activePendingPlan.id
                        ? {
                            ...p,
                            proposedBlocks: p.proposedBlocks.map((b) =>
                              b.id === blockId ? { ...b, startTime, endTime } : b
                            ),
                          }
                        : p
                    )
                  );
                }}
                onToggleTaskUpdateSelection={(taskId) => {
                  if (!activePendingPlan) return;
                  setAiPlans((prev) =>
                    prev.map((p) =>
                      p.id === activePendingPlan.id
                        ? {
                            ...p,
                            proposedTaskUpdates: p.proposedTaskUpdates.map((u) =>
                              u.taskId === taskId ? { ...u, selected: !u.selected } : u
                            ),
                          }
                        : p
                    )
                  );
                }}
                onToggleNewItemSelection={(tempId) => {
                  if (!activePendingPlan) return;
                  setAiPlans((prev) =>
                    prev.map((p) =>
                      p.id === activePendingPlan.id
                        ? {
                            ...p,
                            proposedNewItems: (p.proposedNewItems || []).map((i) =>
                              i.tempId === tempId ? { ...i, selected: !i.selected } : i
                            ),
                          }
                        : p
                    )
                  );
                }}
              />

              {/* Morning AI Daily Briefing + Daily Capacity Meter */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-7 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        01. AI Morning Briefing & Risk Radar
                      </span>
                      <button
                        onClick={handleRefreshBriefing}
                        disabled={isLoadingBriefing}
                        className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      >
                        {isLoadingBriefing ? 'Refreshing...' : 'Refresh Briefing'}
                      </button>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {dailyBriefing.headline}
                    </h2>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
                      {dailyBriefing.topPriorities.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="text-amber-700 dark:text-amber-400">
                      <span className="font-semibold">Carryover Alert:</span> {dailyBriefing.riskAlert}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>{dailyBriefing.notionSummary}</span>
                      <button
                        onClick={() => setActiveTab('connections')}
                        className="text-indigo-600 dark:text-indigo-400 underline whitespace-nowrap ml-2 cursor-pointer"
                      >
                        Open Notion Sync
                      </button>
                    </div>
                  </div>
                </div>

                {/* Workload Realism & Capacity Meter */}
                <div className="lg:col-span-5 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      02. Daily Workload Realism & Fixed Commitment Lock
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {todayFocusedMinutes}m / {profile.constraints.maxDailyWorkMinutes}m
                      </div>
                      <div className="text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {Math.round(
                          (todayFocusedMinutes /
                            Math.max(1, profile.constraints.maxDailyWorkMinutes)) *
                            100
                        )}
                        % Focused Cap Used
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          todayFocusedMinutes > profile.constraints.maxDailyWorkMinutes
                            ? 'bg-rose-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (todayFocusedMinutes /
                                Math.max(1, profile.constraints.maxDailyWorkMinutes)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      Immovable Fixed Classes: {todayFixedMinutes}m (Protected) · Break Buffer:{' '}
                      {profile.constraints.breakBufferMinutes}m
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/70">
                      <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {topPriorityTasks.length}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Top Focus</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/70">
                      <div className="text-sm font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                        {overdueTasks.length}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Overdue</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/70">
                      <div className="text-sm font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                        {tasks.filter((t) => t.notionPageId).length}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Notion Linked
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Reminders Bar (Snooze / Complete / Escalation Notice) */}
              {activeReminders.length > 0 && (
                <div className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-indigo-500" />
                      <span>
                        03. Active Reminders & Escalation Guard (Quiet Hours:{' '}
                        <span className="font-mono tabular-nums">
                          {profile.constraints.quietHoursStart}–{profile.constraints.quietHoursEnd}
                        </span>
                        )
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {activeReminders.map((rem) => (
                      <div
                        key={rem.id}
                        className="py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {rem.taskTitle}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {getCategoryName(rem.categoryId)} · Scheduled {rem.triggerAt} · Snoozed{' '}
                            {rem.snoozeCount}x
                            {rem.escalationFlag &&
                              ' · Escalation: Repeatedly postponed (Review recommended instead of spam)'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              handleUpdateTaskStatus(rem.taskId, 'completed', 'Completed from reminder');
                              setReminders((prev) =>
                                prev.map((r) => (r.id === rem.id ? { ...r, state: 'completed' } : r))
                              );
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-500 cursor-pointer"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() =>
                              setReminders((prev) =>
                                prev.map((r) =>
                                  r.id === rem.id
                                    ? { ...r, snoozeCount: r.snoozeCount + 1, state: 'snoozed' }
                                    : r
                                )
                              )
                            }
                            className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 cursor-pointer"
                          >
                            Snooze +15m
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Two-Column Split: Today's Priority & Overdue Tasks vs Today's Time-Blocked Schedule */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Top Priorities & Overdue Carryovers */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        04. Today’s Priority Execution Queue
                      </div>
                      <button
                        onClick={() => setActiveTab('tasks')}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        View All {tasks.length} Tasks
                      </button>
                    </div>

                    <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
                      {tasks
                        .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
                        .slice(0, 5)
                        .map((task) => {
                          const isTiming = activeTimerTaskId === task.id && timerRunning;
                          return (
                            <div key={task.id} className="py-3.5 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="space-y-0.5">
                                  {/* Unboxed Zero-Pill Metadata Line */}
                                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                                    {getCategoryName(task.categoryId)} · {task.priority.toUpperCase()} · Due{' '}
                                    {task.dueAt} · {task.actualMinutes}m/{task.estimateMinutes}m
                                    {task.postponeCount > 0 && ` · Postponed ${task.postponeCount}x`}
                                    {task.notionPageId && ` · Notion Synced`}
                                  </div>
                                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {task.title}
                                  </div>
                                </div>

                                {/* Interactive Action Buttons */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => handleToggleTimerForTask(task)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                                      isTiming
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                                    }`}
                                  >
                                    {isTiming ? (
                                      <>
                                        <Pause className="w-3 h-3" /> Stop Timer
                                      </>
                                    ) : (
                                      <>
                                        <Play className="w-3 h-3" /> Focus
                                      </>
                                    )}
                                  </button>

                                  <button
                                    onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                    className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors whitespace-nowrap cursor-pointer"
                                  >
                                    Complete
                                  </button>

                                  <button
                                    onClick={() =>
                                      setPostponingTaskId(
                                        postponingTaskId === task.id ? null : task.id
                                      )
                                    }
                                    className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors whitespace-nowrap cursor-pointer"
                                  >
                                    Postpone
                                  </button>
                                </div>
                              </div>

                              {/* Subtasks Inline */}
                              {task.subtasks.length > 0 && (
                                <div className="pl-2 space-y-1">
                                  {task.subtasks.map((sub) => (
                                    <label
                                      key={sub.id}
                                      className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={sub.completed}
                                        onChange={() => handleToggleSubtask(task.id, sub.id)}
                                        className="w-3.5 h-3.5 accent-indigo-600 rounded"
                                      />
                                      <span className={sub.completed ? 'line-through text-slate-400' : ''}>
                                        {sub.title}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}

                              {/* Inline Postponement Reason Capture */}
                              {postponingTaskId === task.id && (
                                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-2">
                                  <input
                                    type="text"
                                    value={postponeReasonInput}
                                    onChange={(e) => setPostponeReasonInput(e.target.value)}
                                    placeholder="Reason for postponing (used by AI rescheduler)..."
                                    className="flex-1 w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                                  />
                                  <button
                                    onClick={() =>
                                      handleUpdateTaskStatus(
                                        task.id,
                                        'postponed',
                                        postponeReasonInput
                                      )
                                    }
                                    className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded whitespace-nowrap cursor-pointer"
                                  >
                                    Confirm Postpone
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Today's Time-Blocked Schedule */}
                <div className="lg:col-span-5 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        05. Today’s Schedule Timeline ({selectedDate})
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                        Fixed Commitments & Focus Blocks
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Edit Schedule
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {todayBlocks.map((blk) => {
                      const isFixed = blk.source === 'fixed_timetable' || blk.locked;
                      return (
                        <div
                          key={blk.id}
                          className={`p-3.5 rounded-lg border ${
                            isFixed
                              ? 'bg-slate-100/80 dark:bg-slate-900/90 border-slate-300 dark:border-slate-700'
                              : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            <span>
                              {blk.startTime} – {blk.endTime} ({getBlockDurationMinutes(blk)}m)
                            </span>
                            <span>
                              {blk.source === 'fixed_timetable'
                                ? 'FIXED TIMETABLE (LOCKED)'
                                : blk.locked
                                ? 'USER LOCKED'
                                : getCategoryName(blk.categoryId)}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                            {blk.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 2: CALENDAR & DETERMINISTIC SCHEDULE ENGINE
             ================================================================= */}
          {activeTab === 'calendar' && (
            <div className="space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Deterministic Constraint Scheduler · Fixed vs Flexible Time Blocks
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
                    Daily & Multi-Day Schedule Engine
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                  <button
                    onClick={() => handleGenerateScheduleDraft('daily_schedule')}
                    disabled={isGeneratingPlan}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Propose AI Schedule Draft
                  </button>
                  <button
                    onClick={() => handleGenerateScheduleDraft('overdue_reschedule')}
                    disabled={isGeneratingPlan}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer"
                  >
                    Reschedule Overdue Carryovers
                  </button>
                </div>
              </div>

              <AIProposalDrawer
                activePlan={activePendingPlan}
                categories={categories}
                canUndoLastPlan={Boolean(lastUndoSnapshot)}
                onApprovePlan={handleApprovePlan}
                onRejectPlan={handleRejectPlan}
                onUndoLastPlan={handleUndoLastPlan}
                onUpdateProposedBlockTime={(blockId, startTime, endTime) => {
                  if (!activePendingPlan) return;
                  setAiPlans((prev) =>
                    prev.map((p) =>
                      p.id === activePendingPlan.id
                        ? {
                            ...p,
                            proposedBlocks: p.proposedBlocks.map((b) =>
                              b.id === blockId ? { ...b, startTime, endTime } : b
                            ),
                          }
                        : p
                    )
                  );
                }}
                onToggleTaskUpdateSelection={() => {}}
                onToggleNewItemSelection={() => {}}
              />

              {scheduleConflicts.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200">
                  Detected {scheduleConflicts.length} overlapping time block(s) on {selectedDate}. Use
                  "Propose AI Schedule Draft" to resolve conflicts automatically around locked slots.
                </div>
              )}

              {/* Add Schedule Block Form */}
              <div className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="text-xs text-slate-500 block mb-1">Block Title</label>
                  <input
                    type="text"
                    value={newBlockTitle}
                    onChange={(e) => setNewBlockTitle(e.target.value)}
                    placeholder="e.g., Extra Operating Systems Tutorial / Deep Work"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newBlockStart}
                    onChange={(e) => setNewBlockStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">End Time</label>
                  <input
                    type="time"
                    value={newBlockEnd}
                    onChange={(e) => setNewBlockEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                </div>
                <div className="md:col-span-1 flex items-center gap-1.5 pb-2">
                  <input
                    type="checkbox"
                    checked={newBlockFixed}
                    onChange={(e) => setNewBlockFixed(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-300">Lock</span>
                </div>
                <div className="md:col-span-2">
                  <button
                    onClick={() => {
                      if (!newBlockTitle.trim()) return;
                      setScheduleBlocks((prev) => [
                        ...prev,
                        {
                          id: `blk_${Date.now().toString(36)}`,
                          title: newBlockTitle.trim(),
                          categoryId: 'cat_college',
                          date: selectedDate,
                          startTime: newBlockStart,
                          endTime: newBlockEnd,
                          source: newBlockFixed ? 'fixed_timetable' : 'user',
                          locked: newBlockFixed,
                          accepted: true,
                        },
                      ]);
                      setNewBlockTitle('');
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer"
                  >
                    Add Time Block
                  </button>
                </div>
              </div>

              {/* Full Timeline Table */}
              <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {todayBlocks.map((blk) => (
                    <div
                      key={blk.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {blk.startTime} – {blk.endTime} ({getBlockDurationMinutes(blk)}m) ·{' '}
                          {getCategoryName(blk.categoryId)} · Source: {blk.source}
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                          {blk.title}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() =>
                            setScheduleBlocks((prev) =>
                              prev.map((b) =>
                                b.id === blk.id ? { ...b, locked: !b.locked } : b
                              )
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded cursor-pointer"
                        >
                          {blk.locked ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-amber-500" /> Locked (Immovable)
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" /> Flexible
                            </>
                          )}
                        </button>

                        {blk.source !== 'fixed_timetable' && (
                          <button
                            onClick={() =>
                              setScheduleBlocks((prev) => prev.filter((b) => b.id !== blk.id))
                            }
                            className="px-2.5 py-1 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 3: TASKS & INBOX (8-STATE LIFECYCLE + NOTION LINKED)
             ================================================================= */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    8-State Task Lifecycle · Subtasks · Live Stopwatch · Notion Page ID Deduplication
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
                    Master Tasks & Inbox ({tasks.length} Total)
                  </h1>
                </div>

                {/* Interactive Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    <option value="all">All Life Domains</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    <option value="all">All 8 Statuses</option>
                    <option value="inbox">Inbox</option>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="partial">Partial</option>
                    <option value="postponed">Postponed</option>
                    <option value="skipped">Skipped</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
                {tasks
                  .filter(
                    (t) =>
                      (selectedCategoryFilter === 'all' || t.categoryId === selectedCategoryFilter) &&
                      (selectedStatusFilter === 'all' || t.status === selectedStatusFilter)
                  )
                  .map((task) => (
                    <div key={task.id} className="py-4 space-y-2">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {getCategoryName(task.categoryId)} · Priority: {task.priority.toUpperCase()} ·
                            Due: {task.dueAt} · Time: {task.actualMinutes}m / {task.estimateMinutes}m
                            {task.postponeCount > 0 && ` · Postponed ${task.postponeCount}x`}
                            {task.notionPageId && ` · Notion ID: ${task.notionPageId}`}
                          </div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {task.title}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {task.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <select
                            value={task.status}
                            onChange={(e) =>
                              handleUpdateTaskStatus(task.id, e.target.value as TaskStatus)
                            }
                            className="px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md"
                          >
                            <option value="inbox">inbox</option>
                            <option value="planned">planned</option>
                            <option value="in_progress">in_progress</option>
                            <option value="completed">completed</option>
                            <option value="partial">partial</option>
                            <option value="postponed">postponed</option>
                            <option value="skipped">skipped</option>
                            <option value="cancelled">cancelled</option>
                          </select>

                          <button
                            onClick={() => handleToggleTimerForTask(task)}
                            className="px-2.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md cursor-pointer"
                          >
                            {activeTimerTaskId === task.id && timerRunning ? 'Stop Timer' : 'Start Timer'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 4: GOALS & PROJECTS HIERARCHY
             ================================================================= */}
          {activeTab === 'goals' && (
            <div className="space-y-8">
              <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Core Hierarchy · Category → Goal → Project → Task
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
                  Life Domains, Long-Term Goals & Active Projects
                </h1>
              </div>

              {/* Add Goal Form */}
              <div className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="text-xs text-slate-500 block mb-1">New Goal Title</label>
                  <input
                    type="text"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="e.g., Complete Linux Kernel Networking Module Project"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-slate-500 block mb-1">Life Category</label>
                  <select
                    value={newGoalCat}
                    onChange={(e) => setNewGoalCat(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-500 block mb-1">Target Date</label>
                  <input
                    type="date"
                    value={newGoalTargetDate}
                    onChange={(e) => setNewGoalTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    onClick={() => {
                      if (!newGoalTitle.trim()) return;
                      setGoals((prev) => [
                        {
                          id: `goal_${Date.now().toString(36)}`,
                          categoryId: newGoalCat,
                          title: newGoalTitle.trim(),
                          description: 'User-defined milestone goal.',
                          targetDate: newGoalTargetDate,
                          status: 'active',
                          priority: 'high',
                          progressPercent: 10,
                          updatedAt: new Date().toISOString(),
                        },
                        ...prev,
                      ]);
                      setNewGoalTitle('');
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer"
                  >
                    Create Goal
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {goals.map((goal) => {
                  const goalProjects = projects.filter((p) => p.goalId === goal.id);
                  return (
                    <div
                      key={goal.id}
                      className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4"
                    >
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        <span>
                          {getCategoryName(goal.categoryId)} · Priority: {goal.priority.toUpperCase()}
                        </span>
                        <span>Target: {goal.targetDate}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {goal.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {goal.description}
                      </p>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-mono tabular-nums text-slate-500">
                          <span>Progress</span>
                          <span>{goal.progressPercent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600"
                            style={{ width: `${goal.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {goalProjects.length > 0 && (
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Linked Projects ({goalProjects.length})
                          </div>
                          {goalProjects.map((proj) => (
                            <div
                              key={proj.id}
                              className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/70 text-xs flex items-center justify-between"
                            >
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {proj.title}
                              </span>
                              <span className="font-mono tabular-nums text-slate-500">
                                Due {proj.dueDate}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 5: AI ASSISTANT & A1 DRAFT APPROVAL CENTER
             ================================================================= */}
          {activeTab === 'ai_assistant' && (
            <div className="space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Explainable AI Assistant · Autonomy Policy: {profile.constraints.autonomyLevel}{' '}
                    Draft Mode
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
                    AI Schedule Proposals & Action Audit Trail
                  </h1>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => handleGenerateScheduleDraft('daily_schedule')}
                    disabled={isGeneratingPlan}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer"
                  >
                    Generate Fresh Daily Draft
                  </button>
                  <button
                    onClick={() => handleGenerateScheduleDraft('overdue_reschedule')}
                    disabled={isGeneratingPlan}
                    className="px-4 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer"
                  >
                    Generate Overdue Recovery Draft
                  </button>
                </div>
              </div>

              <AIProposalDrawer
                activePlan={activePendingPlan}
                categories={categories}
                canUndoLastPlan={Boolean(lastUndoSnapshot)}
                onApprovePlan={handleApprovePlan}
                onRejectPlan={handleRejectPlan}
                onUndoLastPlan={handleUndoLastPlan}
                onUpdateProposedBlockTime={(blockId, startTime, endTime) => {
                  if (!activePendingPlan) return;
                  setAiPlans((prev) =>
                    prev.map((p) =>
                      p.id === activePendingPlan.id
                        ? {
                            ...p,
                            proposedBlocks: p.proposedBlocks.map((b) =>
                              b.id === blockId ? { ...b, startTime, endTime } : b
                            ),
                          }
                        : p
                    )
                  );
                }}
                onToggleTaskUpdateSelection={(taskId) => {
                  if (!activePendingPlan) return;
                  setAiPlans((prev) =>
                    prev.map((p) =>
                      p.id === activePendingPlan.id
                        ? {
                            ...p,
                            proposedTaskUpdates: p.proposedTaskUpdates.map((u) =>
                              u.taskId === taskId ? { ...u, selected: !u.selected } : u
                            ),
                          }
                        : p
                    )
                  );
                }}
                onToggleNewItemSelection={(tempId) => {
                  if (!activePendingPlan) return;
                  setAiPlans((prev) =>
                    prev.map((p) =>
                      p.id === activePendingPlan.id
                        ? {
                            ...p,
                            proposedNewItems: (p.proposedNewItems || []).map((i) =>
                              i.tempId === tempId ? { ...i, selected: !i.selected } : i
                            ),
                          }
                        : p
                    )
                  );
                }}
              />

              {/* AI Action Audit Log */}
              <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Immutable AI Action Audit Log (A0–A3 Governance)
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {aiActionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          [{log.autonomyLevel}] {log.action}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 font-mono">
                          Tool: {log.tool} · Inputs: {log.inputsSummary}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                          Result: {log.resultSummary}
                        </div>
                      </div>
                      <span className="font-mono uppercase text-slate-500">
                        {log.approvalState}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 6 & 7: BRAINSTORMING & CONTENT STUDIO
             ================================================================= */}
          {(activeTab === 'brainstorm' || activeTab === 'content_studio') && (
            <BrainstormAndContentView
              mode={activeTab}
              notes={ideaNotes}
              contentItems={contentItems}
              categories={categories}
              onAddNote={(title, content, categoryId, tags) => {
                setIdeaNotes((prev) => [
                  {
                    id: `idea_${Date.now().toString(36)}`,
                    title,
                    content,
                    categoryId,
                    tags,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  ...prev,
                ]);
              }}
              onConvertIdeaToRoadmapDraft={handleConvertIdeaToRoadmapDraft}
              onConvertNoteToSingleTask={(note) => {
                setTasks((prev) => [
                  {
                    id: `tsk_from_note_${Date.now().toString(36)}`,
                    categoryId: note.categoryId,
                    title: note.title,
                    description: note.content,
                    status: 'planned',
                    priority: 'high',
                    dueAt: TODAY_DATE,
                    scheduledDate: TODAY_DATE,
                    estimateMinutes: 45,
                    actualMinutes: 0,
                    recurrence: 'none',
                    isFixedCommitment: false,
                    locked: false,
                    postponeCount: 0,
                    prerequisiteTaskIds: [],
                    subtasks: [],
                    updatedAt: new Date().toISOString(),
                  },
                  ...prev,
                ]);
                setActiveTab('tasks');
              }}
              onUpdateContentStage={(itemId, nextStage) => {
                setContentItems((prev) =>
                  prev.map((c) => (c.id === itemId ? { ...c, stage: nextStage } : c))
                );
              }}
              onToggleContentChecklist={(itemId, chkId) => {
                setContentItems((prev) =>
                  prev.map((c) =>
                    c.id === itemId
                      ? {
                          ...c,
                          checklist: c.checklist.map((chk) =>
                            chk.id === chkId ? { ...chk, done: !chk.done } : chk
                          ),
                        }
                      : c
                  )
                );
              }}
              onAddContentItem={(item) => {
                setContentItems((prev) => [
                  {
                    ...item,
                    id: `cnt_${Date.now().toString(36)}`,
                    checklist: [
                      { id: `chk_a_${Date.now()}`, label: 'Draft script & visual hook', done: false },
                      { id: `chk_b_${Date.now()}`, label: 'Record & edit timeline', done: false },
                    ],
                  },
                  ...prev,
                ]);
              }}
              onScheduleContentRecordingTask={(item) => {
                setTasks((prev) => [
                  {
                    id: `tsk_cnt_${Date.now().toString(36)}`,
                    categoryId: 'cat_content',
                    title: `[${item.platform}] ${item.stage.toUpperCase()}: ${item.title}`,
                    description: item.hookOrAngle,
                    status: 'planned',
                    priority: 'high',
                    dueAt: item.targetPublishDate,
                    scheduledDate: TODAY_DATE,
                    estimateMinutes: item.estimateMinutes,
                    actualMinutes: 0,
                    recurrence: 'none',
                    isFixedCommitment: false,
                    locked: false,
                    postponeCount: 0,
                    prerequisiteTaskIds: [],
                    subtasks: [],
                    updatedAt: new Date().toISOString(),
                  },
                  ...prev,
                ]);
                setActiveTab('tasks');
              }}
              isGeneratingRoadmap={isGeneratingPlan}
            />
          )}

          {/* =================================================================
              VIEW 8: INSIGHTS & EXECUTION REVIEW
             ================================================================= */}
          {activeTab === 'insights' && (
            <InsightsAndReviewView
              tasks={tasks}
              categories={categories}
              taskEvents={taskEvents}
              aiActionLogs={aiActionLogs}
              onGenerateRecoveryPlan={() => {
                handleGenerateScheduleDraft('overdue_reschedule');
                setActiveTab('today');
              }}
            />
          )}

          {/* =================================================================
              VIEW 9: SETTINGS → CONNECTIONS (OFFICIAL NOTION INTEGRATION)
             ================================================================= */}
          {activeTab === 'connections' && (
            <NotionConnectionsView
              notionState={notionState}
              categories={categories}
              onUpdateNotionState={setNotionState}
              onTriggerSync={handleTriggerNotionSync}
              onResolveConflict={handleResolveNotionConflict}
              isSyncing={isSyncingNotion}
            />
          )}

          {/* =================================================================
              VIEW 10: SCALE, PRD, MODULAR ARCHITECTURE & 10M+ USER ROADMAP
             ================================================================= */}
          {activeTab === 'flutter_blueprint' && (
            <ScaleAndDocsHub
              onImportRoadmapToLifeOS={handleImportMillionUserRoadmap}
              roadmapImported={roadmapImported}
            />
          )}

          {/* =================================================================
              VIEW 11: SETTINGS, CONSTRAINTS & PRIVACY
             ================================================================= */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Planning Constraints · Autonomy Boundaries · JSON Data Export & Kill Switch
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
                  Settings, Daily Constraints & Privacy Controls
                </h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    01. Deterministic Daily Planning Constraints
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-500 mb-1">Wake Time</label>
                      <input
                        type="time"
                        value={profile.constraints.wakeTime}
                        onChange={(e) =>
                          setProfile((p) => ({
                            ...p,
                            constraints: { ...p.constraints, wakeTime: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Sleep Time</label>
                      <input
                        type="time"
                        value={profile.constraints.sleepTime}
                        onChange={(e) =>
                          setProfile((p) => ({
                            ...p,
                            constraints: { ...p.constraints, sleepTime: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">
                        Max Daily Focused Work (Minutes)
                      </label>
                      <input
                        type="number"
                        value={profile.constraints.maxDailyWorkMinutes}
                        onChange={(e) =>
                          setProfile((p) => ({
                            ...p,
                            constraints: {
                              ...p.constraints,
                              maxDailyWorkMinutes: Number(e.target.value) || 360,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">
                        Break Buffer Between Blocks (Mins)
                      </label>
                      <input
                        type="number"
                        value={profile.constraints.breakBufferMinutes}
                        onChange={(e) =>
                          setProfile((p) => ({
                            ...p,
                            constraints: {
                              ...p.constraints,
                              breakBufferMinutes: Number(e.target.value) || 15,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    02. AI Autonomy Kill Switch & Data Portability
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        Emergency Automation & Background Sync Kill Switch
                      </div>
                      <div className="text-xs text-slate-500">
                        Immediately halts all AI schedule generation and background Notion polling
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setProfile((p) => ({
                          ...p,
                          constraints: {
                            ...p.constraints,
                            automationKillSwitch: !p.constraints.automationKillSwitch,
                          },
                        }))
                      }
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                        profile.constraints.automationKillSwitch
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {profile.constraints.automationKillSwitch
                        ? 'KILL SWITCH ACTIVE'
                        : 'Normal (A1 Safe)'}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        const blob = new Blob(
                          [
                            JSON.stringify(
                              {
                                profile,
                                categories,
                                goals,
                                projects,
                                tasks,
                                scheduleBlocks,
                                notionState,
                              },
                              null,
                              2
                            ),
                          ],
                          { type: 'application/json' }
                        );
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `lifeos-backup-${TODAY_DATE}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Full Workspace JSON
                    </button>

                    <button
                      onClick={() => {
                        localStorage.removeItem(STORAGE_KEY);
                        window.location.reload();
                      }}
                      className="px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-lg cursor-pointer"
                    >
                      Reset to Default Seed State
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
