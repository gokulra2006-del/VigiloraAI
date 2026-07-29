import { useEffect, useState } from 'react';
import { fetchCases, updateCaseStatus, createCase, fetchCaseTimeline, generateCaseReport, Case, CaseTimelineEvent } from '@/services/api/cases';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Plus, ChevronRight, X, FileText, Clock, AlertTriangle,
  CheckCircle2, Search, ArrowRight, Loader2, Camera, User, RefreshCw,
  Shield,
} from 'lucide-react';

type CaseStatus = 'open' | 'investigating' | 'closed';

const COLUMNS: { id: CaseStatus; label: string; color: string; accent: string }[] = [
  { id: 'open',         label: 'Open',          color: 'border-red-500/30',    accent: 'bg-red-500' },
  { id: 'investigating',label: 'Investigating',  color: 'border-amber-500/30',  accent: 'bg-amber-500' },
  { id: 'closed',       label: 'Closed',         color: 'border-emerald-500/30',accent: 'bg-emerald-500' },
];

function severityColor(sev: string) {
  switch (sev) {
    case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'high':     return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'medium':   return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'low':      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    default:         return 'bg-zinc-800 text-zinc-300 border-white/10';
  }
}

function statusIcon(status: CaseStatus) {
  switch (status) {
    case 'open':          return <AlertTriangle size={12} className="text-red-400" />;
    case 'investigating': return <Clock size={12} className="text-amber-400" />;
    case 'closed':        return <CheckCircle2 size={12} className="text-emerald-400" />;
  }
}

function nextStatus(current: CaseStatus): CaseStatus | null {
  if (current === 'open') return 'investigating';
  if (current === 'investigating') return 'closed';
  return null;
}

function CaseCard({ caseItem, onClick }: { caseItem: Case; onClick: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className="bg-zinc-900/60 border border-white/5 rounded-xl p-4 cursor-pointer hover:border-white/15 hover:bg-zinc-900/80 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${severityColor(caseItem.severity)}`}>
            {caseItem.severity}
          </Badge>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/50">#{caseItem.id.slice(0, 6).toUpperCase()}</span>
      </div>

      <p className="text-[13px] font-semibold text-white leading-snug mb-3 line-clamp-2">{caseItem.title}</p>

      {caseItem.summary && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{caseItem.summary}</p>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Shield size={10} />
          {caseItem.incident_count} incident{caseItem.incident_count !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString() : '—'}
        </span>
      </div>

      {caseItem.assignee && (
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center text-[8px] font-bold text-white">
            {caseItem.assignee.charAt(0).toUpperCase()}
          </div>
          {caseItem.assignee}
        </div>
      )}
    </motion.div>
  );
}

function TimelinePanel({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const [timeline, setTimeline] = useState<{ title: string; events: CaseTimelineEvent[] } | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);

  useEffect(() => {
    fetchCaseTimeline(caseId).then(setTimeline).catch(console.error);
  }, [caseId]);

  const handleReport = async () => {
    setReporting(true);
    try {
      const result = await generateCaseReport(caseId);
      setReportResult(result.summary_text || 'Report generated successfully.');
    } catch (e) {
      setReportResult('Failed to generate report.');
    } finally {
      setReporting(false);
    }
  };

  const eventColor = (type: string) => {
    if (type === 'case_created') return { dot: 'bg-blue-500', line: 'border-blue-500' };
    if (type === 'detection') return { dot: 'bg-red-500', line: 'border-red-500' };
    if (type === 'acknowledged') return { dot: 'bg-amber-500', line: 'border-amber-500' };
    if (type === 'resolved') return { dot: 'bg-emerald-500', line: 'border-emerald-500' };
    return { dot: 'bg-zinc-500', line: 'border-zinc-500' };
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-zinc-950 border-l border-white/10 shadow-2xl z-40 flex flex-col"
    >
      <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
        <div>
          <h3 className="font-semibold text-white text-[15px]">Case Timeline</h3>
          <p className="text-[11px] text-muted-foreground">{timeline?.title || '...'}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {!timeline ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : timeline.events.length === 0 ? (
          <p className="text-muted-foreground text-[13px] text-center py-8">No timeline events yet.</p>
        ) : (
          <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
            {timeline.events.map((ev, i) => {
              const colors = eventColor(ev.event_type);
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative">
                  <div className={`absolute -left-[22px] top-1 w-[14px] h-[14px] rounded-full border-2 ${colors.dot} ${colors.line}`} />
                  <div className="text-[10px] text-muted-foreground/60 mb-0.5">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : 'Pending'}
                  </div>
                  <div className="text-[13px] font-medium text-white">{ev.label}</div>
                  {ev.camera_id && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Camera size={10} /> {ev.camera_id}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {reportResult && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[12px] text-emerald-300">
            {reportResult}
          </div>
        )}
      </div>

      <div className="p-5 border-t border-white/5 shrink-0">
        <button
          onClick={handleReport}
          disabled={reporting}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black text-[13px] font-semibold rounded-xl hover:bg-zinc-100 transition-colors disabled:opacity-50"
        >
          {reporting ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          {reporting ? 'Generating...' : 'Generate AI Report'}
        </button>
      </div>
    </motion.div>
  );
}

export function CaseBoardPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await fetchCases();
      setCases(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleTransition = async (c: Case, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = nextStatus(c.status as CaseStatus);
    if (!next) return;
    setTransitioning(c.id);
    try {
      await updateCaseStatus(c.id, next);
      await load();
    } finally { setTransitioning(null); }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await createCase({ title: newTitle, severity: 'medium' });
      await load();
      setNewTitle('');
      setShowCreate(false);
    } finally { setCreating(false); }
  };

  const filteredCases = cases.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: CaseStatus) => filteredCases.filter(c => c.status === status);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col gap-5 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Briefcase size={22} className="text-amber-400" />
            Case Board
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Kanban-style case management — Open → Investigating → Closed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
            <input
              type="text"
              placeholder="Search cases..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 h-8 w-48 bg-zinc-900 border border-white/10 rounded-md text-[12px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
          <button onClick={load} className="p-2 bg-zinc-900 border border-white/10 rounded-md text-muted-foreground hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowCreate(p => !p)}
            className="flex items-center gap-2 px-3 h-8 bg-white text-black rounded-md text-[12px] font-semibold hover:bg-zinc-100 transition-colors"
          >
            <Plus size={13} /> New Case
          </button>
        </div>
      </div>

      {/* Quick create */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 overflow-hidden shrink-0"
          >
            <input
              type="text"
              autoFocus
              placeholder="Case title..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="flex-1 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/20 transition-colors"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
              className="px-4 py-2 bg-white text-black text-[13px] font-semibold rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="p-2 text-muted-foreground hover:text-white transition-colors"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4 flex-1">
          {[1,2,3].map(i => <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden">
          {COLUMNS.map(col => {
            const colCases = byStatus(col.id);
            return (
              <div key={col.id} className={`flex flex-col border ${col.color} bg-zinc-900/20 rounded-xl overflow-hidden`}>
                {/* Column header */}
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${col.accent}`} />
                  <span className="font-semibold text-[13px] text-white">{col.label}</span>
                  <span className="ml-auto text-[11px] bg-white/5 px-2 py-0.5 rounded font-mono text-muted-foreground">
                    {colCases.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <AnimatePresence mode="popLayout">
                    {colCases.length === 0 ? (
                      <div className="text-[12px] text-muted-foreground/40 text-center py-8">No {col.label.toLowerCase()} cases</div>
                    ) : (
                      colCases.map(c => (
                        <div key={c.id} className="group/card">
                          <CaseCard caseItem={c} onClick={() => setSelectedCaseId(c.id)} />
                          {nextStatus(c.status as CaseStatus) && (
                            <button
                              onClick={e => handleTransition(c, e)}
                              disabled={transitioning === c.id}
                              className="w-full mt-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-white hover:bg-white/5 transition-all opacity-0 group-hover/card:opacity-100"
                            >
                              {transitioning === c.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <>
                                  <ArrowRight size={11} />
                                  Move to {nextStatus(c.status as CaseStatus)}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline side panel */}
      <AnimatePresence>
        {selectedCaseId && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedCaseId(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30"
            />
            <TimelinePanel caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
