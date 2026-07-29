import { useEffect, useState } from 'react';
import { assignIncident, createCaseFromIncident, fetchIncidents, transitionIncident } from '@/services/api/incidents';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, AlertTriangle, ShieldCheck, Clock, Download, ChevronDown, User, X, Camera, MapPin, Video, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  useEffect(() => {
    fetchIncidents().then(setIncidents);
  }, []);

  const filtered = incidents.filter(i => {
    const matchesSearch = i.type.toLowerCase().includes(search.toLowerCase()) || (i.camera_id && i.camera_id.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return i.status === 'open' || i.status === 'detected';
    if (activeTab === 'active') return i.status === 'in_progress' || i.status === 'acknowledged';
    if (activeTab === 'resolved') return i.status === 'resolved';
    return true;
  });

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-zinc-800 text-zinc-300 border-white/5';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'open':
      case 'detected': return <AlertTriangle size={14} className="text-red-500" />;
      case 'acknowledged':
      case 'in_progress':
      case 'investigating': return <Clock size={14} className="text-amber-500" />;
      case 'resolved': return <ShieldCheck size={14} className="text-emerald-500" />;
      default: return null;
    }
  };

  const tabs = [
    { id: 'all', label: 'All Incidents' },
    { id: 'open', label: 'Open' },
    { id: 'active', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Incident Management</h1>
          <p className="text-muted-foreground mt-1 text-[13px]">Triage and respond to security events.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-white transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search incidents..." 
              className="pl-9 pr-4 h-8 bg-zinc-900 border border-white/10 rounded-md text-[13px] focus:outline-none focus:border-white/20 w-64 text-white placeholder:text-muted-foreground/70 transition-colors shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-3 h-8 bg-zinc-900 border border-white/10 rounded-md text-[13px] text-white hover:bg-white/5 transition-colors shadow-sm">
            <Filter size={14} /> Filter
          </button>
          <button className="flex items-center gap-2 px-3 h-8 bg-zinc-900 border border-white/10 rounded-md text-[13px] text-white hover:bg-white/5 transition-colors shadow-sm">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-[13px] font-medium transition-colors relative ${
              activeTab === tab.id ? 'text-white' : 'text-muted-foreground hover:text-white'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="incidentTabIndicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <Card className="bg-zinc-900/40 border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Incident ID</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Details</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Severity <ChevronDown size={12} className="inline ml-1" /></th>
                <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Assignee</th>
                <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">Time <ChevronDown size={12} className="inline ml-1" /></th>
                <th className="px-6 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((incident, i) => (
                <motion.tr 
                  key={incident.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  onClick={() => setSelectedIncident(incident)}
                >
                  <td className="px-6 py-4 font-mono text-[12px] text-muted-foreground group-hover:text-white transition-colors">{incident.id.substring(0,8).toUpperCase()}</td>
                  <td className="px-6 py-4">
                    <div className="text-[13px] font-medium text-white">{incident.type}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{incident.camera_id || 'Unknown Source'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 capitalize text-[13px] text-muted-foreground group-hover:text-white transition-colors">
                      {getStatusIcon(incident.status)}
                      {incident.status.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {incident.assignee ? (
                      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-[9px]">
                          {incident.assignee.charAt(0)}
                        </div>
                        {incident.assignee}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[12px] text-muted-foreground opacity-50">
                        <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                          <User size={10} />
                        </div>
                        Unassigned
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[12px] text-muted-foreground whitespace-nowrap">
                    {incident.detected_at ? new Date(incident.detected_at).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {incident.status === 'detected' && (
                      <button className="px-2 py-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded text-[11px] font-medium transition-colors" onClick={(e) => { e.stopPropagation(); transitionIncident(incident.id, 'acknowledged').then(() => fetchIncidents().then(setIncidents)); }}>Acknowledge</button>
                    )}
                    {incident.status === 'acknowledged' && (
                      <button className="px-2 py-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded text-[11px] font-medium transition-colors" onClick={(e) => { e.stopPropagation(); transitionIncident(incident.id, 'in_progress').then(() => fetchIncidents().then(setIncidents)); }}>Investigate</button>
                    )}
                    {incident.status === 'in_progress' && (
                      <button className="px-2 py-1 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded text-[11px] font-medium transition-colors" onClick={(e) => { e.stopPropagation(); transitionIncident(incident.id, 'resolved').then(() => fetchIncidents().then(setIncidents)); }}>Resolve</button>
                    )}
                    {!incident.assigned_to && (
                      <button className="px-2 py-1 bg-white/5 text-zinc-300 hover:bg-white/10 rounded text-[11px] font-medium transition-colors" onClick={(e) => { e.stopPropagation(); assignIncident(incident.id).then(() => fetchIncidents().then(setIncidents)); }}>Assign</button>
                    )}
                    {!incident.case_id && (
                      <button className="px-2 py-1 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 rounded text-[11px] font-medium transition-colors" onClick={(e) => { e.stopPropagation(); createCaseFromIncident(incident.id).then(() => fetchIncidents().then(setIncidents)); }}>Create case</button>
                    )}
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground text-[13px]">
                    No incidents found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Incident Details Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-white/10 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/50 shrink-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">{selectedIncident.type}</h3>
                  <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 ${getSeverityColor(selectedIncident.severity)}`}>
                    {selectedIncident.severity}
                  </Badge>
                </div>
                <button onClick={() => setSelectedIncident(null)} className="text-muted-foreground hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
                {/* Left Column: Timeline */}
                <div className="flex-1 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-4">Incident Timeline</h4>
                    <div className="relative pl-4 space-y-6 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                      
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-[14px] h-[14px] rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center" />
                        <div className="text-xs text-muted-foreground mb-1">{selectedIncident.detected_at ? new Date(selectedIncident.detected_at).toLocaleString() : 'Now'}</div>
                        <div className="text-sm font-medium text-white">Detection Initiated</div>
                        <div className="text-xs text-muted-foreground mt-1">AI Model flagged suspicious activity matching {selectedIncident.type}.</div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-[14px] h-[14px] rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center" />
                        <div className="text-xs text-muted-foreground mb-1">+ 2 mins</div>
                        <div className="text-sm font-medium text-white">Automated Triage</div>
                        <div className="text-xs text-muted-foreground mt-1">Severity elevated to {selectedIncident.severity}. Alerts dispatched to SOC team.</div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-[14px] h-[14px] rounded-full bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center" />
                        <div className="text-xs text-muted-foreground mb-1">Pending</div>
                        <div className="text-sm font-medium text-white">Analyst Investigation</div>
                        <div className="text-xs text-muted-foreground mt-1">Awaiting manual review and resolution.</div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Right Column: Evidence & Metadata */}
                <div className="w-full lg:w-80 space-y-6 shrink-0">
                  <div className="bg-zinc-900/50 border border-white/10 rounded-lg p-4 space-y-4">
                    <h4 className="text-sm font-medium text-white">Metadata</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Camera size={14} className="text-white/50" />
                        <span>Source: <span className="text-white">{selectedIncident.source || selectedIncident.camera_id || 'Unknown'}</span></span>
                      </div>
                      <div className="flex items-start gap-3 text-sm text-muted-foreground">
                        <FileText size={14} className="text-white/50 mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-1">
                          <span>AI Justification:</span>
                          <span className="text-white text-[13px] leading-relaxed italic">{selectedIncident.justification_text || "AI detected deviation from baseline pattern."}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <MapPin size={14} className="text-white/50" />
                        <span>Location: <span className="text-white">{selectedIncident.zone || 'Unassigned zone'}</span></span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <User size={14} className="text-white/50" />
                        <span>Assignee: <span className="text-white">{selectedIncident.assignee || 'Unassigned'}</span></span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-white">Evidence Vault</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-zinc-900 border border-white/10 rounded-md aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-colors group">
                        <Video size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] text-muted-foreground font-medium">Clip_001.mp4</span>
                      </div>
                      <div className="bg-zinc-900 border border-white/10 rounded-md aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-colors group">
                        <Camera size={20} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] text-muted-foreground font-medium">Frame_A.jpg</span>
                      </div>
                      <div className="bg-zinc-900 border border-white/10 rounded-md aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-colors group">
                        <Camera size={20} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] text-muted-foreground font-medium">Frame_B.jpg</span>
                      </div>
                      <div className="bg-zinc-900 border border-white/10 rounded-md aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-colors group">
                        <FileText size={20} className="text-amber-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] text-muted-foreground font-medium">Log_Dump.txt</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
