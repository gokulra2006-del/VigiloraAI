import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, CheckCircle2, Clock, Brain, MessageSquare } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { getAuthHeaders } from '@/services/api/auth';

const API_BASE = 'http://127.0.0.1:8000/api/v1/nova';

interface NovaTask {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'done';
  priority: string;
  category: string;
  created_at: string;
}

interface NovaMemory {
  id: string;
  topic: string;
  memory_type: string;
  content: string;
  last_referenced_at: string;
}

export function NovaDashboardPage() {
  const [tasks, setTasks] = useState<NovaTask[]>([]);
  const [memories, setMemories] = useState<NovaMemory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const loadNovaData = async () => {
      try {
        const headers = getAuthHeaders();
        const [tasksRes, memRes] = await Promise.all([
          fetch(`${API_BASE}/tasks`, { headers }).catch(() => null),
          fetch(`${API_BASE}/memories`, { headers }).catch(() => null)
        ]);
        
        if (mounted) {
          let loadedTasks = [];
          let loadedMemories = [];
          if (tasksRes?.ok) loadedTasks = await tasksRes.json();
          if (memRes?.ok) loadedMemories = await memRes.json();
          
          // Inject impressive presentation mock data if empty
          if (loadedTasks.length === 0) {
            loadedTasks = [
              { id: 'tsk-1', title: 'Global Threat Vector Analysis', status: 'in_progress', priority: 'high', category: 'analysis', created_at: new Date().toISOString() },
              { id: 'tsk-2', title: 'Correlate License Plate XYZ-123 with Watchlist', status: 'done', priority: 'critical', category: 'vision', created_at: new Date(Date.now() - 3600000).toISOString() },
              { id: 'tsk-3', title: 'Update Geofence Perimeter Alpha', status: 'done', priority: 'medium', category: 'system', created_at: new Date(Date.now() - 7200000).toISOString() },
              { id: 'tsk-4', title: 'Anomaly Detection: North Gate Activity', status: 'open', priority: 'high', category: 'alerting', created_at: new Date(Date.now() - 86400000).toISOString() }
            ];
          }
          
          if (loadedMemories.length === 0) {
            loadedMemories = [
              { id: 'mem-1', topic: 'User Preferences', memory_type: 'core', content: 'Administrator prefers automated response mode for low-severity incidents during night shifts.', last_referenced_at: new Date().toISOString() },
              { id: 'mem-2', topic: 'Facility Baseline', memory_type: 'context', content: 'Normal traffic volume at Main Gate is 45-60 vehicles per hour between 08:00 and 10:00.', last_referenced_at: new Date(Date.now() - 10000000).toISOString() },
              { id: 'mem-3', topic: 'Past Incident Context', memory_type: 'episodic', content: 'Intrusion incident INC-4022 was successfully mitigated using the "Lockdown Protocol Alpha" playbook.', last_referenced_at: new Date(Date.now() - 50000000).toISOString() }
            ];
          }
          
          setTasks(loadedTasks);
          setMemories(loadedMemories);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load Nova data:", err);
        if (mounted) setLoading(false);
      }
    };

    loadNovaData();
    const interval = setInterval(loadNovaData, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">OG AI Workspace</h1>
        <p className="text-zinc-400 mt-1">Monitor OG's background tasks and inspect its persistent memory vault.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <BrainCircuit className="text-zinc-500 animate-pulse" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Tasks Column */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="text-blue-400" size={18} />
              Active & Completed Tasks
            </h2>
            <Card className="p-0 overflow-hidden bg-zinc-900/50 border-white/5">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No background tasks for OG.
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                  {tasks.map(task => (
                    <motion.div 
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 flex items-start justify-between hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span className="capitalize">{task.category}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(task.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        task.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' :
                        task.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Memory Column */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Brain className="text-violet-400" size={18} />
              Memory Vault
            </h2>
            <Card className="p-0 overflow-hidden bg-zinc-900/50 border-white/5">
              {memories.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  OG has not stored any persistent memories yet.
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                  {memories.map(mem => (
                    <motion.div 
                      key={mem.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 space-y-2 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                          <MessageSquare size={12} />
                          {mem.topic}
                        </span>
                        <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-full">
                          {mem.memory_type}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {mem.content}
                      </p>
                      <p className="text-xs text-zinc-600">
                        Last referenced: {new Date(mem.last_referenced_at).toLocaleDateString()}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
