import { useEffect, useState } from 'react';
import { fetchTrafficData, TrafficData } from '@/services/api/traffic';
import { useTelemetrySocket, TelemetryEvent } from '@/hooks/use-telemetry-socket';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Users, Gauge, Clock, Filter, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function TrafficAnalyticsPage() {
  const [data, setData] = useState<TrafficData[]>([]);
  const [alerts, setAlerts] = useState([
    { id: 1, location: 'Main Gate Intersection', severity: 'High', time: '10 mins ago', resolved: false },
    { id: 2, location: 'South Parking Exit', severity: 'Medium', time: '25 mins ago', resolved: false },
    { id: 3, location: 'Loading Dock B', severity: 'Low', time: '1 hour ago', resolved: true },
  ]);

  useEffect(() => {
    fetchTrafficData().then(setData).catch(console.error);
  }, []);

  useTelemetrySocket((event: TelemetryEvent) => {
    if (event.type === 'TRAFFIC_UPDATE') {
      setData(prev => {
        const newData = [...prev, {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          vehicles: event.data.vehicles,
          pedestrians: event.data.pedestrians,
          avg_speed: event.data.avg_speed
        }];
        return newData.slice(-24);
      });
    }
  });

  const kpis = [
    { title: 'Total Vehicles', value: '24,592', change: '+12%', icon: Car, trend: 'up' },
    { title: 'Pedestrian Count', value: '8,304', change: '-5%', icon: Users, trend: 'down' },
    { title: 'Avg Speed', value: '42 km/h', change: '+2%', icon: Gauge, trend: 'up' },
    { title: 'Peak Hour', value: '17:00', change: 'Expected', icon: Clock, trend: 'neutral' },
  ];

  const vehicleClassData = [
    { name: 'Sedan', value: 45 },
    { name: 'SUV', value: 30 },
    { name: 'Truck', value: 15 },
    { name: 'Bus', value: 5 },
    { name: 'Motorcycle', value: 5 },
  ];
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleResolveAlert = (id: number) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, resolved: true } : a));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Traffic Analytics</h1>
          <p className="text-muted-foreground mt-1 text-[13px]">Comprehensive analysis of vehicle movement and congestion.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/10 hover:bg-white/5 rounded-md text-[13px] text-white transition-colors shadow-sm">
            <Calendar size={14} className="text-muted-foreground" />
            Last 24 Hours
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/10 hover:bg-white/5 rounded-md text-[13px] text-white transition-colors shadow-sm">
            <Filter size={14} className="text-muted-foreground" />
            More Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="bg-zinc-900/40 border-white/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-muted-foreground">{kpi.title}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-semibold text-white">{kpi.value}</span>
                    <span className={`text-[11px] font-medium ${kpi.trend === 'up' ? 'text-emerald-500' : kpi.trend === 'down' ? 'text-red-500' : 'text-zinc-500'}`}>
                      {kpi.change}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-lg">
                  <kpi.icon size={20} className="text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div className="col-span-1 lg:col-span-2 space-y-4" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="h-[400px] bg-zinc-900/40 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-medium text-white">Vehicle Flow Over Time</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="time" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '6px', fontSize: '12px' }}
                    itemStyle={{ color: '#3b82f6' }}
                    cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="vehicles" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorVehicles)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="col-span-1 space-y-4" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
          <Card className="bg-zinc-900/40 border-white/5">
            <CardHeader className="pb-2 border-b border-white/5">
              <CardTitle className="text-[14px] font-medium text-white flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" /> Congestion Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5 max-h-[160px] overflow-y-auto">
                <AnimatePresence>
                  {alerts.map(alert => (
                    <motion.div 
                      key={alert.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`p-3 flex items-start justify-between gap-3 ${alert.resolved ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div>
                        <p className={`text-sm font-medium ${alert.severity === 'High' ? 'text-red-400' : alert.severity === 'Medium' ? 'text-amber-400' : 'text-blue-400'}`}>
                          {alert.location}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.severity} Congestion • {alert.time}</p>
                      </div>
                      {!alert.resolved && (
                        <button 
                          onClick={() => handleResolveAlert(alert.id)}
                          className="text-muted-foreground hover:text-emerald-400 transition-colors"
                          title="Mark Resolved"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          <Card className="h-[210px] bg-zinc-900/40 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] font-medium text-white">Vehicle Classification</CardTitle>
            </CardHeader>
            <CardContent className="h-[150px] pt-0 flex items-center">
              <div className="h-[120px] w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vehicleClassData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={55}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {vehicleClassData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '6px', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-1 gap-y-1.5 mt-2 w-1/2 pr-2">
                {vehicleClassData.slice(0,4).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                    <span className="truncate">{item.name}</span>
                    <span className="text-white font-medium ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}