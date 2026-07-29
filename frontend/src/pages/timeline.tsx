import { useEffect, useState, useRef } from 'react';
import { fetchCases, fetchCaseTimeline, Case, CaseTimelineEvent } from '@/services/api/cases';
import { fetchIncidents } from '@/services/api/incidents';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipForward, SkipBack, Clock, AlertTriangle,
  Camera, Zap, Shield, ChevronDown, X, Film, Radio,
  RefreshCw, Rewind,
} from 'lucide-react';

type EventType = 'detection' | 'case_created' | 'acknowledged' | 'resolved' | 'playbook' | 'anomaly';

interface TimelineEvent {
  id: string;
  type: EventType;
  label: string;
  severity: string;
  camera_id?: string;
  timestamp: string;
  source: string;
}

const EVENT_COLORS: Record<EventType, { bg: string; border: string; dot: string; text: string }> = {
  detection:    { bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-500',    text: 'text-red-400' },
  case_created: { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   dot: 'bg-blue-500',   text: 'text-blue-400' },
  acknowledged: { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  dot: 'bg-amber-500',  text: 'text-amber-400' },
  resolved:     { bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',dot: 'bg-emerald-500',text: 'text-emerald-400' },
  playbook:     { bg: 'bg-purple-500/10', border: 'border-purple-500/30', dot: 'bg-purple-500', text: 'text-purple-400' },
  anomaly:      { bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500', text: 'text-orange-400' },
};

function eventIcon(type: EventType) {
  switch (type) {
    case 'detection':    return <AlertTriangle size={12} />;
    case 'case_created': return <Shield size={12} />;
    case 'acknowledged': return <Clock size={12} />;
    case 'resolved':     return <Shield size={12} />;
    case 'playbook':     return <Zap size={12} />;
    case 'anomaly':      return <Radio size={12} />;
  }
}

function CameraFeedPlaceholder({ cameraId, timestamp, isPlaying }: {
  cameraId: string | null;
  timestamp: string | null;
  isPlaying: boolean;
}) {
  return (
    <div className="relative w-full aspect-video bg-zinc-950 rounded-xl overflow-hidden border border-white/5">
      {/* Grid background */}
      <div className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* Scan line */}
      {isPlaying && (
        <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-bounce" style={{ animationDuration: '2s' }} />
      )}

      {/* Camera icon */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className={`p-5 rounded-2xl border ${isPlaying ? 'bg-blue-500/10 border-blue-500/20' : 'bg-zinc-900/50 border-white/5'}`}>
          <Film size={40} className={isPlaying ? 'text-blue-400' : 'text-muted-foreground/30'} />
        </div>
        <div className="text-center">
          <div className="text-[13px] font-semibold text-white">{cameraId || 'No Camera Selected'}</div>
          {timestamp && (
            <div className="text-[11px] text-muted-foreground mt-1">
              {new Date(timestamp).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Status overlays */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        {isPlaying ? (
          <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 rounded-md px-2 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">REC</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-white/10 rounded-md px-2 py-1">
            <Pause size={10} className="text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">PAUSED</span>
          </div>
        )}
      </div>

      {cameraId && (
        <div className="absolute top-3 right-3 bg-zinc-900/80 border border-white/10 rounded-md px-2 py-1">
          <span className="text-[10px] font-mono text-muted-foreground">{cameraId}</span>
        </div>
      )}

      {timestamp && (
        <div className="absolute bottom-3 right-3 bg-black/60 rounded-md px-2 py-1">
          <span className="text-[11px] font-mono text-cyan-400">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

export function TimelinePage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadIdx, setPlayheadIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const playInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchCases()
      .then(data => { setCases(data); if (data.length > 0) setSelectedCase(data[0]); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCase) return;
    setLoadingEvents(true);
    fetchCaseTimeline(selectedCase.id)
      .then(data => {
        const evs: TimelineEvent[] = data.events.map((e, i) => ({
          id: `ev-${i}`,
          type: (e.event_type as EventType) || 'detection',
          label: e.label,
          severity: e.severity,
          camera_id: e.camera_id,
          timestamp: e.timestamp || new Date().toISOString(),
          source: e.source,
        }));
        setEvents(evs);
        setPlayheadIdx(0);
        setSelectedEvent(evs[0] || null);
      })
      .catch(console.error)
      .finally(() => setLoadingEvents(false));
    setIsPlaying(false);
  }, [selectedCase]);

  // Playback engine
  useEffect(() => {
    if (!isPlaying) {
      if (playInterval.current) clearInterval(playInterval.current);
      return;
    }
    playInterval.current = setInterval(() => {
      setPlayheadIdx(prev => {
        const next = prev + 1;
        if (next >= events.length) {
          setIsPlaying(false);
          return prev;
        }
        setSelectedEvent(events[next]);
        return next;
      });
    }, 1500);
    return () => { if (playInterval.current) clearInterval(playInterval.current); };
  }, [isPlaying, events]);

  const jumpTo = (idx: number) => {
    setPlayheadIdx(idx);
    setSelectedEvent(events[idx]);
  };

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-5.5rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Film size={22} className="text-cyan-400" />
            Timeline Investigation
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Scrubbable incident timeline with footage sync and event replay.
          </p>
        </div>

        {/* Case selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedCase?.id || ''}
              onChange={e => {
                const c = cases.find(c => c.id === e.target.value);
                setSelectedCase(c || null);
              }}
              className="pl-3 pr-8 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[13px] text-white focus:outline-none focus:border-white/20 appearance-none w-64"
            >
              {loading ? <option>Loading...</option> : (
                cases.length === 0
                  ? <option value="">No cases available</option>
                  : cases.map(c => <option key={c.id} value={c.id}>{c.title.slice(0, 40)}</option>)
              )}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main layout: feed + panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Camera feed + controls */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <CameraFeedPlaceholder
            cameraId={selectedEvent?.camera_id || null}
            timestamp={selectedEvent?.timestamp || null}
            isPlaying={isPlaying}
          />

          {/* Playback controls */}
          <Card className="bg-zinc-900/40 border-white/5 p-4">
            <div className="flex items-center justify-center gap-4 mb-4">
              <button onClick={() => jumpTo(Math.max(0, playheadIdx - 1))} className="p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-white transition-colors">
                <SkipBack size={18} />
              </button>
              <button
                onClick={() => setIsPlaying(p => !p)}
                className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-100 transition-colors shadow-lg"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button onClick={() => jumpTo(Math.min(events.length - 1, playheadIdx + 1))} className="p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-white transition-colors">
                <SkipForward size={18} />
              </button>
            </div>

            {/* Timeline scrubber */}
            {events.length > 0 ? (
              <div className="relative">
                <div className="h-8 bg-zinc-950 rounded-lg overflow-x-auto flex items-center px-2 gap-1 relative">
                  {events.map((ev, i) => {
                    const colors = EVENT_COLORS[ev.type] || EVENT_COLORS.detection;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => jumpTo(i)}
                        className={`flex-shrink-0 w-5 h-5 rounded-sm border transition-all hover:scale-110 ${colors.dot} ${
                          i === playheadIdx ? 'ring-2 ring-white/50 scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                        title={ev.label}
                      />
                    );
                  })}
                  {/* Playhead marker */}
                  {events.length > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-white/80 pointer-events-none transition-all"
                      style={{ left: `${((playheadIdx / Math.max(events.length - 1, 1)) * 100)}%` }}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground/50 font-mono">
                  <span>{events[0]?.timestamp ? new Date(events[0].timestamp).toLocaleTimeString() : ''}</span>
                  <span className="text-center">Event {playheadIdx + 1} of {events.length}</span>
                  <span>{events[events.length - 1]?.timestamp ? new Date(events[events.length - 1].timestamp).toLocaleTimeString() : ''}</span>
                </div>
              </div>
            ) : (
              <div className="text-[12px] text-muted-foreground text-center py-2">
                {loadingEvents ? 'Loading events...' : 'No events in this case.'}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {(Object.entries(EVENT_COLORS) as [EventType, typeof EVENT_COLORS[EventType]][]).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-sm ${colors.dot}`} />
                  <span className="text-[10px] text-muted-foreground capitalize">{type.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Event log */}
        <div className="w-72 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-white">Event Log</span>
            <span className="text-[11px] text-muted-foreground">{events.length} events</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loadingEvents ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-zinc-900/40 border border-white/5 rounded-lg animate-pulse" />
              ))
            ) : events.length === 0 ? (
              <div className="text-[12px] text-muted-foreground text-center py-8">Select a case to view events.</div>
            ) : (
              events.map((ev, i) => {
                const colors = EVENT_COLORS[ev.type] || EVENT_COLORS.detection;
                const isActive = i === playheadIdx;
                return (
                  <motion.button
                    key={ev.id}
                    onClick={() => jumpTo(i)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isActive
                        ? `${colors.bg} ${colors.border}`
                        : 'bg-zinc-900/40 border-white/5 hover:border-white/10'
                    }`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <div className={`flex items-center gap-2 mb-1 ${isActive ? colors.text : 'text-muted-foreground'}`}>
                      {eventIcon(ev.type)}
                      <span className="text-[11px] font-semibold capitalize">{ev.type.replace('_', ' ')}</span>
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                    </div>
                    <p className="text-[12px] text-white line-clamp-1">{ev.label}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </p>
                  </motion.button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
