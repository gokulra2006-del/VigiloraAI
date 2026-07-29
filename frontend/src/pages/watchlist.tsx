import { useEffect, useState } from 'react';
import {
  fetchWatchlist, createWatchlistEntry, updateWatchlistEntry, deleteWatchlistEntry,
  fetchWatchlistMatches, simulateWatchlistMatch,
  WatchlistEntry, WatchlistMatch,
} from '@/services/api/watchlist';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Trash2, Search, Eye, Target, Clock,
  Camera, ShieldCheck, X, AlertTriangle, Zap, UserCheck,
} from 'lucide-react';

const CATEGORIES = ['POI', 'Suspect', 'Missing', 'VIP'];

function categoryStyle(cat: string) {
  switch (cat) {
    case 'POI': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'Suspect': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'Missing': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'VIP': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    default: return 'bg-zinc-800 text-zinc-300 border-white/10';
  }
}

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-blue-600', 'bg-purple-600', 'bg-rose-600', 'bg-amber-600', 'bg-emerald-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white font-bold text-sm border border-white/10 flex-shrink-0`}>
      {initials}
    </div>
  );
}

function EnrollModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', category: 'POI', notes: '', photo_url: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      await createWatchlistEntry({
        name: form.name,
        category: form.category,
        notes: form.notes || undefined,
        photo_url: form.photo_url || undefined,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError('Failed to enroll. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h3 className="text-base font-semibold text-white">Enroll Person of Interest</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">Add to the watchlist for face-match tracking</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setForm(p => ({ ...p, category: cat }))}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    form.category === cat ? categoryStyle(cat) : 'bg-zinc-900 border-white/10 text-muted-foreground hover:border-white/20'
                  }`}
                >{cat}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Photo URL (optional)</label>
            <input
              type="text"
              value={form.photo_url}
              onChange={e => setForm(p => ({ ...p, photo_url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              placeholder="Additional details..."
              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/20 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3 p-5 border-t border-white/5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-zinc-900 border border-white/10 text-[13px] text-muted-foreground hover:text-white transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            {saving ? 'Enrolling...' : 'Enroll'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function WatchlistPage() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [matches, setMatches] = useState<WatchlistMatch[]>([]);
  const [activeTab, setActiveTab] = useState<'enrolled' | 'matches'>('enrolled');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      const [e, m] = await Promise.all([fetchWatchlist(), fetchWatchlistMatches()]);
      setEntries(e);
      setMatches(m);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleDelete = async (id: string) => {
    await deleteWatchlistEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleToggleStatus = async (entry: WatchlistEntry) => {
    const newStatus = entry.status === 'active' ? 'inactive' : 'active';
    await updateWatchlistEntry(entry.id, { status: newStatus });
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: newStatus as any } : e));
  };

  const handleSimulateMatch = async () => {
    setSimulating(true);
    setSimResult(null);
    try {
      const result = await simulateWatchlistMatch();
      setSimResult(`Match: ${result.watchlist_name} on ${result.camera_id} (${result.confidence_pct}% confidence)`);
      await loadAll();
    } catch (e: any) {
      setSimResult(e.message || 'No active entries to match against.');
    } finally {
      setSimulating(false);
    }
  };

  const filteredEntries = entries.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <UserCheck size={22} className="text-purple-400" />
            Watchlist Manager
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px]">Enroll persons of interest and track live face-match events.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateMatch}
            disabled={simulating}
            className="flex items-center gap-2 px-3 h-8 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-md text-[12px] font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-50"
          >
            <Zap size={13} />
            {simulating ? 'Simulating...' : 'Simulate Match'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 h-8 bg-white text-black rounded-md text-[12px] font-semibold hover:bg-zinc-100 transition-colors"
          >
            <Plus size={13} /> Enroll Person
          </button>
        </div>
      </div>

      {/* Sim result toast */}
      <AnimatePresence>
        {simResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[13px] text-purple-300"
          >
            <Target size={14} className="text-purple-400" />
            {simResult}
            <button onClick={() => setSimResult(null)} className="ml-auto text-purple-400 hover:text-white"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Enrolled', value: entries.length, sub: `${entries.filter(e => e.status === 'active').length} active`, color: 'text-white' },
          { label: 'Total Matches', value: matches.length, sub: 'All time', color: 'text-purple-400' },
          { label: 'High Confidence', value: matches.filter(m => m.confidence >= 0.85).length, sub: '≥85% confidence', color: 'text-red-400' },
        ].map(kpi => (
          <Card key={kpi.label} className="bg-zinc-900/40 border-white/5 p-4">
            <div className="text-[12px] text-muted-foreground mb-1">{kpi.label}</div>
            <div className={`text-3xl font-bold tracking-tight ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[11px] text-muted-foreground/50 mt-1">{kpi.sub}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/5">
        {[{ id: 'enrolled' as const, label: 'Enrolled Persons', count: entries.length },
          { id: 'matches' as const, label: 'Match Log', count: matches.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-[13px] font-medium relative transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'text-white' : 'text-muted-foreground hover:text-white'}`}
          >
            {tab.label}
            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded">{tab.count}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="watchlistTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'enrolled' ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Search by name or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 h-9 w-full max-w-sm bg-zinc-900 border border-white/10 rounded-lg text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-zinc-900/40 border border-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : filteredEntries.length === 0 ? (
            <Card className="bg-zinc-900/40 border-white/5 p-12 text-center">
              <Users size={32} className="text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No persons enrolled yet.</p>
              <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-white text-black text-[13px] font-semibold rounded-lg hover:bg-zinc-100 transition-colors">
                + Enroll Person
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredEntries.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className={`bg-zinc-900/40 border-white/5 p-4 hover:border-white/10 transition-all group ${entry.status === 'inactive' ? 'opacity-50' : ''}`}>
                      <div className="flex items-start gap-3">
                        <Avatar name={entry.name} photoUrl={entry.photo_url} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-[14px] text-white truncate">{entry.name}</span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${categoryStyle(entry.category)}`}>
                            {entry.category}
                          </Badge>
                          {entry.notes && (
                            <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{entry.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                        <div className="text-[11px] text-muted-foreground">
                          {entry.last_match ? (
                            <span className="flex items-center gap-1 text-purple-400">
                              <Target size={10} /> Last match {new Date(entry.last_match).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> No matches yet
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleToggleStatus(entry)}
                            className="p-1.5 rounded hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
                            title={entry.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            <ShieldCheck size={13} className={entry.status === 'active' ? 'text-emerald-500' : ''} />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      ) : (
        /* Match Log Tab */
        <Card className="bg-zinc-900/40 border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/[0.02] border-b border-white/5">
                <tr>
                  {['Person', 'Category', 'Camera', 'Confidence', 'Timestamp'].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {matches.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-muted-foreground text-[13px]">No matches recorded yet. Use "Simulate Match" to test.</td></tr>
                ) : (
                  matches.map((match, i) => (
                    <motion.tr
                      key={match.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                            {(match.watchlist_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[13px] font-medium text-white">{match.watchlist_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${categoryStyle(match.watchlist_category || '')}`}>
                          {match.watchlist_category || '—'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                          <Camera size={11} /> {match.camera_id || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${match.confidence_pct}%`,
                                background: match.confidence >= 0.85 ? '#ef4444' : match.confidence >= 0.7 ? '#f97316' : '#eab308',
                              }}
                            />
                          </div>
                          <span className="text-[12px] font-mono font-semibold" style={{
                            color: match.confidence >= 0.85 ? '#ef4444' : match.confidence >= 0.7 ? '#f97316' : '#eab308',
                          }}>{match.confidence_pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                        {match.timestamp ? new Date(match.timestamp).toLocaleString() : '—'}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {showModal && (
          <EnrollModal onClose={() => setShowModal(false)} onCreated={loadAll} />
        )}
      </AnimatePresence>
    </div>
  );
}
