import { useCallback, useEffect, useState } from 'react';
import { Camera as CameraIcon, CircleDot, Radio, RefreshCw, Video } from 'lucide-react';
import { Camera, fetchCameras, updateCameraStatus } from '@/services/api/cameras';
import { Card } from '@/components/ui/card';

const statusStyle: Record<Camera['status'], string> = { online: 'bg-emerald-500', offline: 'bg-red-500', degraded: 'bg-amber-500' };
export function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]); const [loading, setLoading] = useState(true); const [updating, setUpdating] = useState<string | null>(null);
  const load = useCallback(async () => { try { setCameras(await fetchCameras()); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const setStatus = async (camera: Camera, status: Camera['status']) => { setUpdating(camera.id); try { await updateCameraStatus(camera.id, status); await load(); } finally { setUpdating(null); } };
  return <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-end justify-between"><div><h1 className="text-2xl font-semibold tracking-tight flex gap-2 items-center"><Video className="text-cyan-400" size={22}/> Camera Management</h1><p className="text-muted-foreground mt-1 text-[13px]">Monitor camera health, zone assignment, and live detection coverage.</p></div><button onClick={load} className="p-2 rounded-md bg-zinc-900 border border-white/10 text-muted-foreground hover:text-white"><RefreshCw size={15}/></button></div>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{loading ? [1,2,3].map(i => <div className="h-56 rounded-xl bg-zinc-900/40 animate-pulse" key={i}/>) : cameras.map(camera => <Card key={camera.id} className="overflow-hidden bg-zinc-900/40 border-white/5">
      <div className="h-28 relative bg-zinc-950 border-b border-white/5 flex items-center justify-center" style={{backgroundImage:'linear-gradient(rgba(34,211,238,.06) 1px, transparent 1px),linear-gradient(90deg, rgba(34,211,238,.06) 1px, transparent 1px)',backgroundSize:'24px 24px'}}><CameraIcon className="text-cyan-400/50" size={34}/><div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] uppercase text-white"><span className={`h-2 w-2 rounded-full ${statusStyle[camera.status]}`}/>{camera.status}</div><span className="absolute right-3 top-3 text-[10px] font-mono text-zinc-500">{camera.id}</span></div>
      <div className="p-4"><div className="flex justify-between gap-2"><div><h2 className="text-[14px] font-medium text-white">{camera.name}</h2><p className="text-[11px] text-muted-foreground mt-1">Zone: {camera.zone_id || camera.location || 'Unassigned'}</p></div><CircleDot className="text-zinc-600" size={16}/></div><div className="mt-4 flex gap-2 text-[11px] text-muted-foreground"><span>{camera.resolution || '—'}</span><span>·</span><span>{camera.fps || 0} FPS</span><span>·</span><span>{camera.active_models?.join(', ') || 'No model'}</span></div><div className="mt-4 flex gap-2"><button disabled={updating===camera.id} onClick={() => setStatus(camera, camera.status === 'offline' ? 'online' : 'offline')} className="flex-1 py-2 text-[11px] font-medium rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 disabled:opacity-50">{camera.status === 'offline' ? 'Mark online' : 'Take offline'}</button><button className="px-3 py-2 text-[11px] rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"><Radio size={13}/></button></div></div>
    </Card>)}</div>
  </div>;
}
