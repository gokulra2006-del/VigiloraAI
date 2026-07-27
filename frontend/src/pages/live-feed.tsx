import { useEffect, useState } from 'react';
import { fetchCameras } from '@/services/api/cameras';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Maximize2, Settings, AlertCircle, Smartphone, Film, Laptop, Info, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SourceIcon = ({ type, status }: { type: string, status: string }) => {
  const statusColor = status === 'online' ? 'text-emerald-500' : (status === 'degraded' ? 'text-yellow-500' : 'text-red-500');
  
  if (type === 'rtsp_phone') {
    return (
      <div className="relative shrink-0" title="Simulated - Phone Stream">
        <Camera size={14} className={statusColor} />
        <Smartphone size={8} className="absolute -bottom-1 -right-1 text-white bg-[#18181b] rounded-sm" />
      </div>
    );
  }
  if (type === 'video_file') {
    return (
      <div className="relative shrink-0" title="Simulated - Recorded Footage">
        <Camera size={14} className={statusColor} />
        <Film size={8} className="absolute -bottom-1 -right-1 text-white bg-[#18181b] rounded-sm" />
      </div>
    );
  }
  if (type === 'webcam') {
    return (
      <div className="relative shrink-0" title="Simulated - Webcam">
        <Camera size={14} className={statusColor} />
        <Laptop size={8} className="absolute -bottom-1 -right-1 text-white bg-[#18181b] rounded-sm" />
      </div>
    );
  }
  return (
    <div className="relative shrink-0" title="Live - Hardware Camera">
      <Camera size={14} className={statusColor} fill="currentColor" />
    </div>
  );
};

const IconLegend = () => {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative z-50">
      <button 
        onClick={() => setOpen(!open)} 
        className="text-[11px] font-medium text-muted-foreground hover:text-white flex items-center gap-1.5 bg-white/5 border border-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded transition-colors"
      >
        <Info size={12} /> Source Legend
      </button>
      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl p-3 text-[11px] space-y-3"
          >
            <div className="flex items-center gap-3">
               <div className="relative"><Camera size={14} className="text-emerald-500" fill="currentColor"/></div>
               <span className="text-white/80">Hardware Camera</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative"><Camera size={14} className="text-emerald-500"/><Smartphone size={8} className="absolute -bottom-1 -right-1 text-white bg-zinc-900"/></div>
               <span className="text-white/80">Phone Stream (RTSP)</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative"><Camera size={14} className="text-emerald-500"/><Film size={8} className="absolute -bottom-1 -right-1 text-white bg-zinc-900"/></div>
               <span className="text-white/80">Recorded Footage</span>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative"><Camera size={14} className="text-emerald-500"/><Laptop size={8} className="absolute -bottom-1 -right-1 text-white bg-zinc-900"/></div>
               <span className="text-white/80">Webcam</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function LiveFeedPage() {
  const [cameras, setCameras] = useState<any[]>([]);

  useEffect(() => {
    fetchCameras().then(setCameras);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Live Camera Monitoring</h1>
          <p className="text-muted-foreground mt-1 text-[13px]">Real-time feeds from all active surveillance nodes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-transparent text-[11px] px-2 py-0.5 uppercase tracking-widest">
              {cameras.filter(c => c.status === 'online').length} Online
            </Badge>
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-transparent text-[11px] px-2 py-0.5 uppercase tracking-widest hidden md:inline-flex">
              {cameras.filter(c => c.status === 'degraded').length} Degraded
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-transparent text-[11px] px-2 py-0.5 uppercase tracking-widest">
              {cameras.filter(c => c.status === 'offline').length} Offline
            </Badge>
          </div>
          <IconLegend />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cameras.map((cam, i) => (
          <motion.div key={cam.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
            <Card className="bg-zinc-900/40 border-white/5 overflow-hidden group hover:border-white/20 transition-colors">
              <div className="relative aspect-video bg-[#09090b] flex items-center justify-center overflow-hidden border-b border-white/5">
                {cam.status === 'online' ? (
                  <>
                    <div className="absolute inset-0 bg-zinc-900 bg-cover bg-center opacity-40 mix-blend-luminosity"></div>
                    {/* Live Stream Simulation / Mock Video could go here */}
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-emerald-500 bg-black/50 px-1 rounded">100% Signal</span>
                      <span className="flex items-center gap-1.5">
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                        </span>
                        <span className="text-[9px] font-bold text-white uppercase bg-black/80 px-1 rounded tracking-widest">REC</span>
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full w-full bg-black/80 backdrop-blur-sm z-10 gap-3">
                    <AlertCircle size={24} className="text-red-500" />
                    <div className="text-center">
                      <div className="text-[12px] font-medium text-white">Connection Lost</div>
                      <div className="text-[10px] text-muted-foreground mt-1">Error: Timeout (Code 408)</div>
                    </div>
                    <div className="flex flex-col items-center gap-2 mt-2">
                      <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-medium transition-colors">
                        Reconnect Now
                      </button>
                      <span className="text-[10px] text-muted-foreground">Retrying in 5s...</span>
                    </div>
                  </div>
                )}
                
                {/* Hover controls (only for online) */}
                {cam.status === 'online' && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition-colors" title="Fullscreen"><Maximize2 size={16} /></button>
                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition-colors" title="Snapshot"><Camera size={16} /></button>
                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition-colors" title="Playback"><Film size={16} /></button>
                    <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition-colors" title="Settings"><Settings size={16} /></button>
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SourceIcon type={cam.source_type} status={cam.status} />
                    <span className="font-semibold text-[13px] text-white truncate">{cam.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-sm h-4 uppercase tracking-widest bg-white/10 text-white border-transparent">{cam.resolution}</Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-muted-foreground truncate">{cam.location}</span>
                  <span className="text-[11px] font-mono text-emerald-500">{cam.fps} FPS</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}