import { useEffect, useState } from 'react';
import { fetchDashboardStats, DashboardStats, fetchDashboardTimeseries } from '@/services/api/dashboard';
import { useTelemetrySocket, TelemetryEvent } from '@/hooks/use-telemetry-socket';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Activity, Camera, AlertTriangle, ShieldCheck, ChevronRight, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } }
};

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<{time: string; threats: number}[]>([]);

  useEffect(() => {
    fetchDashboardStats().then(setStats).catch(console.error);
    fetchDashboardTimeseries().then(setChartData).catch(console.error);

    const interval = setInterval(() => {
      fetchDashboardTimeseries().then(setChartData).catch(console.error);
    }, 60000); // refresh every minute

    return () => clearInterval(interval);
  }, []);

  const { isConnected } = useTelemetrySocket((event: TelemetryEvent) => {
    if (event.type === 'NEW_INCIDENT') {
      setStats(prev => {
        if (!prev) return prev;
        
        const newAlert = {
          id: event.data.id,
          title: event.data.title,
          time: new Date().toLocaleTimeString(),
          severity: event.data.severity
        };

        return {
          ...prev,
          activeIncidents: prev.activeIncidents + 1,
          recentAlerts: [newAlert, ...prev.recentAlerts].slice(0, 4)
        };
      });
    }
  });

  if (!stats) {
    return (
      <div className="space-y-6 p-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-zinc-900 rounded animate-pulse" />
          <div className="h-4 w-96 bg-zinc-900/50 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[140px] bg-zinc-900/40 border border-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    { title: 'System Health', value: stats.systemHealth, icon: <ShieldCheck size={16} />, trend: '+0.2%', label: 'Operational' },
    { title: 'Active Incidents', value: stats.activeIncidents, icon: <AlertTriangle size={16} />, trend: '-12%', label: 'Requires attention' },
    { title: 'Cameras Online', value: `${stats.camerasOnline}`, subValue: ` / ${stats.camerasOnline + stats.camerasOffline}`, icon: <Camera size={16} />, trend: '98%', label: 'Uptime' },
    { title: 'AI Throughput', value: '12.4k', subValue: ' fps', icon: <Activity size={16} />, trend: '+4%', label: 'Models active' },
  ];

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            SOC Overview
          </h1>
          <p className="text-muted-foreground mt-1 text-[13px]">Real-time telemetry and AI model performance analytics.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-zinc-900 text-white border border-white/10 hover:bg-white/5 rounded-md text-[13px] font-medium transition-colors outline-none shadow-sm">
            Download Report
          </button>
        </div>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <motion.div key={kpi.title} variants={itemVariants}>
            <Card className="h-full bg-zinc-900/40 border-white/5 hover:border-white/10 transition-colors cursor-default">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[13px] font-medium text-muted-foreground">{kpi.title}</CardTitle>
                <div className="text-muted-foreground/50">
                  {kpi.icon}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-semibold tracking-tighter text-white">{kpi.value}</span>
                  {kpi.subValue && <span className="text-lg font-medium text-muted-foreground">{kpi.subValue}</span>}
                </div>
                <div className="flex items-center gap-2 mt-3 text-[12px]">
                  <span className="flex items-center gap-1 font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <TrendingUp size={12} />
                    {kpi.trend}
                  </span>
                  <span className="text-muted-foreground">{kpi.label}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={itemVariants} className="col-span-1 lg:col-span-2">
          <Card className="h-full bg-zinc-900/40 border-white/5">
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-[15px] font-semibold">
                <span>Threat Detection Trends</span>
                <span className="text-[11px] font-medium px-2 py-1 bg-zinc-800 border border-white/5 rounded text-muted-foreground">Last 24 Hours</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px] p-0 border-t border-white/5 relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorThreats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#ef4444' }}
                  />
                  <Area type="monotone" dataKey="threats" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorThreats)" animationDuration={500} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="col-span-1">
          <Card className="h-full bg-zinc-900/40 border-white/5">
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-[15px] font-semibold">
                <span>Critical Alerts</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-500 text-[10px] font-bold">
                  {stats.recentAlerts.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {stats.recentAlerts.map((alert: any, i: number) => (
                <motion.div 
                  key={alert.id} 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (i * 0.05) }}
                  className="group flex items-center justify-between p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      alert.severity === 'high' ? 'bg-red-500' : 
                      alert.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <p className="text-[13px] font-medium text-white group-hover:text-white transition-colors">{alert.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{alert.time}</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Human-in-the-Loop Approvals */}
      <div className="grid grid-cols-1 gap-4 mt-2">
        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[15px] font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Human-in-the-Loop Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PendingApprovalsWidget />
          </CardContent>
        </Card>
      </div>

    </motion.div>
  );
}

function PendingApprovalsWidget() {
  const [approvals, setApprovals] = useState<any[]>([]);
  
  useEffect(() => {
    // Dynamic import to avoid top-level issues if the file is broken during refactor
    import('@/services/api/approvals').then(({ fetchPendingApprovals }) => {
       fetchPendingApprovals().then(setApprovals).catch(console.error);
       const interval = setInterval(() => {
         fetchPendingApprovals().then(setApprovals).catch(console.error);
       }, 5000);
       return () => clearInterval(interval);
    }).catch(console.error);
  }, []);

  const handleApprove = async (id: number) => {
    try {
      const { approveAction } = await import('@/services/api/approvals');
      await approveAction(id);
      setApprovals(prev => prev.filter((a: any) => a.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleReject = async (id: number) => {
    try {
      const { rejectAction } = await import('@/services/api/approvals');
      await rejectAction(id);
      setApprovals(prev => prev.filter((a: any) => a.id !== id));
    } catch (e) { console.error(e); }
  };

  if (approvals.length === 0) {
    return <div className="text-[13px] text-muted-foreground py-4 text-center">No pending playbook actions requiring human approval.</div>;
  }

  return (
    <div className="space-y-4">
      {approvals.map((app: any) => (
        <div key={app.id} className={`p-4 rounded-lg border ${app.tier === 'alert_and_require_ack' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
           <div className="flex justify-between items-start mb-2">
             <div className="flex items-center gap-2">
               <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase ${app.tier === 'alert_and_require_ack' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>
                  {app.tier === 'alert_and_require_ack' ? 'Action Required' : 'Review Suggested'}
               </span>
               <span className="text-sm font-semibold text-white">{app.playbook_name || 'Playbook Triggered'}</span>
             </div>
             <span className="text-[11px] text-muted-foreground">{new Date(app.created_at).toLocaleTimeString()}</span>
           </div>
           
           <p className="text-[13px] text-white/80 mt-2 mb-4 leading-relaxed">
             <strong>AI Reasoning:</strong> {app.justification_text || "Operator intervention requested."}
           </p>

           <div className="flex items-center gap-3">
             <button 
                onClick={() => handleApprove(app.id)}
                className="bg-zinc-100 hover:bg-white text-black px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors"
             >
                Approve & Execute
             </button>
             <button 
                onClick={() => handleReject(app.id)}
                className="bg-transparent border border-white/20 hover:bg-white/5 text-white px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors"
             >
                Reject Action
             </button>
           </div>
        </div>
      ))}
    </div>
  );
}