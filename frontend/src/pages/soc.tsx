import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Terminal, Shield, Radio, AlertTriangle, MapPin, Target,
  Crosshair, ChevronDown, CheckCircle, Zap, Loader2, Play,
} from 'lucide-react';
import { fetchSecurityEvents, SecurityEvent } from '@/services/api/security-events';
import { fetchIncidents, Incident } from '@/services/api/incidents';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AnimatePresence, motion } from 'framer-motion';
import { useTelemetrySocket } from '@/hooks/use-telemetry-socket';
import { getAuthHeaders } from '@/services/api/auth';

// Fix for default leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const threatIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div><div class="w-3 h-3 bg-red-500 rounded-full border-2 border-white absolute top-0 left-0 shadow-[0_0_10px_red]"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const API_BASE = 'http://127.0.0.1:8000/api/v1';

const SCENARIOS = [
  { id: 'brute_force',     label: 'Brute Force',     mitre: 'T1110',        color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20' },
  { id: 'apt',             label: 'APT Chain',        mitre: 'T1190→T1020',  color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20' },
  { id: 'physical_breach', label: 'Physical Breach',  mitre: 'Physical',     color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20' },
  { id: 'exfiltration',    label: 'Data Exfil',       mitre: 'T1020',        color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20' },
  { id: 'ransomware',      label: 'Ransomware',       mitre: 'T1486',        color: 'text-red-500',    bg: 'bg-red-600/10 border-red-600/20 hover:bg-red-600/20' },
  { id: 'insider_threat',  label: 'Insider Threat',   mitre: 'T1078',        color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20' },
  { id: 'all',             label: 'ALL SCENARIOS',    mitre: 'Full Coverage', color: 'text-white',      bg: 'bg-white/5 border-white/20 hover:bg-white/10' },
];

interface StageLog {
  id: string;
  stage: string;
  detail: string;
  severity: string;
  timestamp: string;
}

const STAGE_COLOR: Record<string, string> = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  warn:     'text-yellow-400',
  medium:   'text-yellow-400',
  ok:       'text-emerald-400',
  info:     'text-sky-400',
};

export function SocCenterPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [simScenario, setSimScenario] = useState<string | null>(null);
  const [stageLogs, setStageLogs] = useState<StageLog[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  const threatLocations = [
    { id: 1, lat: 40.7128, lng: -74.0060, desc: 'Brute Force Attempt' },
    { id: 2, lat: 51.5074, lng: -0.1278,  desc: 'Malware Download' },
    { id: 3, lat: 35.6762, lng: 139.6503, desc: 'Suspicious Login' },
  ];

  const loadData = useCallback(async () => {
    try {
      const [evts, incs] = await Promise.all([fetchSecurityEvents(), fetchIncidents()]);
      setEvents(evts);
      setActiveIncidents(incs.filter(i => i.status === 'detected' || i.status === 'in_progress').slice(0, 8));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleWsEvent = useCallback((event: { type: string; data: any }) => {
    if (event.type === 'SIMULATION_STAGE') {
      setStageLogs(prev => [...prev, { id: crypto.randomUUID(), ...event.data }]);
      if (event.data.stage === 'SIMULATION_END') { setSimRunning(false); loadData(); }
    }
    if (event.type === 'NEW_INCIDENT' || event.type === 'NEW_SECURITY_EVENT') { loadData(); }
  }, [loadData]);

  useTelemetrySocket(handleWsEvent);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [stageLogs]);

  const triggerSimulation = async (scenarioId: string) => {
    if (simRunning) return;
    setSimRunning(true); setSimScenario(scenarioId); setStageLogs([]);
    try {
      const res = await fetch(`${API_BASE}/simulate/attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ scenario: scenarioId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStageLogs([{ id: '0', stage: 'ERROR', detail: err.detail || 'Failed', severity: 'critical', timestamp: new Date().toISOString() }]);
        setSimRunning(false);
      }
    } catch {
      setStageLogs([{ id: '0', stage: 'ERROR', detail: 'Backend unreachable', severity: 'critical', timestamp: new Date().toISOString() }]);
      setSimRunning(false);
    }
  };

  const handleAction = (eventId: number, action: string) => {
    alert(`Action "${action}" triggered for event ID: ${eventId}`);
    setActiveDropdown(null);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-red-500 flex items-center gap-2">
            <Radio className="animate-pulse" size={24} /> SOC Command Center
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px]">Real-time security operations, threat mapping, and attack simulation.</p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className={`w-1.5 h-1.5 rounded-full ${simRunning ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
          {simRunning ? `Running: ${simScenario?.replace(/_/g, ' ').toUpperCase()}` : 'Monitoring Active'}
        </div>
      </div>

      {/* Attack Simulation Engine */}
      <Card className="bg-zinc-900/40 border-red-500/10">
        <CardHeader className="pb-2 border-b border-white/5">
          <CardTitle className="flex items-center gap-2 text-[14px] font-medium text-white">
            <Zap size={16} className="text-red-500" /> Attack Simulation Engine
            {simRunning && (
              <span className="ml-auto flex items-center gap-1.5 text-[11px] text-red-400 font-normal">
                <Loader2 size={12} className="animate-spin" /> Simulation in progress...
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => triggerSimulation(s.id)}
                disabled={simRunning}
                className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${s.bg}`}
              >
                <div className={`flex items-center gap-1.5 text-[12px] font-semibold ${s.color}`}>
                  <Play size={10} /> {s.label}
                </div>
                <span className="text-[10px] text-zinc-600 font-mono mt-0.5">{s.mitre}</span>
              </button>
            ))}
          </div>

          {/* Live terminal */}
          <div ref={terminalRef} className="bg-[#050507] border border-white/5 rounded-lg font-mono text-[11px] h-32 overflow-y-auto p-3 space-y-0.5 custom-scrollbar">
            {stageLogs.length === 0 ? (
              <div className="text-zinc-600 flex items-center gap-2 h-full">
                <Terminal size={14} />
                <span>Select a scenario above to start a real attack simulation...</span>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {stageLogs.map(log => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-start gap-2"
                  >
                    <span className="text-zinc-600 flex-shrink-0">[{new Date(log.timestamp).toISOString().split('T')[1].slice(0, 8)}]</span>
                    <span className="text-zinc-500 flex-shrink-0 w-24 truncate">[{log.stage}]</span>
                    <span className={STAGE_COLOR[log.severity] || 'text-zinc-300'}>{log.detail}</span>
                  </motion.div>
                ))}
                {simRunning && (
                  <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity }} className="text-red-500">█</motion.span>
                )}
              </AnimatePresence>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: Map + IOC */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-zinc-900/40 border-white/5 h-[280px] flex flex-col relative overflow-hidden">
            <CardHeader className="pb-2 border-b border-white/5 bg-zinc-900/80 absolute top-0 w-full z-[400]">
              <CardTitle className="flex items-center gap-2 text-[14px] font-medium text-white">
                <MapPin size={16} className="text-red-500" /> Global Threat Map
              </CardTitle>
            </CardHeader>
            <div className="flex-1 w-full h-full relative z-0 pt-10">
              <MapContainer center={[20, 0]} zoom={1} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" />
                {threatLocations.map(threat => (
                  <Marker key={threat.id} position={[threat.lat, threat.lng]} icon={threatIcon}>
                    <Popup><div className="text-xs font-semibold text-red-500">{threat.desc}</div></Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Card>
          <Card className="bg-zinc-900/40 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[14px] font-medium text-white">
                <Target size={16} className="text-muted-foreground" /> IOC Scoring
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-4">
                {[
                  { label: 'Network Risk', value: 72, color: 'bg-amber-500', tc: 'text-amber-500' },
                  { label: 'Endpoint Risk', value: 89, color: 'bg-red-500', tc: 'text-red-500' },
                  { label: 'Identity Risk', value: 14, color: 'bg-emerald-500', tc: 'text-emerald-500' },
                ].map(({ label, value, color, tc }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={`${tc} font-mono`}>{value}/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle: Event Stream */}
        <Card className="bg-zinc-900/40 border-white/5 lg:col-span-2 flex flex-col">
          <CardHeader className="pb-2 border-b border-white/5">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[14px] font-medium text-white">
                <Terminal size={16} className="text-muted-foreground" /> Live Event Stream
              </CardTitle>
              <span className="text-[11px] text-muted-foreground">{events.length} events</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 bg-[#09090b] m-4 rounded-md p-0 font-mono text-[11px] overflow-hidden relative border border-white/5 shadow-inner">
            <div className="divide-y divide-white/5 h-72 overflow-y-auto custom-scrollbar">
              {events.length === 0 ? (
                <div className="text-center py-4 opacity-50">No security events. Run a simulation above!</div>
              ) : (
                events.map(evt => (
                  <div key={evt.id} className="p-3 hover:bg-white/[0.02] transition-colors flex items-start justify-between group">
                    <div className={`flex items-start gap-3 ${evt.severity === 'critical' || evt.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`}>
                      <span className="opacity-50 mt-0.5 flex-shrink-0">[{new Date(evt.timestamp).toISOString().split('T')[1].replace('Z', '')}]</span>
                      <div className="flex-1 min-w-0">
                        <span className="opacity-75 mr-2">[{evt.mitre_technique_id || 'UNK'}]</span>
                        <span>{evt.event_type.toUpperCase()}: {evt.target_username ? `Target=${evt.target_username} ` : ''}{evt.description}</span>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0">
                      <button onClick={() => setActiveDropdown(activeDropdown === evt.id ? null : evt.id)} className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px] flex items-center gap-1 transition-all border border-white/10 ml-2 whitespace-nowrap">
                        Action <ChevronDown size={10} />
                      </button>
                      <AnimatePresence>
                        {activeDropdown === evt.id && (
                          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute right-0 top-full mt-1 w-32 bg-zinc-900 border border-white/10 rounded-md shadow-xl py-1 z-50 text-[10px] text-left">
                            <button onClick={() => handleAction(evt.id, 'Investigate')} className="w-full px-3 py-1.5 text-left text-white hover:bg-white/10 flex items-center gap-2"><Crosshair size={12} /> Investigate</button>
                            <button onClick={() => handleAction(evt.id, 'Block IP')} className="w-full px-3 py-1.5 text-left text-red-400 hover:bg-white/10 flex items-center gap-2"><Shield size={12} /> Block IP</button>
                            <button onClick={() => handleAction(evt.id, 'Dismiss')} className="w-full px-3 py-1.5 text-left text-muted-foreground hover:bg-white/10 flex items-center gap-2"><CheckCircle size={12} /> Dismiss</button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Incidents + Analysts */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="bg-zinc-900/40 border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50" />
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="flex items-center justify-between text-[14px] font-medium text-white">
                <div className="flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Active Incidents</div>
                <span className="bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded text-[10px] font-bold">{activeIncidents.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 p-0">
              <div className="divide-y divide-white/5 max-h-64 overflow-y-auto custom-scrollbar">
                {activeIncidents.length > 0 ? activeIncidents.map(inc => (
                  <div key={inc.id} className="p-3 hover:bg-white/[0.02] transition-colors cursor-pointer group">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[12px] font-semibold text-white truncate">{inc.type.replace(/_/g, ' ')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ml-1 ${inc.severity === 'critical' ? 'bg-red-500/20 text-red-400' : inc.severity === 'high' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{inc.severity}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{inc.camera_id || 'System'}</div>
                  </div>
                )) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">No active incidents</div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900/40 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[14px] font-medium text-white">
                <Shield size={16} className="text-muted-foreground" /> Analysts on Duty
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {['Gokul (Lead)', 'Alex M.', 'Sarah K.'].map(name => (
                <div key={name} className="flex items-center justify-between p-2 rounded-md bg-white/[0.02] border border-white/5">
                  <span className="text-[13px] font-medium text-white">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Active</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
