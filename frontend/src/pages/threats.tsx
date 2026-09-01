import React, { useState, useEffect, useMemo } from 'react';
import { 
  fetchThreatOverview, 
  fetchThreatEvents, 
  fetchThreatPredictions, 
  fetchThreatTrends,
  runPredictiveDemo,
  ThreatOverview,
  ThreatEvent,
  ThreatPrediction,
  ThreatTrend
} from '@/services/api/threat-intel';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayerGroup, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, Activity, ShieldAlert, Crosshair, 
  TrendingUp, TrendingDown, Minus, Play, Clock, 
  ChevronRight, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Fix for default leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createIcon = (color: string, size = 16, glow = false) =>
  L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;box-shadow:0 0 ${glow ? 20 : 8}px ${color}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });

function riskColor(risk: number): string {
  if (risk >= 75) return '#ef4444'; // Critical
  if (risk >= 50) return '#f97316'; // High
  if (risk >= 25) return '#eab308'; // Medium
  return '#22c55e'; // Low
}

function riskLabel(risk: number): string {
  if (risk >= 75) return 'CRITICAL';
  if (risk >= 50) return 'HIGH';
  if (risk >= 25) return 'MEDIUM';
  return 'LOW';
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'INCREASING') return <TrendingUp size={14} className="text-red-400" />;
  if (trend === 'DECREASING') return <TrendingDown size={14} className="text-emerald-400" />;
  return <Minus size={14} className="text-zinc-400" />;
}

export function ThreatIntelPage() {
  const [overview, setOverview] = useState<ThreatOverview | null>(null);
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [predictions, setPredictions] = useState<ThreatPrediction[]>([]);
  const [trends, setTrends] = useState<ThreatTrend[]>([]);
  
  const [mapMode, setMapMode] = useState<'LIVE' | 'HISTORICAL' | 'PREDICTIVE'>('LIVE');
  const [selectedRegion, setSelectedRegion] = useState<ThreatPrediction | null>(null);
  const [runningDemo, setRunningDemo] = useState(false);
  const [demoPhase, setDemoPhase] = useState(0); // 0=idle, 1=analyzing, 2=calculating, 3=generating, 4=done

  const loadData = async () => {
    try {
      const [o, e, p, t] = await Promise.all([
        fetchThreatOverview(),
        fetchThreatEvents(),
        fetchThreatPredictions(),
        fetchThreatTrends()
      ]);
      setOverview(o);
      setEvents(e);
      setPredictions(p);
      setTrends(t);
    } catch (err) {
      console.error("Error loading intel data", err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleRunDemo = async () => {
    setRunningDemo(true);
    setMapMode('LIVE');
    setDemoPhase(1); // Analyzing Global Telemetry
    await new Promise(r => setTimeout(r, 2000));
    setDemoPhase(2); // Calculating Regional Risk
    await new Promise(r => setTimeout(r, 3000));
    setDemoPhase(3); // Generating Predictions
    
    try {
      const res = await runPredictiveDemo();
      setPredictions(res.predictions);
      // Reload other data to reflect new state
      const [o, e, t] = await Promise.all([fetchThreatOverview(), fetchThreatEvents(), fetchThreatTrends()]);
      setOverview(o); setEvents(e); setTrends(t);
    } catch (e) {
      console.error(e);
    }
    
    await new Promise(r => setTimeout(r, 2500));
    setMapMode('PREDICTIVE');
    setDemoPhase(4);
    await new Promise(r => setTimeout(r, 1000));
    setRunningDemo(false);
    setDemoPhase(0);
  };

  const handleSimulateResponse = () => {
    // In a real app, this would route to SOAR or trigger a modal
    alert(`Triggering SOAR simulation for ${selectedRegion?.region}`);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-8rem)] flex flex-col relative z-0">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="text-blue-500" /> PREDICTIVE THREAT INTELLIGENCE
          </h1>
          <p className="text-muted-foreground text-[13px] mt-0.5">
            AI-powered geographic threat analysis and risk forecasting.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 h-8 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-md text-[12px] font-mono tracking-widest">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            PREDICTION ENGINE ONLINE
          </div>
          <button
            onClick={handleRunDemo}
            disabled={runningDemo}
            className="flex items-center gap-2 px-4 h-8 bg-white text-black hover:bg-zinc-200 rounded-md text-[12px] font-semibold transition-colors disabled:opacity-50"
          >
            <Play size={14} fill="currentColor" /> RUN PREDICTIVE DEMO
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
        <Card className="bg-zinc-900/60 border-white/5 p-3 flex flex-col justify-between">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Global Threats</div>
          <div className="text-2xl font-bold text-white">{overview?.global_threats || '--'}</div>
        </Card>
        <Card className="bg-zinc-900/60 border-white/5 p-3 flex flex-col justify-between">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Active Threats</div>
          <div className="text-2xl font-bold text-amber-400">{overview?.active_threats || '--'}</div>
        </Card>
        <Card className="bg-zinc-900/60 border-white/5 p-3 flex flex-col justify-between">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">High-Risk Regions</div>
          <div className="text-2xl font-bold text-red-400">{overview?.high_risk_regions || '--'}</div>
        </Card>
        <Card className="bg-zinc-900/60 border-white/5 p-3 flex flex-col justify-between">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Predicted Threats</div>
          <div className="text-2xl font-bold text-purple-400">{overview?.predicted_threats || '--'}</div>
        </Card>
        <Card className="bg-zinc-900/60 border-white/5 p-3 flex flex-col justify-between">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Risk Trend</div>
          <div className="text-2xl font-bold text-white flex items-center gap-1">
            {overview?.risk_trend || '--'} <TrendingUp size={16} className="text-red-400" />
          </div>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-4 flex-1 min-h-0">
        
        {/* Left Side: Live Feed & Top Regions */}
        <div className="w-72 shrink-0 flex flex-col gap-4">
          <Card className="bg-zinc-900/40 border-white/5 flex-1 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-white/5 text-[11px] font-bold text-white tracking-widest uppercase flex items-center gap-2">
              <Activity size={14} className="text-emerald-400" /> LIVE THREAT FEED
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {events.map(evt => (
                <div key={evt.id} className="border-l-2 border-white/10 pl-3">
                  <div className="text-[10px] font-mono text-muted-foreground mb-1">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </div>
                  <div className={`text-[12px] font-medium ${evt.severity === 'critical' ? 'text-red-400' : evt.severity === 'high' ? 'text-amber-400' : 'text-white'}`}>
                    {evt.description}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{evt.region}</div>
                </div>
              ))}
            </div>
          </Card>
          
          <Card className="bg-zinc-900/40 border-white/5 h-1/3 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-white/5 text-[11px] font-bold text-white tracking-widest uppercase flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" /> TOP PREDICTED RISK
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {predictions.slice(0, 5).map((p, i) => (
                <div key={p.id} onClick={() => setSelectedRegion(p)} className="flex items-center justify-between p-2 hover:bg-white/5 rounded cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">{i+1}.</span>
                    <span className="text-[12px] font-medium text-white">{p.region}</span>
                  </div>
                  <span className="text-[12px] font-bold font-mono" style={{ color: riskColor(p.predicted_risk) }}>
                    {p.predicted_risk}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Center: Map */}
        <Card className="bg-zinc-950 border-white/5 flex-1 relative overflow-hidden rounded-xl shadow-2xl flex flex-col">
          {/* Map Modes */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex bg-black/60 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-2xl">
            {(['LIVE', 'HISTORICAL', 'PREDICTIVE'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setMapMode(mode)}
                disabled={runningDemo}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest transition-all ${mapMode === mode ? 'bg-white text-black' : 'text-muted-foreground hover:text-white'}`}
              >
                {mode}
              </button>
            ))}
          </div>

          <MapContainer
            center={[20, 0]}
            zoom={2.5}
            style={{ height: '100%', width: '100%', zIndex: 1, backgroundColor: '#09090b' }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
            
            {/* Heatmap & Markers */}
            <LayersControl position="topright">
              <LayersControl.Overlay checked name="Predictive Risk Zones">
                <LayerGroup>
                  {predictions.map(p => {
                    const activeRisk = mapMode === 'PREDICTIVE' ? p.predicted_risk : p.current_risk;
                    const color = riskColor(activeRisk);
                    const isVisible = mapMode === 'PREDICTIVE' || mapMode === 'LIVE';
                    if (!isVisible) return null;
                    
                    return (
                      <React.Fragment key={p.id}>
                        {mapMode === 'PREDICTIVE' && (
                          <>
                            <Circle center={[p.lat, p.lng]} radius={300000} pathOptions={{ color: 'transparent', fillColor: color, fillOpacity: 0.15 }} />
                            <Circle center={[p.lat, p.lng]} radius={100000} pathOptions={{ color: 'transparent', fillColor: color, fillOpacity: 0.3 }} />
                          </>
                        )}
                        <Marker 
                          position={[p.lat, p.lng]} 
                          icon={createIcon(color, activeRisk > 70 ? 16 : 12, activeRisk > 70)}
                          eventHandlers={{ click: () => setSelectedRegion(p) }}
                        />
                      </React.Fragment>
                    )
                  })}
                </LayerGroup>
              </LayersControl.Overlay>
            </LayersControl>
          </MapContainer>

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-3 text-[10px] font-mono text-muted-foreground">
            <div className="font-bold text-white mb-2 uppercase tracking-widest">{mapMode} RISK</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> CRITICAL (75-100)</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" /> HIGH (50-74)</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> MEDIUM (25-49)</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> LOW (0-24)</div>
            </div>
            {mapMode === 'PREDICTIVE' && (
              <div className="mt-3 text-[9px] text-yellow-500 border-t border-white/10 pt-2 leading-tight">
                AI ESTIMATE — NOT A CERTAINTY<br/>
                Predictions are model estimates based<br/>
                on telemetry and historical patterns.
              </div>
            )}
          </div>
          
          {/* Demo Overlay */}
          <AnimatePresence>
            {runningDemo && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[2000] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center font-mono text-center space-y-4"
              >
                <Crosshair size={48} className="text-blue-500 animate-spin-slow" />
                
                <div className={`text-lg transition-opacity ${demoPhase === 1 ? 'opacity-100 text-white' : 'opacity-0'}`}>
                  ANALYZING GLOBAL TELEMETRY...
                </div>
                <div className={`text-lg transition-opacity ${demoPhase === 2 ? 'opacity-100 text-amber-400' : 'opacity-0'} absolute`}>
                  CALCULATING REGIONAL RISK...
                </div>
                <div className={`text-lg transition-opacity ${demoPhase === 3 ? 'opacity-100 text-emerald-400' : 'opacity-0'} absolute`}>
                  GENERATING PREDICTIONS...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Right Side: Intelligence Panel */}
        <AnimatePresence>
          {selectedRegion && (
            <motion.div
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 320 }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="w-80 bg-zinc-900/80 border border-white/5 rounded-xl h-full flex flex-col overflow-y-auto backdrop-blur-md">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[18px] font-bold text-white uppercase tracking-wider">{selectedRegion.region}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">THREAT INTELLIGENCE</div>
                  </div>
                  <button onClick={() => setSelectedRegion(null)} className="text-muted-foreground hover:text-white"><Minus size={18} /></button>
                </div>

                <div className="p-4 space-y-6">
                  {/* Scores */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/30 rounded-lg p-3 border border-white/5 text-center">
                      <div className="text-[10px] text-muted-foreground mb-1">CURRENT RISK</div>
                      <div className="text-2xl font-bold font-mono text-white">{selectedRegion.current_risk}%</div>
                      <div className="text-[10px] font-bold mt-1" style={{ color: riskColor(selectedRegion.current_risk) }}>
                        {riskLabel(selectedRegion.current_risk)}
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3 border border-white/5 text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1" style={{ background: riskColor(selectedRegion.predicted_risk) }} />
                      <div className="text-[10px] text-muted-foreground mb-1">PREDICTED RISK</div>
                      <div className="text-2xl font-bold font-mono" style={{ color: riskColor(selectedRegion.predicted_risk) }}>{selectedRegion.predicted_risk}%</div>
                      <div className="text-[10px] font-bold mt-1" style={{ color: riskColor(selectedRegion.predicted_risk) }}>
                        {riskLabel(selectedRegion.predicted_risk)}
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-y-4 text-[11px] font-mono">
                    <div>
                      <div className="text-muted-foreground">MODEL CONFIDENCE</div>
                      <div className="text-white font-bold">{selectedRegion.confidence}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">TREND</div>
                      <div className="text-white font-bold flex items-center gap-1">
                        <TrendIcon trend={selectedRegion.trend} /> {selectedRegion.trend}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">PREDICTION WINDOW</div>
                      <div className="text-white font-bold">{selectedRegion.prediction_window}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">RECENT INCIDENTS</div>
                      <div className="text-white font-bold">{selectedRegion.incident_count || '--'}</div>
                    </div>
                  </div>

                  {/* Top Threats */}
                  <div>
                    <div className="text-[11px] font-bold text-white uppercase tracking-widest mb-2 border-b border-white/5 pb-1">Predicted Threat Types</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedRegion.threat_types.map(t => (
                        <Badge key={t} variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">{t}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <div className="text-[11px] font-bold text-white uppercase tracking-widest mb-2 border-b border-white/5 pb-1">AI Explanation</div>
                    <ul className="space-y-2">
                      {selectedRegion.contributing_features.map((f, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                          <span className="text-blue-400 mt-0.5">•</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action */}
                  <div className="pt-4 mt-auto">
                    <button 
                      onClick={handleSimulateResponse}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold tracking-widest uppercase transition-colors"
                    >
                      Run Response Simulation
                    </button>
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Chart */}
      <Card className="shrink-0 h-40 bg-zinc-900/40 border-white/5 p-3 flex flex-col">
        <div className="text-[11px] font-bold text-white tracking-widest uppercase flex items-center gap-2 mb-2">
          <Activity size={14} /> THREAT ACTIVITY TREND
        </div>
        <div className="flex-1 w-full text-[10px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <XAxis dataKey="time" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
              <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                itemStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
              />
              <Line type="monotone" dataKey="observed" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Observed" />
              <Line type="monotone" dataKey="predicted" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} name="Predicted" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <style>{`
        .leaflet-container { background: #09090b; }
        .custom-div-icon { background: transparent; border: none; }
      `}</style>
    </div>
  );
}
