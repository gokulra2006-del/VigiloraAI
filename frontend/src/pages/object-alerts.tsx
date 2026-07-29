import { useEffect, useState, useCallback } from 'react';
import { fetchObjectAlerts, injectDetection, ObjectAlert } from '@/services/api/object-alerts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crosshair, Zap, Filter, RefreshCw, AlertTriangle,
  Camera, Clock, ChevronDown, Eye, Radio,
} from 'lucide-react';

const WEAPON_CLASSES = new Set(['gun', 'knife', 'pistol', 'rifle', 'weapon', 'fight']);
const THREAT_CLASSES = new Set([...WEAPON_CLASSES, 'person_running', 'intrusion', 'trespassing']);

function classColor(className: string): string {
  if (WEAPON_CLASSES.has(className)) return 'bg-red-500/15 text-red-400 border-red-500/30';
  if (THREAT_CLASSES.has(className)) return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  if (className === 'person') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  return 'bg-zinc-800 text-zinc-300 border-white/10';
}

function confidenceColor(pct: number): string {
  if (pct >= 85) return '#ef4444';
  if (pct >= 65) return '#f97316';
  return '#eab308';
}

function BoundingBoxPreview({ bbox, isThreat }: { bbox: [number, number, number, number] | null; isThreat: boolean }) {
  const color = isThreat ? '#ef4444' : '#3b82f6';
  return (
    <div className="relative bg-zinc-950 rounded-lg overflow-hidden border border-white/5 aspect-video flex-shrink-0 w-28">
      {/* Simulated camera frame background */}
      <div className="absolute inset-0 opacity-20"
        style={{ background: 'repeating-linear-gradient(45deg, #1e1e2e, #1e1e2e 2px, #0d0d1a 2px, #0d0d1a 12px)' }}
      />
      {/* Scan line animation */}
      <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent animate-scan-line" />
      {/* Bounding box */}
      {bbox && (
        <div
          className="absolute"
          style={{
            left: `${(bbox[0] / 640) * 100}%`,
            top: `${(bbox[1] / 480) * 100}%`,
            width: `${((bbox[2] - bbox[0]) / 640) * 100}%`,
            height: `${((bbox[3] - bbox[1]) / 480) * 100}%`,
            border: `2px solid ${color}`,
            boxShadow: `0 0 8px ${color}80`,
          }}
        >
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2" style={{ borderColor: color }} />
          <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2" style={{ borderColor: color }} />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2" style={{ borderColor: color }} />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2" style={{ borderColor: color }} />
        </div>
      )}
      <div className="absolute bottom-1 left-1 text-[8px] font-mono text-cyan-400/60">LIVE</div>
      {isThreat && (
        <div className="absolute top-1 right-1">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert, index }: { alert: ObjectAlert; index: number }) {
  const ts = alert.timestamp ? new Date(alert.timestamp) : null;
  const timeStr = ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

  return (
    <motion.div
      key={alert.id}
      initial={{ opacity: 0, x: -20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.97 }}
      transition={{ delay: index * 0.02, type: 'spring', stiffness: 400, damping: 30 }}
      className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-default ${
        alert.is_weapon
          ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30'
          : alert.is_threat
          ? 'bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10'
          : 'bg-zinc-900/40 border-white/5 hover:bg-white/[0.04]'
      }`}
    >
      {/* Threat pulse ring */}
      {alert.is_weapon && (
        <div className="absolute -inset-px rounded-xl border border-red-500/40 animate-pulse pointer-events-none" />
      )}

      <BoundingBoxPreview bbox={alert.bbox} isThreat={alert.is_threat} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 ${classColor(alert.class_name)}`}>
            {alert.is_weapon && <Crosshair size={9} className="mr-1 inline" />}
            {alert.class_name.replace(/_/g, ' ')}
          </Badge>
          {alert.is_weapon && (
            <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded animate-pulse">
              ⚠ WEAPON
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[12px] text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <Camera size={11} />
            {alert.camera_id}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {timeStr}
          </span>
        </div>

        {/* Confidence bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${alert.confidence_pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ background: confidenceColor(alert.confidence_pct) }}
            />
          </div>
          <span className="text-[12px] font-mono font-semibold" style={{ color: confidenceColor(alert.confidence_pct) }}>
            {alert.confidence_pct}%
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-[10px] font-mono text-muted-foreground/50">#{alert.id}</span>
        <div className={`w-2 h-2 rounded-full ${alert.is_weapon ? 'bg-red-500' : alert.is_threat ? 'bg-orange-500' : 'bg-blue-500/50'}`} />
      </div>
    </motion.div>
  );
}

export function ObjectAlertsPage() {
  const [alerts, setAlerts] = useState<ObjectAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [threatOnly, setThreatOnly] = useState(false);
  const [minConf, setMinConf] = useState(0);
  const [injecting, setInjecting] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [stats, setStats] = useState({ total: 0, weapons: 0, threats: 0 });

  const load = useCallback(async () => {
    try {
      const data = await fetchObjectAlerts({ threat_only: threatOnly, min_confidence: minConf, limit: 60 });
      setAlerts(data);
      setStats({
        total: data.length,
        weapons: data.filter(a => a.is_weapon).length,
        threats: data.filter(a => a.is_threat).length,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [threatOnly, minConf]);

  useEffect(() => {
    load();
  }, [load]);

  // Live polling
  useEffect(() => {
    if (!liveMode) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [liveMode, load]);

  const handleInject = async () => {
    setInjecting(true);
    try {
      await injectDetection();
      await load();
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-red-400 uppercase tracking-widest">Live Detection Feed</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Crosshair size={22} className="text-red-500" />
            Object Alerts
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px]">
            YOLO/RT-DETR detection pipeline — real-time object & weapon classification feed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLiveMode(p => !p)}
            className={`flex items-center gap-2 px-3 h-8 rounded-md text-[12px] font-medium border transition-all ${
              liveMode
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-zinc-900 border-white/10 text-muted-foreground hover:text-white'
            }`}
          >
            <Radio size={13} className={liveMode ? 'animate-pulse' : ''} />
            {liveMode ? 'LIVE' : 'Paused'}
          </button>
          <button
            onClick={handleInject}
            disabled={injecting}
            className="flex items-center gap-2 px-3 h-8 bg-zinc-900 border border-white/10 rounded-md text-[12px] text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <Zap size={13} />
            Inject Test
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 h-8 bg-zinc-900 border border-white/10 rounded-md text-[12px] text-white hover:bg-white/5 transition-colors"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Detections', value: stats.total, color: 'text-white', icon: <Eye size={16} /> },
          { label: 'Threat Class', value: stats.threats, color: 'text-orange-400', icon: <AlertTriangle size={16} /> },
          { label: 'Weapon Detections', value: stats.weapons, color: 'text-red-400', icon: <Crosshair size={16} /> },
        ].map(kpi => (
          <Card key={kpi.label} className="bg-zinc-900/40 border-white/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-muted-foreground">{kpi.label}</span>
              <span className="text-muted-foreground/50">{kpi.icon}</span>
            </div>
            <div className={`text-3xl font-bold tracking-tight ${kpi.color}`}>{kpi.value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-zinc-900 border border-white/10 rounded-lg p-1">
          <button
            onClick={() => setThreatOnly(false)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${!threatOnly ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}
          >All Classes</button>
          <button
            onClick={() => setThreatOnly(true)}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${threatOnly ? 'bg-red-500/20 text-red-400' : 'text-muted-foreground hover:text-white'}`}
          >Threats Only</button>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-lg px-3 h-9">
          <Filter size={13} className="text-muted-foreground" />
          <span className="text-[12px] text-muted-foreground">Min confidence</span>
          <select
            value={minConf}
            onChange={e => setMinConf(Number(e.target.value))}
            className="bg-transparent text-[12px] text-white outline-none"
          >
            {[0, 0.5, 0.6, 0.7, 0.8, 0.9].map(v => (
              <option key={v} value={v}>{v === 0 ? 'Any' : `≥${(v * 100).toFixed(0)}%`}</option>
            ))}
          </select>
        </div>
        <span className="text-[12px] text-muted-foreground ml-auto">
          {alerts.length} result{alerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Alert feed */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-zinc-900/40 border border-white/5 rounded-xl animate-pulse" />
          ))
        ) : alerts.length === 0 ? (
          <Card className="bg-zinc-900/40 border-white/5 p-12 text-center">
            <Crosshair size={32} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No detections match the current filters.</p>
            <button onClick={handleInject} className="mt-4 px-4 py-2 bg-zinc-800 text-white text-[13px] rounded-lg hover:bg-zinc-700 transition-colors">
              Inject Test Detection
            </button>
          </Card>
        ) : (
          <AnimatePresence mode="popLayout">
            {alerts.map((alert, i) => (
              <AlertCard key={alert.id} alert={alert} index={i} />
            ))}
          </AnimatePresence>
        )}
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan-line {
          animation: scan-line 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
