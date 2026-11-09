import React, { useState } from 'react';
import {
  FileText,
  Layers,
  Server,
  CheckCircle2,
  Circle,
  Download,
  Copy,
  Check,
  PlusCircle,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import {
  ENGINEERING_DOC_SECTIONS,
  MASTER_ROADMAP_PHASES,
  MasterRoadmapPhase,
} from '../data/millionUserDocsData';

interface ScaleAndDocsHubProps {
  onImportRoadmapToLifeOS: () => void;
  roadmapImported: boolean;
}

export const ScaleAndDocsHub: React.FC<ScaleAndDocsHubProps> = ({
  onImportRoadmapToLifeOS,
  roadmapImported,
}) => {
  const [activeDocId, setActiveDocId] = useState<string>(ENGINEERING_DOC_SECTIONS[2].id); // Default to 10M+ Scalability doc or PRD
  const [phases, setPhases] = useState<MasterRoadmapPhase[]>(MASTER_ROADMAP_PHASES);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<'docs' | 'roadmap'>('docs');

  const activeDoc =
    ENGINEERING_DOC_SECTIONS.find((d) => d.id === activeDocId) || ENGINEERING_DOC_SECTIONS[0];

  const toggleRoadmapTask = (phaseId: string, taskId: string) => {
    setPhases((prev) =>
      prev.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === taskId ? { ...t, completed: !t.completed } : t
              ),
            }
          : p
      )
    );
  };

  const handleCopyCode = (filename: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(filename);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownloadFullMarkdownPack = () => {
    const lines: string[] = [
      '# LifeOS — Master PRD, Modular Architecture & 10M+ User Scalability Pack',
      `Generated: ${new Date().toISOString()}`,
      '',
    ];

    for (const doc of ENGINEERING_DOC_SECTIONS) {
      lines.push(`## ${doc.number}. ${doc.title}`);
      lines.push(`${doc.summary}\n`);
      if (doc.architectureDiagram) {
        lines.push('```');
        lines.push(doc.architectureDiagram);
        lines.push('```\n');
      }
      for (const sec of doc.sections) {
        lines.push(`### ${sec.heading}`);
        for (const p of sec.body) {
          lines.push(`${p}\n`);
        }
        if (sec.codeBlock) {
          lines.push(`\`\`\`${sec.codeBlock.language}`);
          lines.push(`// ${sec.codeBlock.filename}`);
          lines.push(sec.codeBlock.code);
          lines.push('```\n');
        }
      }
    }

    lines.push('## Phased Implementation Roadmap (1 User to 10M+ MAU)');
    for (const phase of phases) {
      lines.push(`### ${phase.phaseNumber}: ${phase.name} (${phase.scaleTarget})`);
      lines.push(`Exit Criteria: ${phase.exitCriteria}`);
      for (const t of phase.tasks) {
        lines.push(`- [${t.completed ? 'x' : ' '}] (${t.priority.toUpperCase()} · ${t.estimateHours}h) ${t.title}`);
      }
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LifeOS-Million-User-PRD-Architecture-Roadmap.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRoadmapTasks = phases.reduce((acc, p) => acc + p.tasks.length, 0);
  const completedRoadmapTasks = phases.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.completed).length,
    0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Architecture & Documentation Pack · PRD v2.0 · Flutter + Distributed Cloud Blueprint
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Master PRD, Modular Clean Architecture & 10M+ User Scalability Suite
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Complete production documentation, partitioned PostgreSQL/Supabase schemas, Flutter Clean
            Architecture contracts, official Notion sync specifications, and actionable 10-phase roadmap.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onImportRoadmapToLifeOS}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {roadmapImported
              ? 'Roadmap Synced to Active Tasks'
              : 'Import Phase 5–10 Tasks into LifeOS'}
          </button>

          <button
            onClick={handleDownloadFullMarkdownPack}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Complete Docs (.md)
          </button>
        </div>
      </div>

      {/* Mode Switcher: Technical Documentation vs Interactive Master Roadmap */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveSubView('docs')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeSubView === 'docs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            01. PRD, Modular Architecture & 10M+ Scalability Specs
          </button>
          <button
            onClick={() => setActiveSubView('roadmap')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeSubView === 'roadmap'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            02. Interactive 10-Phase Engineering Roadmap ({completedRoadmapTasks}/{totalRoadmapTasks}{' '}
            Tasks)
          </button>
        </div>

        <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          Target Capacity: 10,000,000+ MAU · 64 Hash Shards · 45,000 Peak RPS · 99.99% SLA
        </div>
      </div>

      {activeSubView === 'docs' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Document Index Sidebar */}
          <div className="lg:col-span-4 space-y-2">
            {ENGINEERING_DOC_SECTIONS.map((doc) => {
              const selected = doc.id === activeDoc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => setActiveDocId(doc.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-white dark:bg-[#111827] border-indigo-600 dark:border-indigo-500'
                      : 'bg-white/60 dark:bg-[#111827]/60 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-[#111827]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span>DOC {doc.number} · {doc.category}</span>
                    <span>{doc.readTime}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {doc.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {doc.subtitle}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Document Reader */}
          <div className="lg:col-span-8 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                DOCUMENT {activeDoc.number} · {activeDoc.category.toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {activeDoc.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {activeDoc.summary}
              </p>
            </div>

            {/* Quantitative SLA / Scale Metrics Strip */}
            {activeDoc.keyMetrics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {activeDoc.keyMetrics.map((m) => (
                  <div
                    key={m.label}
                    className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{m.label}</div>
                    <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                      {m.target}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {m.detail}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Architecture Diagram */}
            {activeDoc.architectureDiagram && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  System Topology & Data Flow Diagram
                </div>
                <pre className="p-4 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] leading-snug overflow-x-auto border border-slate-800">
                  {activeDoc.architectureDiagram}
                </pre>
              </div>
            )}

            {/* Detailed Sections & Copyable Code Artifacts */}
            <div className="space-y-6">
              {activeDoc.sections.map((sec) => (
                <div key={sec.heading} className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {sec.heading}
                  </h3>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {sec.body.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>

                  {sec.codeBlock && (
                    <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-400">
                        <span>{sec.codeBlock.filename}</span>
                        <button
                          onClick={() =>
                            handleCopyCode(sec.codeBlock!.filename, sec.codeBlock!.code)
                          }
                          className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer"
                        >
                          {copiedCode === sec.codeBlock.filename ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Code
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                        {sec.codeBlock.code}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Interactive 10-Phase Master Engineering Roadmap */
        <div className="space-y-6">
          {phases.map((phase) => {
            const doneCount = phase.tasks.filter((t) => t.completed).length;
            return (
              <div
                key={phase.id}
                className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                      {phase.phaseNumber} · Scale Horizon: {phase.scaleTarget} · {phase.durationEstimate}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {phase.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Exit Criteria: {phase.exitCriteria}
                    </p>
                  </div>

                  <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                    Completed: {doneCount}/{phase.tasks.length} Tasks
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {phase.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleRoadmapTask(phase.id, task.id)}
                      className="py-3 flex items-start justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 px-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        {task.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <div
                            className={`text-sm font-medium ${
                              task.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {task.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Domain: {task.domain} · Priority: {task.priority.toUpperCase()} · Estimate:{' '}
                            <span className="font-mono tabular-nums">{task.estimateHours}h</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
