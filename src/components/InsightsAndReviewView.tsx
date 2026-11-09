import React, { useState } from 'react';
import {
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  Task,
  Category,
  TaskEvent,
  AIActionLog,
} from '../types/lifeos';

interface InsightsAndReviewViewProps {
  tasks: Task[];
  categories: Category[];
  taskEvents: TaskEvent[];
  aiActionLogs: AIActionLog[];
  onGenerateRecoveryPlan: () => void;
}

export const InsightsAndReviewView: React.FC<InsightsAndReviewViewProps> = ({
  tasks,
  categories,
  taskEvents,
  aiActionLogs,
  onGenerateRecoveryPlan,
}) => {
  const [reviewNotes, setReviewNotes] = useState(
    'Completed morning C linked-list warmup ahead of estimate. Evening energy after DBMS practical lab is consistently low—move theoretical problem sets to midday.'
  );
  const [reviewSaved, setReviewSaved] = useState(false);

  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const overdueOrPostponed = tasks.filter(
    (t) => t.status === 'postponed' || (t.status !== 'completed' && t.dueAt < '2026-11-09')
  );
  const churnTasks = tasks.filter((t) => t.postponeCount >= 2);

  const totalEstimateMins = tasks.reduce((acc, t) => acc + t.estimateMinutes, 0);
  const totalActualMins = tasks.reduce((acc, t) => acc + t.actualMinutes, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Execution Analytics · Planned vs Actual · Reschedule Churn & Weekly Review
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Execution Insights & Postponement Root-Cause Review
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Track completion rate by life domain, compare planned estimates against tracked stopwatch
            minutes, and identify repeatedly postponed tasks before they stall your goals.
          </p>
        </div>

        <button
          onClick={onGenerateRecoveryPlan}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Propose A1 Recovery Schedule for Carryovers
        </button>
      </div>

      {/* Top KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400">Active Task Completion</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {completedTasks.length} / {tasks.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {Math.round((completedTasks.length / Math.max(1, tasks.length)) * 100)}% lifecycle completion
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Tracked Focus vs Planned Budget
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {totalActualMins}m / {totalEstimateMins}m
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logged via live task stopwatch
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400">Overdue & Postponed Burden</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {overdueOrPostponed.length} Tasks
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Protected from blind night-time packing
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-xs text-slate-500 dark:text-slate-400">AI Trust & Audit Actions</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {aiActionLogs.length} Logged
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            100% governed by Strict A1 Approval
          </div>
        </div>
      </div>

      {/* Domain Progress Breakdown & Chronic Postponement Detector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            01. Workload & Execution by Life Domain
          </div>
          <div className="space-y-3">
            {categories.map((cat) => {
              const catTasks = tasks.filter((t) => t.categoryId === cat.id);
              const catEst = catTasks.reduce((a, b) => a + b.estimateMinutes, 0);
              const catAct = catTasks.reduce((a, b) => a + b.actualMinutes, 0);
              const done = catTasks.filter((t) => t.status === 'completed').length;
              return (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {cat.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                      {done}/{catTasks.length} completed · Planned: {catEst}m · Logged: {catAct}m
                    </div>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {catTasks.length > 0 ? `${Math.round((done / catTasks.length) * 100)}%` : '0%'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reschedule Churn Detector */}
        <div className="lg:col-span-6 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
            02. Chronic Postponement & Reschedule Churn Detector (Postponed ≥ 2x)
          </div>
          <div className="space-y-3">
            {churnTasks.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t.title}
                  </span>
                  <span className="text-xs font-mono tabular-nums text-amber-700 dark:text-amber-300">
                    Postponed {t.postponeCount}x
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Last recorded reason: <span className="italic">"{t.lastPostponeReason || 'Schedule conflict'}"</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  AI Recommendation: Split into a 25m morning/midday starter block instead of
                  scheduling after 20:00.
                </div>
              </div>
            ))}
          </div>

          {/* Evening / Weekly Reflection */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Evening Reflection & Tomorrow Constraint Notes
            </div>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => {
                setReviewNotes(e.target.value);
                setReviewSaved(false);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {reviewSaved ? 'Saved to planning context for next AI daily briefing.' : 'Used to calibrate next day scheduling assumptions.'}
              </span>
              <button
                onClick={() => setReviewSaved(true)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg cursor-pointer"
              >
                {reviewSaved ? 'Reflection Saved' : 'Save Reflection'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Immutable Task History & AI Audit Log */}
      <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          03. Immutable Execution History & AI Action Log
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Timestamp</th>
                <th className="py-2 px-3 font-medium">Task / Action</th>
                <th className="py-2 px-3 font-medium">Transition</th>
                <th className="py-2 pl-3 font-medium">Context / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
              {taskEvents.slice(0, 10).map((evt) => (
                <tr key={evt.id}>
                  <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                    {evt.taskTitle}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                    {evt.oldValue ? `${evt.oldValue} → ${evt.newValue}` : evt.newValue}
                  </td>
                  <td className="py-2.5 pl-3 text-slate-500 dark:text-slate-400">
                    {evt.reason || 'User action'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
