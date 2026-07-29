import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, CheckCircle2, Clock, Brain, MessageSquare } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
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
    const fetchData = async () => {
      try {
        const [tasksRes, memoriesRes] = await Promise.all([
          fetch(`${API_BASE}/tasks`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/memories`, { headers: getAuthHeaders() })
        ]);

        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setTasks(tasksData);
        }
        if (memoriesRes.ok) {
          const memoriesData = await memoriesRes.json();
          setMemories(memoriesData);
        }
      } catch (e) {
        console.error("Failed to fetch Nova data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title="Nova AI Workspace" 
        description="Monitor Nova's background tasks and inspect its persistent memory vault."
      />

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
                  No background tasks for Nova.
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
                  Nova has not stored any persistent memories yet.
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
