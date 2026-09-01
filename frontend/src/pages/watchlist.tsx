import { useEffect, useState } from 'react';
import {
  fetchWatchlist, createWatchlistEntry, updateWatchlistEntry, deleteWatchlistEntry,
  fetchWatchlistMatches, runWatchlistDemo, reviewWatchlistMatch,
  WatchlistEntry, WatchlistMatch,
} from '@/services/api/watchlist';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Trash2, Search, Target, Clock,
  Camera, ShieldCheck, X, AlertTriangle, Zap, UserCheck, 
  CheckCircle2, XCircle, ScanFace, Activity, ShieldAlert
} from 'lucide-react';

const CATEGORIES = ['POI', 'Suspect', 'Missing', 'VIP', 'Restricted Access Demo'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

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
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0" />;
  }
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
  const [form, setForm] = useState({ name: '', category: 'POI', priority: 'MEDIUM', notes: '', photo_url: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      await createWatchlistEntry(form);
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
            <h3 className="text-base font-semibold text-white">Add Watchlist Entry</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">Enroll for visual identity monitoring</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Display Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Category</label>
              <select 
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[13px] text-white focus:outline-none focus:border-white/20"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Priority</label>
              <select 
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[13px] text-white focus:outline-none focus:border-white/20"
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Reference Image URL (optional)</label>
            <input
              type="text"
              value={form.photo_url}
              onChange={e => setForm(p => ({ ...p, photo_url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[13px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Description</label>
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

function ReviewPanel({ match, onReviewed, onClose }: { match: WatchlistMatch, onReviewed: () => void, onClose: () => void }) {
  const [decision, setDecision] = useState<'CONFIRM' | 'REJECT' | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!decision) return;
    setSubmitting(true);
    try {
      await reviewWatchlistMatch(match.id, decision, notes);
      onReviewed();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-red-500/10 border-b border-red-500/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-red-400" size={24} />
            <div>
              <h2 className="text-lg font-bold text-red-400 tracking-wide uppercase">Potential Watchlist Match</h2>
              <p className="text-sm text-red-400/80">Human Verification Required</p>
            </div>
          </div>
          <button onClick={onClose} className="text-red-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
          {/* Side-by-side images */}
          <div className="space-y-4">
            <div className="text-center font-mono text-sm tracking-widest text-muted-foreground uppercase border-b border-white/10 pb-2">Camera Frame</div>
            <div className="relative aspect-video bg-zinc-900 border border-white/10 rounded-lg overflow-hidden group">
              {match.frame_path ? (
                <img src={match.frame_path} className="w-full h-full object-cover" alt="Camera frame" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Frame Available</div>
              )}
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur text-[10px] font-mono text-white rounded border border-white/10">
                {match.camera_id} • {match.timestamp ? new Date(match.timestamp).toLocaleTimeString() : ''}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-center font-mono text-sm tracking-widest text-muted-foreground uppercase border-b border-white/10 pb-2">Reference Image</div>
            <div className="relative aspect-square md:aspect-video bg-zinc-900 border border-white/10 rounded-lg overflow-hidden">
              {match.watchlist_photo_url ? (
                <img src={match.watchlist_photo_url} className="w-full h-full object-cover" alt="Reference" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Reference</div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur text-[10px] font-mono text-white rounded border border-white/10 flex items-center gap-2">
                <span className="font-semibold">{match.watchlist_name}</span>
                <Badge className={categoryStyle(match.watchlist_category || '') + " text-[8px] py-0 px-1"}>{match.watchlist_category}</Badge>
              </div>
            </div>
          </div>

          {/* Verification Controls */}
          <div className="col-span-1 md:col-span-2 mt-4 space-y-6">
            <div className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl">
              <div className="text-sm font-medium text-muted-foreground mb-2 text-center uppercase tracking-widest">Visual Similarity Score</div>
              <div className="flex items-center gap-4 max-w-md mx-auto">
                <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${match.confidence_pct}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500"
                  />
                </div>
                <div className="text-2xl font-bold font-mono text-white">{match.confidence_pct}%</div>
              </div>
              <p className="text-center text-[11px] text-muted-foreground mt-2">Model similarity score. Not absolute proof of identity.</p>
            </div>

            <div className="space-y-4 border-t border-white/10 pt-6">
              <h3 className="font-semibold">Operator Decision</h3>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDecision('CONFIRM')}
                  className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all ${decision === 'CONFIRM' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-white/10 bg-zinc-900 text-muted-foreground hover:border-white/20'}`}
                >
                  <CheckCircle2 size={32} />
                  <span className="font-bold tracking-wider">CONFIRM MATCH</span>
                </button>
                <button 
                  onClick={() => setDecision('REJECT')}
                  className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 transition-all ${decision === 'REJECT' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/10 bg-zinc-900 text-muted-foreground hover:border-white/20'}`}
                >
                  <XCircle size={32} />
                  <span className="font-bold tracking-wider">REJECT (FALSE POSITIVE)</span>
                </button>
              </div>

              {decision && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                  <label className="block text-sm text-muted-foreground">Verification Notes (Optional)</label>
                  <textarea 
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm text-white resize-none focus:outline-none focus:border-white/20"
                    rows={3}
                    placeholder={`Provide reason for ${decision.toLowerCase()}...`}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`w-full py-3 rounded-lg font-bold text-black transition-colors ${decision === 'CONFIRM' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'} disabled:opacity-50`}
                  >
                    {submitting ? 'Submitting...' : 'SUBMIT VERIFICATION'}
                  </button>
                  {decision === 'CONFIRM' && (
                    <p className="text-center text-[11px] text-red-400 mt-2">⚠ Confirming this match will trigger an automated security incident.</p>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CinematicScanner({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);
  
  useEffect(() => {
    const sequence = async () => {
      await new Promise(r => setTimeout(r, 1500)); setPhase(1); // Frame received
      await new Promise(r => setTimeout(r, 2000)); setPhase(2); // Extracting features
      await new Promise(r => setTimeout(r, 2500)); setPhase(3); // Matching
      await new Promise(r => setTimeout(r, 2000)); setPhase(4); // Generating alert
      await new Promise(r => setTimeout(r, 1000)); onComplete();
    };
    sequence();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <ScanFace size={64} className="mx-auto text-blue-500 animate-pulse" />
          <h2 className="text-2xl font-bold tracking-widest text-white font-mono">VISUAL MATCHING ENGINE</h2>
          <p className="text-blue-400 font-mono text-sm tracking-widest">SCANNING FRAME...</p>
        </div>

        <div className="space-y-4 font-mono text-sm bg-zinc-950 border border-white/10 p-6 rounded-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan" />
          
          <div className={`flex items-center gap-3 transition-opacity duration-500 ${phase >= 1 ? 'opacity-100 text-emerald-400' : 'opacity-30 text-white'}`}>
            {phase >= 1 ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
            FRAME RECEIVED
          </div>
          <div className={`flex items-center gap-3 transition-opacity duration-500 ${phase >= 2 ? 'opacity-100 text-emerald-400' : 'opacity-30 text-white'}`}>
            {phase >= 2 ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
            VISUAL FEATURES EXTRACTED
          </div>
          <div className={`flex items-center gap-3 transition-opacity duration-500 ${phase >= 3 ? 'opacity-100 text-amber-400' : 'opacity-30 text-white'}`}>
            {phase >= 3 ? <Activity size={16} className="animate-spin" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
            SEARCHING AUTHORIZED WATCHLIST...
          </div>
          <div className={`flex items-center gap-3 transition-opacity duration-500 ${phase >= 4 ? 'opacity-100 text-red-500 font-bold' : 'opacity-0'}`}>
            <AlertTriangle size={16} />
            POTENTIAL MATCH DETECTED
          </div>
        </div>
      </div>
    </div>
  );
}

export function WatchlistPage() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [matches, setMatches] = useState<WatchlistMatch[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  const [showEnroll, setShowEnroll] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [scanning, setScanning] = useState(false);
  const [reviewMatch, setReviewMatch] = useState<WatchlistMatch | null>(null);

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

  const handleRunDemo = async () => {
    setScanning(true);
  };

  const onScanComplete = async () => {
    setScanning(false);
    try {
      const match = await runWatchlistDemo();
      setReviewMatch(match);
      await loadAll();
    } catch(e) {
      console.error(e);
    }
  };

  const pendingMatches = matches.filter(m => m.status === 'PENDING_REVIEW');
  const verifiedMatches = matches.filter(m => m.status === 'VERIFIED');
  const rejectedMatches = matches.filter(m => m.status === 'REJECTED');
  
  const matchesToday = matches.filter(m => m.timestamp && new Date(m.timestamp).toDateString() === new Date().toDateString());

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AnimatePresence>
        {scanning && <CinematicScanner onComplete={onScanComplete} />}
        {reviewMatch && (
          <ReviewPanel 
            match={reviewMatch} 
            onClose={() => setReviewMatch(null)} 
            onReviewed={loadAll} 
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 uppercase">
            <ScanFace size={24} className="text-blue-500" />
            Watchlist
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px] tracking-wide">Visual Identity Monitoring</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 h-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-[12px] font-mono tracking-widest">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ENGINE ONLINE
          </div>
          <button
            onClick={handleRunDemo}
            className="flex items-center gap-2 px-4 h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[12px] font-semibold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          >
            <Zap size={14} /> RUN WATCHLIST DEMO
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/40 border-white/5 p-4 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Watchlist Entries</div>
          <div className="text-4xl font-bold text-white">{entries.length}</div>
        </Card>
        <Card className="bg-zinc-900/40 border-white/5 p-4 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Matches Today</div>
          <div className="text-4xl font-bold text-blue-400">{matchesToday.length}</div>
        </Card>
        <Card className={`bg-zinc-900/40 border p-4 flex flex-col justify-between transition-colors ${pendingMatches.length > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'}`}>
          <div className={`text-[11px] font-mono uppercase tracking-wider mb-2 flex items-center gap-2 ${pendingMatches.length > 0 ? 'text-red-400 font-bold' : 'text-muted-foreground'}`}>
            Pending Review {pendingMatches.length > 0 && <AlertTriangle size={12} />}
          </div>
          <div className={`text-4xl font-bold ${pendingMatches.length > 0 ? 'text-red-400' : 'text-white'}`}>{pendingMatches.length}</div>
        </Card>
        <Card className="bg-zinc-900/40 border-white/5 p-4 flex flex-col justify-between">
          <div className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">False Positives</div>
          <div className="text-4xl font-bold text-emerald-400">{rejectedMatches.length}</div>
        </Card>
      </div>

      {pendingMatches.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle size={20} className="animate-pulse" />
              <div>
                <h3 className="font-bold uppercase tracking-wide text-sm">Action Required</h3>
                <p className="text-[12px] opacity-80">{pendingMatches.length} match(es) awaiting human verification.</p>
              </div>
            </div>
            <button 
              onClick={() => setReviewMatch(pendingMatches[0])}
              className="px-4 py-2 bg-red-500 text-black text-xs font-bold uppercase tracking-wider rounded hover:bg-red-400 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            >
              Review Now
            </button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/5">
        {[{ id: 'dashboard' as const, label: 'Dashboard & Entries' },
          { id: 'history' as const, label: 'Match History' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-[13px] font-medium relative transition-colors ${activeTab === tab.id ? 'text-white' : 'text-muted-foreground hover:text-white'}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="watchlistTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Enrolled Subjects</h2>
            <button onClick={() => setShowEnroll(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[12px] text-white transition-colors">
              <Plus size={13} /> Add Entry
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="bg-zinc-900/60 border-white/5 p-0 overflow-hidden flex flex-col group">
                <div className="p-4 flex gap-4">
                  <Avatar name={entry.name} photoUrl={entry.photo_url} />
                  <div className="flex-1">
                    <div className="font-bold text-sm tracking-wide text-white">{entry.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={categoryStyle(entry.category) + " text-[9px] uppercase font-bold tracking-widest px-1 py-0"}>{entry.category}</Badge>
                      <span className={`text-[10px] font-mono px-1 rounded border ${entry.priority === 'HIGH' ? 'text-red-400 border-red-500/20 bg-red-500/10' : 'text-amber-400 border-amber-500/20 bg-amber-500/10'}`}>
                        {entry.priority} PR
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 bg-zinc-950 border-t border-white/5 flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground font-mono">
                    STATUS: <span className={entry.status === 'active' ? 'text-emerald-400' : 'text-zinc-500'}>{entry.status.toUpperCase()}</span>
                  </span>
                  <button className="text-blue-400 hover:text-blue-300 font-semibold tracking-wide">VIEW PROFILE</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="bg-zinc-900/40 border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-950 border-b border-white/10">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Timestamp</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Camera</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Watchlist Entry</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Similarity</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {matches.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-[13px]">No matches recorded in history.</td></tr>
                ) : (
                  matches.map((match) => (
                    <tr key={match.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => { if(match.status === 'PENDING_REVIEW') setReviewMatch(match); }}>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground whitespace-nowrap font-mono">
                        {match.timestamp ? new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1 text-[12px] text-zinc-300 font-mono">
                          <Camera size={11} className="text-muted-foreground" /> {match.camera_id}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[13px] font-medium text-white">{match.watchlist_name || 'Unknown'}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[13px] font-mono font-bold ${match.confidence >= 0.9 ? 'text-red-400' : 'text-amber-400'}`}>
                          {match.confidence_pct}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0 ${
                          match.status === 'VERIFIED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          match.status === 'REJECTED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {match.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">
                        {match.reviewer_name || (match.status === 'PENDING_REVIEW' ? '—' : 'Auto')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {showEnroll && (
          <EnrollModal onClose={() => setShowEnroll(false)} onCreated={loadAll} />
        )}
      </AnimatePresence>
    </div>
  );
}
