import React from 'react';
import {
  Check,
  X,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Clock,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { AIPlan, Category, ScheduleBlock } from '../types/lifeos';

interface AIProposalDrawerProps {
  activePlan: AIPlan | null;
  categories: Category[];
  canUndoLastPlan: boolean;
  onApprovePlan: (plan: AIPlan) => void;
  onRejectPlan: (planId: string) => void;
  onUndoLastPlan: () => void;
  onUpdateProposedBlockTime: (blockId: string, startTime: string, endTime: string) => void;
  onToggleTaskUpdateSelection: (taskId: string) => void;
  onToggleNewItemSelection: (tempId: string) => void;
}

export const AIProposalDrawer: React.FC<AIProposalDrawerProps> = ({
  activePlan,
  categories,
  canUndoLastPlan,
  onApprovePlan,
  onRejectPlan,
  onUndoLastPlan,
  onUpdateProposedBlockTime,
  onToggleTaskUpdateSelection,
  onToggleNewItemSelection,
}) => {
  if (!activePlan || activePlan.status !== 'pending_approval') {
    return canUndoLastPlan ? (
      <div className="p-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            Last AI schedule/roadmap proposal was committed with user approval. Snapshot rollback is
            available.
          </span>
        </div>
        <button
          onClick={onUndoLastPlan}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Undo Last Committed AI Plan
        </button>
      </div>
    ) : null;
  }

  const getCategoryName = (catId: string) =>
    categories.find((c) => c.id === catId)?.name || 'General';

  return (
    <div className="p-6 bg-white dark:bg-[#111827] border border-dashed border-violet-500/70 dark:border-violet-400/60 rounded-xl space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-violet-600 dark:text-violet-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              STRICT A1 DRAFT PROPOSAL · NO CHANGES COMMITTED UNTIL YOU APPROVE
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            {activePlan.title}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
            {activePlan.summary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onApprovePlan(activePlan)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Approve & Commit Plan
          </button>

          <button
            onClick={() => onRejectPlan(activePlan.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Reject Draft
          </button>
        </div>
      </div>

      {/* Assumptions & Overload Warnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-500" />
            Explainable Scheduling Assumptions
          </div>
          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 list-disc list-inside">
            {activePlan.assumptions.map((a, idx) => (
              <li key={idx}>{a}</li>
            ))}
          </ul>
        </div>

        <div className="p-3.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-1.5">
          <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Workload Cap & Conflict Safeguards
          </div>
          {activePlan.overloadWarnings.length > 0 ? (
            <ul className="space-y-1 text-xs text-amber-800/90 dark:text-amber-200/90 list-disc list-inside">
              {activePlan.overloadWarnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              All proposed blocks fit within your daily focused-work limit with zero fixed-event
              conflicts.
            </p>
          )}
        </div>
      </div>

      {/* Proposed Time Blocks (Editable Before Committing) */}
      {activePlan.proposedBlocks.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Proposed Time-Blocked Schedule ({activePlan.targetDate}) — Editable Before Approval
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            {activePlan.proposedBlocks.map((blk) => (
              <div
                key={blk.id}
                className="p-3 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {getCategoryName(blk.categoryId)} · AI Proposed Focus Slot
                  </div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {blk.title}
                  </div>
                  {blk.notes && (
                    <div className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                      Rationale: {blk.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="time"
                    value={blk.startTime}
                    onChange={(e) =>
                      onUpdateProposedBlockTime(blk.id, e.target.value, blk.endTime)
                    }
                    className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                  <span className="text-slate-400">–</span>
                  <input
                    type="time"
                    value={blk.endTime}
                    onChange={(e) =>
                      onUpdateProposedBlockTime(blk.id, blk.startTime, e.target.value)
                    }
                    className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 tabular-nums"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proposed Task Priority / Date Updates */}
      {activePlan.proposedTaskUpdates.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Proposed Task Priority & Reschedule Adjustments
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            {activePlan.proposedTaskUpdates.map((upd) => (
              <label
                key={upd.taskId}
                className="p-3 bg-white dark:bg-slate-900/60 flex items-start gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={upd.selected}
                  onChange={() => onToggleTaskUpdateSelection(upd.taskId)}
                  className="mt-1 w-4 h-4 accent-indigo-600 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {upd.taskTitle}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      Priority: {upd.currentPriority} → {upd.proposedPriority} · Target Date:{' '}
                      {upd.proposedScheduledDate}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {upd.rationale}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Proposed Brainstorm Roadmap Items */}
      {activePlan.proposedNewItems && activePlan.proposedNewItems.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Proposed New Roadmap Projects & Tasks ({activePlan.proposedNewItems.length} Items)
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            {activePlan.proposedNewItems.map((item) => (
              <label
                key={item.tempId}
                className="p-3 bg-white dark:bg-slate-900/60 flex items-start gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => onToggleNewItemSelection(item.tempId)}
                  className="mt-1 w-4 h-4 accent-indigo-600 rounded"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      [{item.type.toUpperCase()}] {item.title}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {item.priority.toUpperCase()} · {item.estimateMinutes}m est · Due {item.dueAt}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
