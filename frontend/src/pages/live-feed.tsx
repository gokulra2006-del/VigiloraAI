import React, { useEffect, useState, useRef } from 'react';
import { fetchCameras, getCameraLiveStreamUrl, Camera } from '@/services/api/cameras';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Camera as CameraIcon, Maximize2, Settings, AlertCircle, Smartphone,
  Film, Laptop, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Plus, Minus, Move, Video, Eye, Radio, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AiOverlay } from '@/components/ui/ai-overlay';

const SourceIcon = ({ type, status }: { type?: string; status: string }) => {
  const statusColor =
    status === 'online' ? 'text-emerald-500' : status === 'degraded' ? 'text-yellow-500' : 'text-red-500';

  if (type === 'rtsp_phone') {
    return (
      <div className="relative shrink-0" title="Phone Stream (RTSP/HTTP)">
        <CameraIcon size={14} className={statusColor} />
        <Smartphone size={8} className="absolute -bottom-1 -right-1 text-white bg-[#18181b] rounded-sm" />
      </div>
    );
  }
  if (type === 'video_file') {
    return (
      <div className="relative shrink-0" title="Recorded Footage">
        <CameraIcon size={14} className={statusColor} />
        <Film size={8} className="absolute -bottom-1 -right-1 text-white bg-[#18181b] rounded-sm" />
      </div>
    );
  }
  if (type === 'webcam') {
    return (
      <div className="relative shrink-0" title="Local / USB Webcam">
        <CameraIcon size={14} className={statusColor} />
        <Laptop size={8} className="absolute -bottom-1 -right-1 text-white bg-[#18181b] rounded-sm" />
      </div>
    );
  }
  return (
    <div className="relative shrink-0" title="CCTV / Hardware Camera">
      <Video size={14} className={statusColor} />
    </div>
  );
};

export function LiveFeedPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [activePtz, setActivePtz] = useState<string | null>(null);
  const [fullscreenCam, setFullscreenCam] = useState<Camera | null>(null);
  const [directWebcamActive, setDirectWebcamActive] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const load = async () => {
    try {
      const cams = await fetchCameras();
      setCameras(cams);
    } catch (e) {
      console.error('Failed to load cameras', e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Direct browser webcam stream handler
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (directWebcamActive && localVideoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(s => {
          stream = s;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.warn('Browser webcam permission error:', err);
          setDirectWebcamActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [directWebcamActive]);

  const handlePtz = async (cameraId: string, action: string) => {
    console.log(`[PTZ] Camera ${cameraId} action: ${action}`);
    try {
      await fetch(`http://127.0.0.1:8000/api/v1/cameras/${cameraId}/ptz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch (e) {
      console.error('PTZ action failed', e);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest">
              Live Surveillance Grid
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Video className="text-cyan-400" size={22} />
            Live Camera Monitoring
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px]">
            Real-time visual feeds from all online cameras, webcams, and mobile streams.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setDirectWebcamActive(!directWebcamActive)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              directWebcamActive
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'bg-zinc-900 border-white/10 text-muted-foreground hover:text-white'
            }`}
          >
            <Laptop size={14} />
            {directWebcamActive ? 'Direct Webcam ON' : 'Direct Browser Cam'}
          </button>

          <div className="flex gap-1.5">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px] px-2 py-0.5">
              {cameras.filter(c => c.status === 'online').length} Online
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[11px] px-2 py-0.5">
              {cameras.filter(c => c.status === 'offline').length} Offline
            </Badge>
          </div>
        </div>
      </div>

      {/* Direct Browser Webcam Preview (if activated) */}
      {directWebcamActive && (
        <Card className="bg-zinc-900/60 border-cyan-500/30 overflow-hidden shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-sm font-bold text-white">Direct Local Laptop Webcam (HTML5 MediaStream)</span>
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] uppercase font-mono">
                0ms Latency
              </Badge>
            </div>
            <button
              onClick={() => setDirectWebcamActive(false)}
              className="text-xs text-muted-foreground hover:text-white bg-zinc-800 px-2 py-1 rounded"
            >
              Close
            </button>
          </div>
          <div className="aspect-video max-h-[420px] bg-black rounded-xl overflow-hidden relative flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            <div className="absolute bottom-3 left-3 text-[10px] font-mono text-cyan-300 bg-black/70 px-2 py-1 rounded border border-white/10">
              LOCAL HARDWARE VIDEO FEED
            </div>
          </div>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cameras.map((cam, i) => (
          <motion.div
            key={cam.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="bg-zinc-900/50 border-white/10 overflow-hidden group hover:border-cyan-500/30 transition-all">
              <div className="relative aspect-video bg-[#09090b] flex items-center justify-center overflow-hidden border-b border-white/5">
                {cam.status === 'online' ? (
                  <>
                    <div className="relative w-full h-full bg-zinc-950">
                      {/* Real MJPEG Stream */}
                      <img
                        src={getCameraLiveStreamUrl(cam.id)}
                        alt={cam.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      {/* AI Bounding Box Overlay */}
                      <div className="absolute inset-0 pointer-events-none">
                        <AiOverlay cameraId={cam.id} />
                      </div>
                    </div>

                    {/* HUD Status Badges */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                      <span className="flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400 backdrop-blur border border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        REC
                      </span>
                    </div>

                    <div className="absolute bottom-2 left-2 text-[9px] font-mono text-zinc-300 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur border border-white/5">
                      {cam.resolution} • {cam.fps} FPS
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-950/90 gap-2 p-4">
                    <AlertCircle size={22} className="text-red-400" />
                    <div className="text-center">
                      <div className="text-[12px] font-semibold text-white">Stream Inactive</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{cam.id} is offline</div>
                    </div>
                  </div>
                )}

                {/* PTZ Controls Overlay */}
                {activePtz === cam.id && cam.status === 'online' && (
                  <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl shadow-2xl flex flex-col items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">PTZ Control</span>
                      <div className="grid grid-cols-3 gap-1">
                        <div />
                        <button onClick={() => handlePtz(cam.id, 'up')} className="p-2 bg-white/10 hover:bg-white/20 rounded" title="Tilt Up"><ChevronUp size={14} /></button>
                        <div />
                        <button onClick={() => handlePtz(cam.id, 'left')} className="p-2 bg-white/10 hover:bg-white/20 rounded" title="Pan Left"><ChevronLeft size={14} /></button>
                        <button onClick={() => handlePtz(cam.id, 'reset')} className="p-2 bg-cyan-500/20 hover:bg-cyan-500/40 rounded text-cyan-300 text-[10px] font-bold" title="Reset PTZ">1x</button>
                        <button onClick={() => handlePtz(cam.id, 'right')} className="p-2 bg-white/10 hover:bg-white/20 rounded" title="Pan Right"><ChevronRight size={14} /></button>
                        <div />
                        <button onClick={() => handlePtz(cam.id, 'down')} className="p-2 bg-white/10 hover:bg-white/20 rounded" title="Tilt Down"><ChevronDown size={14} /></button>
                        <div />
                      </div>
                      <div className="flex gap-1.5 w-full pt-1">
                        <button onClick={() => handlePtz(cam.id, 'zoom_in')} className="flex-1 py-1 px-2 bg-white/10 hover:bg-white/20 rounded text-[11px] font-semibold text-white flex items-center justify-center gap-1" title="Digital Zoom In">
                          <Plus size={12} /> Zoom
                        </button>
                        <button onClick={() => handlePtz(cam.id, 'zoom_out')} className="flex-1 py-1 px-2 bg-white/10 hover:bg-white/20 rounded text-[11px] font-semibold text-white flex items-center justify-center gap-1" title="Digital Zoom Out">
                          <Minus size={12} /> Zoom
                        </button>
                        <button onClick={() => setActivePtz(null)} className="py-1 px-2 bg-red-500/20 hover:bg-red-500/40 rounded text-red-300 text-[10px] font-bold">
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hover overlay actions */}
                {cam.status === 'online' && activePtz !== cam.id && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setFullscreenCam(cam)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition-colors"
                      title="Fullscreen"
                    >
                      <Maximize2 size={15} />
                    </button>
                    <button
                      onClick={() => setActivePtz(cam.id)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition-colors"
                      title="PTZ Controls"
                    >
                      <Move size={15} />
                    </button>
                  </div>
                )}
              </div>

              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <SourceIcon type={cam.source_type} status={cam.status} />
                    <span className="font-semibold text-[13px] text-white truncate">{cam.name}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded font-mono bg-white/5 border-white/10 text-cyan-400">
                    {cam.source_type || 'webcam'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                  <span className="truncate max-w-[140px]">{cam.location || 'Primary Sector'}</span>
                  <span className="font-mono text-emerald-400">{cam.fps || 30} FPS</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {fullscreenCam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-zinc-950 border border-white/15 rounded-2xl overflow-hidden max-w-5xl w-full shadow-2xl relative">
              <div className="p-3 border-b border-white/10 flex items-center justify-between bg-zinc-900/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-bold text-white">{fullscreenCam.name}</span>
                  <span className="text-xs font-mono text-cyan-400">({fullscreenCam.id})</span>
                </div>
                <button
                  onClick={() => setFullscreenCam(null)}
                  className="text-muted-foreground hover:text-white px-2 py-1 rounded bg-white/5 text-xs font-medium"
                >
                  Close (Esc)
                </button>
              </div>

              <div className="aspect-video bg-black relative flex items-center justify-center">
                <img
                  src={getCameraLiveStreamUrl(fullscreenCam.id)}
                  alt={fullscreenCam.name}
                  className="w-full h-full object-contain"
                />
                <AiOverlay cameraId={fullscreenCam.id} />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}