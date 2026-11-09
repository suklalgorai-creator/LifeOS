import {
  Task,
  ScheduleBlock,
  PlanningConstraints,
  AIPlan,
  ProposedTaskUpdate,
  Category,
} from '../types/lifeos';

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getBlockDurationMinutes(block: Pick<ScheduleBlock, 'startTime' | 'endTime'>): number {
  return Math.max(0, timeToMinutes(block.endTime) - timeToMinutes(block.startTime));
}

export function detectScheduleConflicts(blocks: ScheduleBlock[]): Array<{
  blockA: ScheduleBlock;
  blockB: ScheduleBlock;
  overlapMinutes: number;
}> {
  const sorted = [...blocks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const conflicts: Array<{ blockA: ScheduleBlock; blockB: ScheduleBlock; overlapMinutes: number }> = [];

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      if (a.date !== b.date) continue;
      const endA = timeToMinutes(a.endTime);
      const startB = timeToMinutes(b.startTime);
      if (endA > startB) {
        const endB = timeToMinutes(b.endTime);
        conflicts.push({
          blockA: a,
          blockB: b,
          overlapMinutes: Math.min(endA, endB) - startB,
        });
      }
    }
  }
  return conflicts;
}

export function buildDeterministicScheduleDraft(params: {
  targetDate: string;
  tasks: Task[];
  existingBlocks: ScheduleBlock[];
  constraints: PlanningConstraints;
  categories: Category[];
  mode: 'daily_schedule' | 'overdue_reschedule';
}): AIPlan {
  const { targetDate, tasks, existingBlocks, constraints, mode } = params;

  // 1. Keep all fixed timetable blocks and user-locked blocks untouched
  const immovableBlocks = existingBlocks
    .filter((b) => b.date === targetDate && (b.source === 'fixed_timetable' || b.locked))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  // 2. Select candidate tasks (overdue, planned for targetDate, or high-priority inbox)
  const priorityScore: Record<string, number> = {
    critical: 400,
    high: 300,
    medium: 200,
    low: 100,
  };

  const candidates = tasks
    .filter((t) => {
      if (t.status === 'completed' || t.status === 'cancelled' || t.status === 'skipped') {
        return false;
      }
      if (mode === 'overdue_reschedule') {
        return t.dueAt <= targetDate || t.status === 'postponed' || t.scheduledDate === targetDate;
      }
      return t.scheduledDate === targetDate || t.dueAt <= targetDate || t.status === 'inbox';
    })
    .sort((a, b) => {
      const aOverdue = a.dueAt < targetDate ? 150 : 0;
      const bOverdue = b.dueAt < targetDate ? 150 : 0;
      const aScore = (priorityScore[a.priority] || 100) + aOverdue + a.postponeCount * 25;
      const bScore = (priorityScore[b.priority] || 100) + bOverdue + b.postponeCount * 25;
      return bScore - aScore;
    });

  // 3. Compute free windows between wakeTime and sleepTime around immovable blocks
  const wakeMin = timeToMinutes(constraints.wakeTime);
  const sleepMin = timeToMinutes(constraints.sleepTime);
  const buffer = constraints.breakBufferMinutes;

  const occupiedRanges = immovableBlocks.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime) + buffer,
  }));

  const proposedBlocks: ScheduleBlock[] = [];
  const proposedTaskUpdates: ProposedTaskUpdate[] = [];
  const assumptions: string[] = [
    `Protected ${immovableBlocks.length} immovable/locked commitment block(s) on ${targetDate}.`,
    `Applied ${constraints.maxDailyWorkMinutes}m focused-work daily cap and ${buffer}m break buffer between blocks.`,
  ];
  const overloadWarnings: string[] = [];

  let cursor = wakeMin + 30; // Start 30m after wake
  let allocatedWorkMinutes = 0;

  for (const task of candidates) {
    // Check prerequisites
    const unmetPrereq = task.prerequisiteTaskIds.some((pid) => {
      const pre = tasks.find((x) => x.id === pid);
      return pre && pre.status !== 'completed' && !proposedBlocks.some((pb) => pb.taskId === pid);
    });

    const duration = Math.min(90, Math.max(25, task.estimateMinutes - task.actualMinutes));

    if (unmetPrereq || allocatedWorkMinutes + duration > constraints.maxDailyWorkMinutes) {
      const nextDay = incrementDateString(targetDate, 1);
      const reason = unmetPrereq
        ? `Deferred to ${nextDay} until prerequisite task is completed.`
        : `Deferred to ${nextDay} to respect your ${constraints.maxDailyWorkMinutes}m daily focused-work limit.`;
      overloadWarnings.push(`${task.title}: ${reason}`);
      proposedTaskUpdates.push({
        taskId: task.id,
        taskTitle: task.title,
        currentPriority: task.priority,
        proposedPriority: task.dueAt < targetDate ? 'critical' : task.priority,
        currentStatus: task.status,
        proposedStatus: 'planned',
        currentScheduledDate: task.scheduledDate,
        proposedScheduledDate: nextDay,
        rationale: reason,
        selected: true,
      });
      continue;
    }

    // Find next non-overlapping slot
    let slotStart = cursor;
    let placed = false;

    while (slotStart + duration <= sleepMin - 30) {
      const slotEnd = slotStart + duration;
      const collision = occupiedRanges.find((r) => slotStart < r.end && slotEnd > r.start);
      if (collision) {
        slotStart = collision.end;
      } else {
        proposedBlocks.push({
          id: `prop_blk_${task.id}_${Date.now().toString(36).slice(-4)}`,
          taskId: task.id,
          title:
            task.postponeCount >= 3
              ? `${task.title} (High-Priority Recovery Block)`
              : task.title,
          categoryId: task.categoryId,
          date: targetDate,
          startTime: minutesToTime(slotStart),
          endTime: minutesToTime(slotEnd),
          source: 'ai_proposed',
          locked: false,
          accepted: false,
          notes:
            task.postponeCount >= 3
              ? `Postponed ${task.postponeCount}x previously—scheduled into earlier high-energy window.`
              : undefined,
        });

        occupiedRanges.push({ start: slotStart, end: slotEnd + buffer });
        allocatedWorkMinutes += duration;
        cursor = slotEnd + buffer;
        placed = true;

        proposedTaskUpdates.push({
          taskId: task.id,
          taskTitle: task.title,
          currentPriority: task.priority,
          proposedPriority: task.dueAt < targetDate ? 'critical' : task.priority,
          currentStatus: task.status,
          proposedStatus: 'planned',
          currentScheduledDate: task.scheduledDate,
          proposedScheduledDate: targetDate,
          rationale:
            task.postponeCount >= 2
              ? `Postponed ${task.postponeCount}x; prioritized into ${minutesToTime(slotStart)}–${minutesToTime(slotEnd)} conflict-free window.`
              : `Slotted into ${minutesToTime(slotStart)}–${minutesToTime(slotEnd)} around fixed commitments.`,
          selected: true,
        });
        break;
      }
    }

    if (!placed) {
      const nextDay = incrementDateString(targetDate, 1);
      overloadWarnings.push(
        `No conflict-free ${duration}m window left before ${constraints.sleepTime} for "${task.title}"; proposed for ${nextDay}.`
      );
      proposedTaskUpdates.push({
        taskId: task.id,
        taskTitle: task.title,
        currentPriority: task.priority,
        proposedPriority: task.priority,
        currentStatus: task.status,
        proposedStatus: 'planned',
        currentScheduledDate: task.scheduledDate,
        proposedScheduledDate: nextDay,
        rationale: `No open ${duration}m window before ${constraints.sleepTime}; shifted safely to ${nextDay}.`,
        selected: true,
      });
    }
  }

  return {
    id: `plan_${Date.now().toString(36)}`,
    title:
      mode === 'overdue_reschedule'
        ? `A1 Draft: Overdue Recovery & Conflict-Free Reschedule (${targetDate})`
        : `A1 Draft: Realistic Daily Schedule Proposal (${targetDate})`,
    planType: mode,
    targetDate,
    generatedAt: new Date().toISOString(),
    status: 'pending_approval',
    summary: `Generated ${proposedBlocks.length} conflict-free focus blocks (${allocatedWorkMinutes}m total vs ${constraints.maxDailyWorkMinutes}m cap) while preserving ${immovableBlocks.length} fixed/locked commitments.`,
    assumptions,
    overloadWarnings,
    proposedBlocks,
    proposedTaskUpdates,
  };
}

export function incrementDateString(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(parts[0] || 2026, (parts[1] || 11) - 1, parts[2] || 9));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}
