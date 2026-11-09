import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Video,
  CheckSquare,
  Square,
  Calendar as CalendarIcon,
  ArrowRight,
  FileText,
} from 'lucide-react';
import {
  IdeaNote,
  ContentItem,
  ContentStage,
  ContentPlatform,
  Category,
} from '../types/lifeos';

interface BrainstormAndContentViewProps {
  mode: 'brainstorm' | 'content_studio';
  notes: IdeaNote[];
  contentItems: ContentItem[];
  categories: Category[];
  onAddNote: (title: string, content: string, categoryId: string, tags: string[]) => void;
  onConvertIdeaToRoadmapDraft: (promptText: string, categoryId: string) => Promise<void>;
  onConvertNoteToSingleTask: (note: IdeaNote) => void;
  onUpdateContentStage: (itemId: string, nextStage: ContentStage) => void;
  onToggleContentChecklist: (itemId: string, checklistId: string) => void;
  onAddContentItem: (item: Omit<ContentItem, 'id' | 'checklist'>) => void;
  onScheduleContentRecordingTask: (item: ContentItem) => void;
  isGeneratingRoadmap: boolean;
}

const CONTENT_STAGES: { id: ContentStage; label: string }[] = [
  { id: 'idea', label: '01. Idea & Hook' },
  { id: 'script', label: '02. Script & Slides' },
  { id: 'record', label: '03. Recording' },
  { id: 'edit', label: '04. Edit & Polish' },
  { id: 'publish', label: '05. Ready to Publish' },
];

export const BrainstormAndContentView: React.FC<BrainstormAndContentViewProps> = ({
  mode,
  notes,
  contentItems,
  categories,
  onAddNote,
  onConvertIdeaToRoadmapDraft,
  onConvertNoteToSingleTask,
  onUpdateContentStage,
  onToggleContentChecklist,
  onAddContentItem,
  onScheduleContentRecordingTask,
  isGeneratingRoadmap,
}) => {
  const [aiPrompt, setAiPrompt] = useState(
    'Master C dynamic memory allocators, pointer arithmetic, and Valgrind debugging in 2 weeks'
  );
  const [selectedCategory, setSelectedCategory] = useState('cat_programming');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('C-Programming, Systems');

  // Content Studio new item state
  const [newContentTitle, setNewContentTitle] = useState('');
  const [newContentPlatform, setNewContentPlatform] = useState<ContentPlatform>('YouTube');
  const [newContentDate, setNewContentDate] = useState('2026-11-18');
  const [newContentHook, setNewContentHook] = useState('');

  if (mode === 'brainstorm') {
    return (
      <div className="space-y-8">
        <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Phase 2 Workspace · AI Brainstorming & Note-to-Execution Converter
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Brainstorming & Goal-to-Roadmap Studio
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
            Capture raw technical notes or ask Gemini to decompose an ambitious learning goal into
            structured Projects and time-boxed Tasks staged in Strict A1 Draft mode.
          </p>
        </div>

        {/* AI Goal-to-Roadmap Generator */}
        <div className="p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              01. AI Goal-to-Execution Decomposer (Stages A1 Draft)
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Model: gemini-3.8-flash (Server-Side)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-7">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe a goal or topic to break into projects & tasks..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="lg:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <button
                onClick={() => onConvertIdeaToRoadmapDraft(aiPrompt, selectedCategory)}
                disabled={isGeneratingRoadmap || !aiPrompt.trim()}
                className="w-full h-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGeneratingRoadmap ? 'Decomposing...' : 'Draft Roadmap'}
              </button>
            </div>
          </div>
        </div>

        {/* Capture Idea Note + Existing Notes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 p-6 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              02. Quick Capture Brainstorm Note
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Idea title (e.g., Custom C Arena Visualizer)..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              />
              <textarea
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write architecture thoughts, study notes, or video angles..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              />
              <input
                type="text"
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                placeholder="Comma-separated tags..."
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              />
              <button
                onClick={() => {
                  if (!noteTitle.trim()) return;
                  onAddNote(
                    noteTitle.trim(),
                    noteContent.trim(),
                    selectedCategory,
                    noteTags
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                  );
                  setNoteTitle('');
                  setNoteContent('');
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Idea Note
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {notes.map((note) => {
              const cat = categories.find((c) => c.id === note.categoryId);
              return (
                <div
                  key={note.id}
                  className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {cat?.name || 'General'} · {note.tags.join(' · ')}
                      {note.notionPageId && ` · Synced (${note.notionPageId})`}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onConvertNoteToSingleTask(note)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors cursor-pointer"
                      >
                        Convert to Task <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() =>
                          onConvertIdeaToRoadmapDraft(
                            `${note.title}: ${note.content}`,
                            note.categoryId
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" /> AI Roadmap Draft
                      </button>
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {note.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {note.content}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Content Studio View
  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Phase 2 Workspace · YouTube & Instagram Production Pipeline
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
          Content Studio (Idea → Script → Record → Edit → Publish)
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
          Track technical videos and coding reels across all 5 production stages and convert
          recording/editing milestones directly into scheduled LifeOS focus blocks.
        </p>
      </div>

      {/* Quick Add Content Item */}
      <div className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-4">
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
            Video / Reel Title
          </label>
          <input
            type="text"
            value={newContentTitle}
            onChange={(e) => setNewContentTitle(e.target.value)}
            placeholder="e.g., How Linux Virtual Memory Paging Works"
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Platform</label>
          <select
            value={newContentPlatform}
            onChange={(e) => setNewContentPlatform(e.target.value as ContentPlatform)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
          >
            <option value="YouTube">YouTube</option>
            <option value="Instagram">Instagram</option>
            <option value="Cross-Platform">Cross-Platform</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
            Target Publish Date
          </label>
          <input
            type="date"
            value={newContentDate}
            onChange={(e) => setNewContentDate(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
            Key Hook / Angle
          </label>
          <input
            type="text"
            value={newContentHook}
            onChange={(e) => setNewContentHook(e.target.value)}
            placeholder="Visual GDB breakdown..."
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="md:col-span-2">
          <button
            onClick={() => {
              if (!newContentTitle.trim()) return;
              onAddContentItem({
                title: newContentTitle.trim(),
                platform: newContentPlatform,
                stage: 'idea',
                categoryId: 'cat_content',
                targetPublishDate: newContentDate,
                hookOrAngle: newContentHook.trim() || 'Technical visual deep dive.',
                scriptOutline: '1. Hook\n2. Architecture Diagram\n3. Live Code Proof',
                estimateMinutes: 60,
              });
              setNewContentTitle('');
              setNewContentHook('');
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add to Pipeline
          </button>
        </div>
      </div>

      {/* Pipeline Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {contentItems.map((item) => (
          <div
            key={item.id}
            className="p-5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                <span>
                  {item.platform} · Stage: {item.stage.toUpperCase()}
                </span>
                <span>Publish: {item.targetPublishDate}</span>
              </div>

              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {item.title}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <span className="font-semibold">Hook:</span> {item.hookOrAngle}
              </p>

              <pre className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {item.scriptOutline}
              </pre>

              {/* Production Checklist */}
              <div className="space-y-1.5 pt-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Publishing Checklist
                </div>
                {item.checklist.map((chk) => (
                  <div
                    key={chk.id}
                    onClick={() => onToggleContentChecklist(item.id, chk.id)}
                    className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    {chk.done ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className={chk.done ? 'line-through text-slate-400' : ''}>
                      {chk.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <select
                value={item.stage}
                onChange={(e) => onUpdateContentStage(item.id, e.target.value as ContentStage)}
                className="px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200"
              >
                {CONTENT_STAGES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onScheduleContentRecordingTask(item)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md transition-colors whitespace-nowrap cursor-pointer"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                Create Production Task
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
