import { useEffect, useState, useCallback } from 'react';
import { fetchObjectAlerts, injectDetection, ObjectAlert } from '@/services/api/object-alerts';
import { fetchMultimodalCorrelations, simulateAudioEvent, MultimodalCorrelation } from '@/services/api/multimodal';
import { useTelemetrySocket } from '@/hooks/use-telemetry-socket';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crosshair, Zap, Filter, RefreshCw, AlertTriangle,
  Camera, Clock, Eye, Radio, Volume2, Sparkles, ShieldAlert,
  Flame, Bell, Activity, CheckCircle2
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

function MultimodalCard({ item, index }: { item: MultimodalCorrelation; index: number }) {
  const ts = item.timestamp ? new Date(item.timestamp) : null;
  const timeStr = ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
  const combinedPct = Math.round((item.combined_confidence || 0.8) * 100);
  const isCorrelated = item.visual_event_type !== null;

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`p-4 rounded-xl border transition-all ${
        item.severity === 'critical'
          ? 'bg-red-950/20 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
          : 'bg-zinc-900/60 border-purple-500/20 hover:border-purple-500/40'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white tracking-wide">
                {item.incident_type.replace(/_/g, ' ').toUpperCase()}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] uppercase px-1.5 py-0 ${
                  item.severity === 'critical'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {item.severity}
              </Badge>
              {isCorrelated ? (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={10} /> Correlated (A+V)
                </span>
              ) : (
                <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Volume2 size={10} /> Acoustic Only
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-3 font-mono">
              <span>Node: {item.camera_id || 'Unknown'}</span>
              <span>•</span>
              <span>{timeStr}</span>
            </div>
          </div>
        </div>

        {/* Combined Confidence Score */}
        <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Synergy Confidence</div>
            <div className="text-sm font-bold font-mono text-purple-400">{combinedPct}%</div>
          </div>
          <div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500" style={{ width: `${combinedPct}%` }} />
          </div>
        </div>
      </div>

      {/* Modality Fusion Breakdown Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 my-2.5">
        <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 size={14} className="text-purple-400" />
            <div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase">Acoustic Signal</div>
              <div className="text-[12px] font-semibold text-white">{item.audio_event_type.replace(/_/g, ' ')}</div>
            </div>
          </div>
          <span className="text-[11px] font-mono font-medium text-purple-300">
            {Math.round((item.audio_confidence || 0.85) * 100)}%
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={14} className={item.visual_event_type ? "text-cyan-400" : "text-muted-foreground"} />
            <div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase">Visual Detection Match</div>
              <div className="text-[12px] font-semibold text-white">
                {item.visual_event_type ? item.visual_event_type.replace(/_/g, ' ') : 'No concurrent visual subject'}
              </div>
            </div>
          </div>
          {item.visual_confidence !== null && item.visual_confidence !== undefined && (
            <span className="text-[11px] font-mono font-medium text-cyan-300">
              {Math.round(item.visual_confidence * 100)}%
            </span>
          )}
        </div>
      </div>

      {item.justification && (
        <p className="text-[11px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-white/5 mt-2 leading-relaxed">
          {item.justification}
        </p>
      )}
    </motion.div>
  );
}

export function ObjectAlertsPage() {
  const [activeTab, setActiveTab] = useState<'visual' | 'multimodal'>('visual');
  const [alerts, setAlerts] = useState<ObjectAlert[]>([]);
  const [correlations, setCorrelations] = useState<MultimodalCorrelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [threatOnly, setThreatOnly] = useState(false);
  const [minConf, setMinConf] = useState(0);
  const [injecting, setInjecting] = useState(false);
  const [liveMode, setLiveMode] = useState(true);
  const [simulatingAudio, setSimulatingAudio] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, weapons: 0, threats: 0, multimodal: 0 });

  const load = useCallback(async () => {
    try {
      const [visualData, multiData] = await Promise.all([
        fetchObjectAlerts({ threat_only: threatOnly, min_confidence: minConf, limit: 60 }),
        fetchMultimodalCorrelations(30).catch(() => []),
      ]);
      setAlerts(visualData);
      setCorrelations(multiData);
      setStats({
        total: visualData.length,
        weapons: visualData.filter(a => a.is_weapon).length,
        threats: visualData.filter(a => a.is_threat).length,
        multimodal: multiData.length,
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

  // Live polling fallback
  useEffect(() => {
    if (!liveMode) return;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [liveMode, load]);

  // Real-time WebSocket listener
  const handleWsEvent = useCallback((event: { type: string; data: any }) => {
    if (event.type === 'MULTIMODAL_EVENT' || event.type === 'NEW_INCIDENT') {
      load();
    }
  }, [load]);

  useTelemetrySocket(handleWsEvent);

  const handleInject = async () => {
    setInjecting(true);
    try {
      await injectDetection();
      await load();
    } finally {
      setInjecting(false);
    }
  };

  const handleSimulateAudio = async (eventType: string) => {
    setSimulatingAudio(eventType);
    try {
      await simulateAudioEvent({ event_type: eventType, camera_id: 'cam-1', confidence: 0.92 });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulatingAudio(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-red-400 uppercase tracking-widest">Live Security Feed</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Crosshair size={22} className="text-red-500" />
            Object & Multimodal Alerts
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Visual YOLO tracking fused with real-time acoustic event detection (Audio + Video Multimodal Fusion).
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
            Inject Visual Test
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Visual Detections', value: stats.total, color: 'text-white', icon: <Eye size={16} /> },
          { label: 'Threat Class', value: stats.threats, color: 'text-orange-400', icon: <AlertTriangle size={16} /> },
          { label: 'Weapons', value: stats.weapons, color: 'text-red-400', icon: <Crosshair size={16} /> },
          { label: 'Multimodal Correlated', value: stats.multimodal, color: 'text-purple-400', icon: <Sparkles size={16} /> },
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

      {/* Interactive Demo Audio Trigger Bar */}
      <Card className="bg-zinc-900/50 border-purple-500/20 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Volume2 className="text-purple-400" size={18} />
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                Acoustic Event Trigger Bar
                <span className="text-[9px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded font-bold">
                  DEMO / SIMULATED
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Inject test acoustic signatures to trigger real-time Multimodal Audio + Video Fusion on active nodes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'glass_break', label: '⚡ Glass Break', color: 'hover:bg-red-500/20 text-red-300 border-red-500/30' },
              { id: 'scream_aggression', label: '⚡ Scream / Distress', color: 'hover:bg-amber-500/20 text-amber-300 border-amber-500/30' },
              { id: 'loud_impact', label: '⚡ Loud Impact', color: 'hover:bg-blue-500/20 text-blue-300 border-blue-500/30' },
              { id: 'alarm_siren', label: '⚡ Siren / Alarm', color: 'hover:bg-purple-500/20 text-purple-300 border-purple-500/30' },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => handleSimulateAudio(btn.id)}
                disabled={simulatingAudio !== null}
                className={`px-3 py-1.5 bg-zinc-900/80 border rounded-lg text-[11px] font-medium transition-all ${btn.color} disabled:opacity-50`}
              >
                {simulatingAudio === btn.id ? 'Injecting...' : btn.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('visual')}
          className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'visual'
              ? 'bg-white/10 text-white border border-white/15'
              : 'text-muted-foreground hover:text-white'
          }`}
        >
          <Crosshair size={14} />
          Visual YOLO Detections ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab('multimodal')}
          className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'multimodal'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
              : 'text-muted-foreground hover:text-white'
          }`}
        >
          <Sparkles size={14} className="text-purple-400" />
          Multimodal & Audio Correlations ({correlations.length})
        </button>
      </div>

      {activeTab === 'visual' ? (
        <>
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
                  <option key={v} value={v} className="bg-zinc-900 text-white">
                    {v === 0 ? 'Any' : `≥${(v * 100).toFixed(0)}%`}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[12px] text-muted-foreground ml-auto">
              {alerts.length} result{alerts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Visual Alert feed */}
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
        </>
      ) : (
        /* Multimodal Feed */
        <div className="space-y-3">
          {correlations.length === 0 ? (
            <Card className="bg-zinc-900/40 border-white/5 p-12 text-center">
              <Sparkles size={32} className="text-purple-400/40 mx-auto mb-3" />
              <p className="text-white font-medium text-sm">No multimodal events registered yet.</p>
              <p className="text-muted-foreground text-xs mt-1">
                Click one of the Acoustic Event triggers above or run the audio pipeline to test.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {correlations.map((item, i) => (
                <MultimodalCard key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </div>
      )}

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