import { useEffect, useState } from 'react';
import { fetchCameras, Camera } from '@/services/api/cameras';
import { fetchIncidents, Incident } from '@/services/api/incidents';
import { getAuthHeaders } from '@/services/api/auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, Camera as CameraIcon, CheckSquare, Clock, CheckCircle2 } from 'lucide-react';

const API_NOVA_BASE = 'http://127.0.0.1:8000/api/v1/nova';

interface NovaTask {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'done';
  priority: string;
  category: string;
  created_at: string;
}

export function DashboardPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [tasks, setTasks] = useState<NovaTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [cams, incs] = await Promise.all([
          fetchCameras().catch(() => []),
          fetchIncidents().catch(() => [])
        ]);
        
        if (mounted) {
          setCameras(cams);
          setIncidents(incs);
          setTasks([
            { id: 'task-1', title: 'Review Logs', status: 'open', priority: 'high', category: 'security', created_at: new Date().toISOString() },
            { id: 'task-2', title: 'Update Models', status: 'in_progress', priority: 'medium', category: 'maintenance', created_at: new Date().toISOString() }
          ]);
          setLoading(false);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
        if (mounted) setLoading(false);
      }
    };
    
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <div className="flex h-[80vh] items-center justify-center text-zinc-500 animate-pulse">INITIALIZING OPS CENTER...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase font-mono">SOC Operations Center</h1>
          <p className="text-zinc-500 text-sm font-mono mt-1">Live Telemetry & AI Task Oversight</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Open Incidents Panel - Highest Weight */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-sm font-semibold text-white uppercase flex items-center gap-2 tracking-wider">
            <AlertTriangle className="text-amber-500" size={16} /> Active Incidents
          </h2>
          <Card className="bg-zinc-950 border border-red-900/30 overflow-hidden shadow-2xl">
            {incidents.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center opacity-70">
                <ShieldCheck size={48} className="text-emerald-500 mb-4 opacity-50" />
                <p className="text-emerald-400 font-mono uppercase tracking-widest text-lg">No Active Incidents</p>
                <p className="text-zinc-500 font-mono text-sm mt-2">All sectors secure.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {incidents.map(inc => (
                  <div key={inc.id} className={`p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between transition-colors hover:bg-white/[0.02] ${inc.severity === 'critical' ? 'bg-red-500/5' : ''}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          inc.severity === 'critical' ? 'bg-red-500 text-white animate-pulse' :
                          inc.severity === 'high' ? 'bg-orange-500 text-black' :
                          inc.severity === 'medium' ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white'
                        }`}>
                          {inc.severity}
                        </span>
                        <h3 className="font-semibold text-white tracking-wide">{inc.type}</h3>
                      </div>
                      <p className="text-sm text-zinc-400">{inc.description || 'No description available.'}</p>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                        <span>Zone: {inc.zone || 'Unknown'}</span>
                        <span>•</span>
                        <span>{new Date(inc.detected_at || '').toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-sm border border-zinc-700 text-zinc-300 text-xs font-mono uppercase tracking-wider bg-zinc-900">
                      {inc.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Side Panels */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Cameras Panel */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white uppercase flex items-center gap-2 tracking-wider">
              <CameraIcon className="text-blue-400" size={16} /> Camera Registry
            </h2>
            <Card className="bg-zinc-950 border border-white/5 overflow-hidden">
              {cameras.length === 0 ? (
                <div className="p-8 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">
                  No cameras registered
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                  {cameras.map(cam => (
                    <div key={cam.id} className="p-3 flex items-center justify-between hover:bg-white/[0.02]">
                      <div>
                        <p className="text-sm font-medium text-white">{cam.name}</p>
                        <p className="text-xs text-zinc-500 font-mono">{cam.zone_id || 'Unzoned'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${cam.status === 'online' ? 'bg-emerald-500' : cam.status === 'offline' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <span className="text-[10px] uppercase font-bold text-zinc-400">{cam.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Task Queue Panel */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white uppercase flex items-center gap-2 tracking-wider">
              <CheckSquare className="text-violet-400" size={16} /> Task Queue
            </h2>
            <Card className="bg-zinc-950 border border-white/5 overflow-hidden">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">
                  No background tasks
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                  {['in_progress', 'open', 'done'].map(statusGroup => {
                    const groupTasks = tasks.filter(t => t.status === statusGroup);
                    if (groupTasks.length === 0) return null;
                    return (
                      <div key={statusGroup} className="p-3 space-y-2">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          {statusGroup.replace('_', ' ')}
                        </h4>
                        <div className="space-y-2">
                          {groupTasks.map(task => (
                            <div key={task.id} className="flex items-start gap-2 text-sm text-zinc-300">
                              {task.status === 'done' ? (
                                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                              ) : task.status === 'in_progress' ? (
                                <Clock size={14} className="text-blue-400 mt-0.5 shrink-0 animate-pulse" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-sm border border-zinc-600 mt-0.5 shrink-0" />
                              )}
                              <span className="leading-tight">{task.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}

function ShieldCheck({ size = 24, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
      <path d="m9 12 2 2 4-4"></path>
    </svg>
  );
}