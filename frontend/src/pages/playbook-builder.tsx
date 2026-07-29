import { useEffect, useState } from 'react';
import {
  fetchPlaybooks, createPlaybook, updatePlaybook, deletePlaybook,
  executePlaybook, fetchPlaybookExecutions,
  Playbook, PlaybookExecution,
} from '@/services/api/playbooks';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Plus, Trash2, Play, ChevronRight, X, Save, CheckCircle2,
  AlertTriangle, Shield, Bell, Lock, FileText, ArrowDown, Loader2,
  History, ToggleLeft, ToggleRight, Eye,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────

const TRIGGERS = [
  { id: 'weapon_detected',  label: 'Weapon Detected',    color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',    icon: <AlertTriangle size={14} /> },
  { id: 'critical_alert',   label: 'Critical Alert',     color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: <Shield size={14} /> },
  { id: 'case_opened',      label: 'Case Opened',        color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: <FileText size={14} /> },
  { id: 'manual',           label: 'Manual Trigger',     color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: <Zap size={14} /> },
];

const ACTIONS = [
  { id: 'notify_slack',       label: 'Notify Slack',       icon: <Bell size={13} />,       color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { id: 'notify_discord',     label: 'Notify Discord',     icon: <Bell size={13} />,       color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20' },
  { id: 'create_case',        label: 'Create Case',        icon: <FileText size={13} />,   color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  { id: 'escalate_incident',  label: 'Escalate Incident',  icon: <AlertTriangle size={13} />, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { id: 'lock_camera',        label: 'Lock Camera',        icon: <Lock size={13} />,       color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
  { id: 'generate_report',    label: 'Generate Report',    icon: <FileText size={13} />,   color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
];

// ── Builder Canvas ─────────────────────────────────────────────────────────

function BuilderCanvas({
  trigger, setTrigger, actions, setActions,
}: {
  trigger: string;
  setTrigger: (t: string) => void;
  actions: string[];
  setActions: (a: string[]) => void;
}) {
  const triggerDef = TRIGGERS.find(t => t.id === trigger) || TRIGGERS[0];

  const toggleAction = (id: string) => {
    setActions(actions.includes(id) ? actions.filter(a => a !== id) : [...actions, id]);
  };

  return (
    <div className="flex flex-col items-center gap-2 py-4 px-6 overflow-y-auto flex-1">
      {/* Trigger node */}
      <div className="w-full max-w-xs">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 text-center">Trigger</div>
        <div className={`flex flex-col gap-2`}>
          {TRIGGERS.map(t => (
            <button
              key={t.id}
              onClick={() => setTrigger(t.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all font-medium text-[13px] ${
                trigger === t.id
                  ? `${t.bg} ${t.color} border-current`
                  : 'bg-zinc-900/40 border-white/5 text-muted-foreground hover:border-white/20 hover:text-white'
              }`}
            >
              <span className={trigger === t.id ? t.color : 'text-muted-foreground/50'}>{t.icon}</span>
              {t.label}
              {trigger === t.id && <CheckCircle2 size={14} className="ml-auto" />}
            </button>
          ))}
        </div>
      </div>

      {/* Connector */}
      <div className="flex flex-col items-center gap-1 my-2">
        <div className="w-[2px] h-6 bg-gradient-to-b from-white/20 to-white/5" />
        <ArrowDown size={14} className="text-muted-foreground/50" />
        <div className="text-[10px] text-muted-foreground/40">THEN</div>
        <ArrowDown size={14} className="text-muted-foreground/50" />
        <div className="w-[2px] h-2 bg-gradient-to-b from-white/5 to-transparent" />
      </div>

      {/* Action nodes */}
      <div className="w-full max-w-xs">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 text-center">Actions</div>
        <div className="flex flex-col gap-2">
          {ACTIONS.map(a => {
            const isActive = actions.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => toggleAction(a.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-[13px] font-medium ${
                  isActive
                    ? `${a.bg} ${a.color} border-current`
                    : 'bg-zinc-900/40 border-white/5 text-muted-foreground hover:border-white/20 hover:text-white'
                }`}
              >
                <span className={isActive ? a.color : 'text-muted-foreground/50'}>{a.icon}</span>
                {a.label}
                {isActive && <CheckCircle2 size={13} className="ml-auto" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function PlaybookBuilderPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [executions, setExecutions] = useState<PlaybookExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'builder' | 'log'>('builder');
  const [selectedPb, setSelectedPb] = useState<Playbook | null>(null);
  const [showNew, setShowNew] = useState(false);

  // Builder state
  const [pbName, setPbName] = useState('');
  const [trigger, setTrigger] = useState('weapon_detected');
  const [actions, setActions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  const loadAll = async () => {
    try {
      const [pbs, execs] = await Promise.all([fetchPlaybooks(), fetchPlaybookExecutions()]);
      setPlaybooks(pbs);
      setExecutions(execs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const handleSelectPb = (pb: Playbook) => {
    setSelectedPb(pb);
    setPbName(pb.name);
    setTrigger(pb.trigger_type);
    setActions((pb.actions || []).map(a => a.action));
    setShowNew(false);
  };

  const handleNew = () => {
    setSelectedPb(null);
    setPbName('');
    setTrigger('weapon_detected');
    setActions([]);
    setShowNew(true);
  };

  const handleSave = async () => {
    if (!pbName.trim() || actions.length === 0) {
      setSaveMsg('Please add a name and at least one action.');
      return;
    }
    setSaving(true);
    setSaveMsg('');
    try {
      const actionsJson = actions.map(a => ({ action: a }));
      if (selectedPb) {
        await updatePlaybook(selectedPb.id, { name: pbName, trigger_type: trigger, actions_json: actionsJson as any });
        setSaveMsg('Playbook updated!');
      } else {
        await createPlaybook({ name: pbName, trigger_type: trigger, actions_json: actionsJson });
        setSaveMsg('Playbook created!');
        setShowNew(false);
      }
      await loadAll();
    } catch (e) { setSaveMsg('Save failed.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await deletePlaybook(id);
    if (selectedPb?.id === id) { setSelectedPb(null); setShowNew(false); }
    await loadAll();
  };

  const handleExecute = async (id: string) => {
    setExecuting(id);
    try {
      await executePlaybook(id);
      await loadAll();
    } finally { setExecuting(null); }
  };

  const handleToggle = async (pb: Playbook) => {
    setToggling(pb.id);
    try {
      await updatePlaybook(pb.id, { status: pb.status === 'active' ? 'inactive' : 'active' });
      await loadAll();
    } finally { setToggling(null); }
  };

  const triggerDef = TRIGGERS.find(t => t.id === trigger);

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col gap-5 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Zap size={22} className="text-purple-400" />
            Playbook Builder
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px]">
            SOAR automation: define trigger → action flows that execute automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center bg-zinc-900 border border-white/10 rounded-lg p-1">
            {[{ id: 'builder', label: 'Builder' }, { id: 'log', label: 'Execution Log' }].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-3 h-9 bg-white text-black rounded-lg text-[12px] font-semibold hover:bg-zinc-100 transition-colors"
          >
            <Plus size={13} /> New Playbook
          </button>
        </div>
      </div>

      {activeTab === 'builder' ? (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Playbook list */}
          <div className="w-64 flex flex-col gap-2 shrink-0">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1">Saved Playbooks</div>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-zinc-900/40 border border-white/5 rounded-xl animate-pulse" />)
              ) : playbooks.length === 0 && !showNew ? (
                <div className="text-[12px] text-muted-foreground text-center py-8">No playbooks yet.</div>
              ) : (
                <>
                  {playbooks.map(pb => {
                    const trig = TRIGGERS.find(t => t.id === pb.trigger_type);
                    const isSelected = selectedPb?.id === pb.id;
                    return (
                      <motion.div
                        key={pb.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative rounded-xl border p-3 cursor-pointer transition-all group ${
                          isSelected
                            ? 'bg-white/5 border-white/20'
                            : 'bg-zinc-900/40 border-white/5 hover:border-white/15'
                        }`}
                        onClick={() => handleSelectPb(pb)}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="text-[13px] font-semibold text-white line-clamp-1">{pb.name}</p>
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${pb.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                        </div>
                        <div className={`text-[11px] flex items-center gap-1 ${trig?.color || 'text-muted-foreground'}`}>
                          {trig?.icon}
                          {trig?.label || pb.trigger_type}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {(pb.actions || []).length} action{(pb.actions || []).length !== 1 ? 's' : ''}
                        </div>
                        {pb.last_triggered && (
                          <div className="text-[10px] text-muted-foreground/50 mt-1 font-mono">
                            Last: {new Date(pb.last_triggered).toLocaleDateString()}
                          </div>
                        )}
                        {/* Action buttons */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); handleExecute(pb.id); }}
                            disabled={executing === pb.id}
                            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-emerald-400 transition-colors"
                            title="Execute"
                          >
                            {executing === pb.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleToggle(pb); }}
                            disabled={toggling === pb.id}
                            className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-amber-400 transition-colors"
                            title={pb.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {pb.status === 'active' ? <ToggleRight size={11} className="text-emerald-400" /> : <ToggleLeft size={11} />}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(pb.id); }}
                            className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Builder canvas */}
          {(selectedPb || showNew) ? (
            <Card className="flex-1 bg-zinc-900/30 border-white/5 flex flex-col overflow-hidden">
              {/* Canvas header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${triggerDef?.bg || 'bg-zinc-900'}`}>
                    <Zap size={15} className={triggerDef?.color || 'text-muted-foreground'} />
                  </div>
                  <input
                    type="text"
                    placeholder="Playbook name..."
                    value={pbName}
                    onChange={e => setPbName(e.target.value)}
                    className="bg-transparent text-[15px] font-semibold text-white placeholder:text-muted-foreground/40 outline-none w-64"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {saveMsg && (
                    <span className={`text-[12px] ${saveMsg.includes('!') ? 'text-emerald-400' : 'text-red-400'}`}>
                      {saveMsg}
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[12px] font-semibold rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Save
                  </button>
                </div>
              </div>

              <BuilderCanvas
                trigger={trigger}
                setTrigger={setTrigger}
                actions={actions}
                setActions={setActions}
              />

              {/* Summary bar */}
              <div className="p-4 border-t border-white/5 shrink-0 flex items-center gap-3 bg-zinc-950/50">
                <div className={`px-2 py-1 rounded-md text-[11px] font-semibold ${triggerDef?.bg || ''} ${triggerDef?.color || ''}`}>
                  {triggerDef?.label}
                </div>
                <ChevronRight size={14} className="text-muted-foreground/40" />
                <div className="flex gap-1.5 flex-wrap">
                  {actions.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground/40">No actions selected</span>
                  ) : (
                    actions.map(a => {
                      const def = ACTIONS.find(x => x.id === a);
                      return def ? (
                        <span key={a} className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${def.bg} ${def.color}`}>
                          {def.label}
                        </span>
                      ) : null;
                    })
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex-1 bg-zinc-900/20 border-white/5 border-dashed flex items-center justify-center">
              <div className="text-center">
                <Zap size={40} className="text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-[14px] text-muted-foreground">Select a playbook to edit, or create a new one.</p>
                <button onClick={handleNew} className="mt-4 px-4 py-2 bg-white text-black text-[13px] font-semibold rounded-lg hover:bg-zinc-100 transition-colors">
                  + New Playbook
                </button>
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* Execution Log tab */
        <Card className="bg-zinc-900/40 border-white/5 overflow-hidden flex-1">
          <div className="p-4 border-b border-white/5 flex items-center gap-3">
            <History size={15} className="text-purple-400" />
            <span className="font-semibold text-[14px] text-white">Execution History</span>
            <span className="text-[11px] text-muted-foreground ml-auto">{executions.length} total runs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/[0.02] border-b border-white/5">
                <tr>
                  {['Playbook', 'Trigger', 'Actions', 'Executed At'].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {executions.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-12 text-center text-muted-foreground text-[13px]">No executions yet. Create and run a playbook.</td></tr>
                ) : (
                  executions.map((ex, i) => (
                    <motion.tr
                      key={ex.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3 text-[13px] font-medium text-white">{ex.playbook_name || '—'}</td>
                      <td className="px-5 py-3">
                        <span className="text-[12px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                          {ex.trigger_event}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {(ex.actions_taken || []).map((a, j) => (
                            <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded ${a.status === 'ok' || a.status === 'simulated' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {a.action}: {a.status}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                        {ex.executed_at ? new Date(ex.executed_at).toLocaleString() : '—'}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
