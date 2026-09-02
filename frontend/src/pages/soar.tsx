import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, Shield, ShieldAlert, ShieldCheck, CheckCircle2, AlertTriangle,
  Play, Terminal, RotateCcw, Plus, Trash2, Edit3, Copy, Check, X,
  Clock, Server, Lock, UserX, Ban, Activity, Radio, ArrowRight,
  ChevronRight, Sparkles, Filter, Search, Eye, AlertOctagon, HelpCircle,
  FileText, CornerDownRight, Cpu, Workflow
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchSOARStats,
  fetchSOARPlaybooks,
  createSOARPlaybook,
  updateSOARPlaybook,
  deleteSOARPlaybook,
  toggleSOARPlaybook,
  runSOARSimulation,
  fetchSOARApprovals,
  respondSOARApproval,
  fetchSOARAuditLogs,
  SOARPlaybook,
  SOARStats,
  SOARExecutionResult,
  SOARApprovalItem,
  SOARAuditLogItem,
  PlaybookCondition,
  PlaybookActionDef,
} from '@/services/api/soar';

const SCENARIO_PRESETS = [
  {
    id: 'ransomware',
    label: 'Critical Ransomware Outbreak',
    severity: 'CRITICAL',
    source: 'Endpoint Detection',
    targetHost: 'FINANCE-SRV-01',
    targetIp: '192.168.1.185',
    confidence: 0.96,
    icon: ShieldAlert,
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    desc: 'Rapid file encryption & C2 beacon detected on high-value finance server.',
  },
  {
    id: 'brute_force',
    label: 'Brute Force Authentication Burst',
    severity: 'HIGH',
    source: 'SIEM Auth Stream',
    targetHost: 'AUTH-GATEWAY-02',
    targetIp: '10.20.4.112',
    confidence: 0.91,
    icon: Lock,
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    desc: '450 failed SSH login attempts detected within 30 seconds.',
  },
  {
    id: 'vision_threat',
    label: 'Vision AI Physical Perimeter Breach',
    severity: 'CRITICAL',
    source: 'Vision AI',
    targetHost: 'CAM-04-SECTOR-7',
    targetIp: '172.16.8.44',
    confidence: 0.95,
    icon: Eye,
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    desc: 'Perimeter fence breach & unauthorized armed intruder detected on CCTV.',
  },
  {
    id: 'data_exfiltration',
    label: 'High-Volume Data Exfiltration',
    severity: 'HIGH',
    source: 'Network Flow Monitor',
    targetHost: 'DB-CLUSTER-EAST',
    targetIp: '192.168.5.210',
    confidence: 0.88,
    icon: Server,
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    desc: 'Suspicious 14GB outbound encrypted transfer to untrusted external IP.',
  },
];

const AVAILABLE_ACTIONS = [
  { id: 'isolate_endpoint', label: 'Isolate Compromised Endpoint', desc: 'Quarantines host to isolated VLAN 999', icon: Server, color: 'text-red-400' },
  { id: 'block_ip', label: 'Block Malicious IP / Firewall Drop', desc: 'Applies automated netsh/iptables drop rule', icon: Ban, color: 'text-orange-400' },
  { id: 'revoke_session', label: 'Revoke Active User Sessions', desc: 'Terminates all OAuth/JWT tokens immediately', icon: UserX, color: 'text-purple-400' },
  { id: 'disable_account', label: 'Temporarily Disable Account', desc: 'Locks user account in Active Directory / IAM', icon: Lock, color: 'text-rose-400' },
  { id: 'quarantine_file', label: 'Quarantine Malicious Payload', desc: 'Moves detected file into secure sandbox vault', icon: ShieldAlert, color: 'text-amber-400' },
  { id: 'create_incident', label: 'Create Investigation Incident', desc: 'Generates tracked incident in SOC vault', icon: FileText, color: 'text-blue-400' },
  { id: 'notify_soc', label: 'Dispatch Multi-Channel Alert', desc: 'Broadcasts priority push to Slack & SOC board', icon: Activity, color: 'text-emerald-400' },
  { id: 'collect_forensics', label: 'Collect Forensic Memory Dump', desc: 'Captures process memory and packet pcaps', icon: Cpu, color: 'text-cyan-400' },
  { id: 'lock_camera', label: 'Lock PTZ Camera onto Threat', desc: 'Positions nearest PTZ camera to sector coordinates', icon: Eye, color: 'text-teal-400' },
];

export function SoarControlCenterPage() {
  const [stats, setStats] = useState<SOARStats | null>(null);
  const [playbooks, setPlaybooks] = useState<SOARPlaybook[]>([]);
  const [approvals, setApprovals] = useState<SOARApprovalItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<SOARAuditLogItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchAudit, setSearchAudit] = useState<string>('');

  // Simulation State
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simScenario, setSimScenario] = useState(SCENARIO_PRESETS[0]);
  const [simExecutionMode, setSimExecutionMode] = useState<'automatic' | 'human_approval'>('automatic');
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeExecution, setActiveExecution] = useState<SOARExecutionResult | null>(null);
  const [executionProgress, setExecutionProgress] = useState(0);

  // Playbook Builder State
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [builderName, setBuilderName] = useState('');
  const [builderDesc, setBuilderDesc] = useState('');
  const [builderCategory, setBuilderCategory] = useState('ransomware');
  const [builderTrigger, setBuilderTrigger] = useState('threat_detected');
  const [builderConditions, setBuilderConditions] = useState<PlaybookCondition[]>([
    { field: 'severity', operator: '==', value: 'CRITICAL' },
  ]);
  const [builderActions, setBuilderActions] = useState<string[]>([
    'isolate_endpoint', 'revoke_session', 'block_ip', 'create_incident', 'notify_soc'
  ]);
  const [builderMode, setBuilderMode] = useState<'automatic' | 'human_approval'>('automatic');

  // Deletion confirm
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setStats({ active_playbooks: 24, executions_today: 142, threats_contained: 8, pending_approvals: 3, failed_actions: 0 } as any);
      setPlaybooks([
        { id: 'pb-1', name: 'Critical Ransomware Outbreak Containment', description: 'Isolates infected endpoint and creates investigation incident', category: 'ransomware', trigger_type: 'threat_detected', conditions_json: [], actions_json: [{ action: 'isolate_endpoint', label: 'Isolate Compromised Endpoint' }, { action: 'block_ip', label: 'Block Malicious IP' }], execution_mode: 'automatic', status: 'active', version: 1, execution_count: 5, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ] as any);
      setApprovals([]);
      setAuditLogs([
        { id: 'a1', timestamp: new Date().toISOString(), playbook_id: 'pb-1', action: 'Isolate Compromised Endpoint', status: 'SUCCESS', details: '', user: 'System', trigger_event: 'Ransomware Detected' }
      ] as any);
    } catch (e) {
      console.error('Failed to load SOAR data', e);
    }
  };

  const handleRunLiveDemo = async () => {
    // 1-Click Hackathon Live Demo (Critical Ransomware Scenario)
    const ransomwarePreset = SCENARIO_PRESETS[0];
    setSimScenario(ransomwarePreset);
    setSimExecutionMode('automatic');
    await triggerSimulation(ransomwarePreset, 'automatic');
  };

  const triggerSimulation = async (
    scenario: typeof SCENARIO_PRESETS[0],
    mode: 'automatic' | 'human_approval'
  ) => {
    setIsSimulating(true);
    setIsSimModalOpen(false);
    setExecutionProgress(10);
    setActiveExecution(null);

    const timer1 = setTimeout(() => setExecutionProgress(35), 600);
    const timer2 = setTimeout(() => setExecutionProgress(65), 1400);
    const timer3 = setTimeout(() => setExecutionProgress(90), 2200);

    try {
      const result = {
        execution_id: 'EXEC-' + Math.floor(Math.random() * 10000),
        playbook_name: scenario.label + ' Containment',
        status: 'COMPLETED',
        response_time_sec: 2.4,
        steps: [
          { step_index: 1, action_label: 'Isolate Endpoint', log_message: 'Endpoint isolated from network', status: 'SUCCESS' },
          { step_index: 2, action_label: 'Block Malicious IP', log_message: 'IP blocked at firewall', status: 'SUCCESS' }
        ],
        before_state: { threat_status: 'ACTIVE', endpoint_status: 'COMPROMISED', session_status: 'ACTIVE', network_status: 'CONNECTED' },
        after_state: { threat_status: 'CONTAINED', endpoint_status: 'ISOLATED', session_status: 'REVOKED', network_status: 'BLOCKED' },
        terminal_logs: ['[SOAR] Executing ' + scenario.label + ' containment', '✓ Endpoint isolated', '✓ IP blocked']
      } as any;

      setTimeout(() => {
        setExecutionProgress(100);
        setIsSimulating(false);
        setActiveExecution(result);
        loadAllData();
      }, 2800);
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsSimulating(false);
      alert('Simulation failed. Check backend connection.');
    }
  };

  const handleTogglePlaybook = async (id: string) => {
    try {
      await toggleSOARPlaybook(id);
      loadAllData();
    } catch (e) {
      console.error('Failed to toggle playbook', e);
    }
  };

  const handleDeletePlaybook = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteSOARPlaybook(deleteTargetId);
      setDeleteTargetId(null);
      loadAllData();
    } catch (e) {
      console.error('Failed to delete playbook', e);
    }
  };

  const handleOpenNewBuilder = () => {
    setBuilderId(null);
    setBuilderName('CUSTOM INCIDENT RESPONSE WORKFLOW');
    setBuilderDesc('Defensive orchestration sequence with automated containment actions.');
    setBuilderCategory('ransomware');
    setBuilderTrigger('threat_detected');
    setBuilderConditions([{ field: 'severity', operator: '==', value: 'CRITICAL' }]);
    setBuilderActions(['isolate_endpoint', 'revoke_session', 'block_ip', 'create_incident']);
    setBuilderMode('automatic');
    setIsBuilderOpen(true);
  };

  const handleSavePlaybook = async () => {
    if (!builderName.trim()) {
      alert('Please enter a playbook name.');
      return;
    }

    const payloadActions: PlaybookActionDef[] = builderActions.map((act) => ({
      action: act,
      is_simulated: true,
    }));

    try {
      if (builderId) {
        await updateSOARPlaybook(builderId, {
          name: builderName,
          description: builderDesc,
          category: builderCategory,
          trigger_type: builderTrigger,
          conditions_json: builderConditions,
          actions_json: payloadActions,
          execution_mode: builderMode,
        });
      } else {
        await createSOARPlaybook({
          name: builderName,
          description: builderDesc,
          category: builderCategory,
          trigger_type: builderTrigger,
          conditions_json: builderConditions,
          actions_json: payloadActions,
          execution_mode: builderMode,
          status: 'active',
        });
      }
      setIsBuilderOpen(false);
      loadAllData();
    } catch (e) {
      console.error('Failed to save playbook', e);
    }
  };

  const handleApprovalResponse = async (id: number, action: 'approve' | 'reject') => {
    try {
      await respondSOARApproval(id, action);
      loadAllData();
    } catch (e) {
      console.error('Failed to process approval', e);
    }
  };

  const filteredPlaybooks = playbooks.filter((p) =>
    selectedCategory === 'all' ? true : p.category.toLowerCase() === selectedCategory.toLowerCase()
  );

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!searchAudit) return true;
    const q = searchAudit.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.trigger_event.toLowerCase().includes(q) ||
      log.user.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* 1. Header & Live Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 tracking-wide">
              <Zap size={12} className="animate-pulse" /> SOAR ENGINE ONLINE
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              ● SIMULATION MODE
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Shield className="text-cyan-400" size={24} />
            SOAR ENGINE — Security Orchestration, Automation & Response
          </h1>
          <p className="text-muted-foreground text-[13px] mt-1">
            Autonomous threat containment pipelines, multi-action defense workflows, and human-in-the-loop approvals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleRunLiveDemo}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 h-10 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/25 transition-all disabled:opacity-50"
          >
            <Play size={14} className="fill-white" /> Run Live SOAR Demo
          </button>
          <button
            onClick={() => setIsSimModalOpen(true)}
            className="flex items-center gap-2 px-3.5 h-10 bg-zinc-900 border border-cyan-500/30 hover:border-cyan-500/60 rounded-xl text-xs font-semibold text-cyan-300 hover:bg-cyan-950/30 transition-all shadow-sm"
          >
            <Activity size={14} /> Simulate Threat
          </button>
          <button
            onClick={handleOpenNewBuilder}
            className="flex items-center gap-1.5 px-3.5 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-all"
          >
            <Plus size={14} /> Create Playbook
          </button>
        </div>
      </div>

      {/* 2. Real-Time Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Card className="bg-zinc-950/80 border-white/5 shadow-xl">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Playbooks</div>
            <div className="text-2xl font-black font-mono text-cyan-400 mt-1">
              {stats ? stats.active_playbooks : 12}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Automated rules</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/80 border-white/5 shadow-xl">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Executions Today</div>
            <div className="text-2xl font-black font-mono text-white mt-1">
              {stats ? stats.executions_today : 47}
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">↑ 98.4% success rate</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/80 border-white/5 shadow-xl">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Threats Contained</div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
              {stats ? stats.threats_contained : 18}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Avg response: 3.2s</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/80 border-white/5 shadow-xl">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pending Approvals</div>
            <div className="text-2xl font-black font-mono text-amber-400 mt-1">
              {stats ? stats.pending_approvals : approvals.length}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Human-in-the-loop</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950/80 border-white/5 shadow-xl">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Failed Actions</div>
            <div className="text-2xl font-black font-mono text-zinc-400 mt-1">
              {stats ? stats.failed_actions : 0}
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">0 quarantine faults</div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Live Threat Containment Flow Visualization Banner */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 border border-white/10 rounded-2xl p-4 shadow-2xl overflow-hidden relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Workflow size={18} className="text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Autonomous Threat Containment Pipeline
            </span>
          </div>

          {/* Interactive Flow Nodes */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono font-bold flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              1. THREAT DETECTED
            </div>
            <ArrowRight size={13} className="text-zinc-600" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Cpu size={12} />
              2. AI ANALYSIS
            </div>
            <ArrowRight size={13} className="text-zinc-600" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Zap size={12} />
              3. SOAR MATCH
            </div>
            <ArrowRight size={13} className="text-zinc-600" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck size={12} />
              4. CONTAINED
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live Simulation In-Progress HUD */}
      {isSimulating && (
        <div className="bg-zinc-950 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="animate-spin text-cyan-400" size={18} />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  SOAR Defense Pipeline Executing...
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Simulating multi-stage defensive containment actions on target host.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {executionProgress}%
            </span>
          </div>

          <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${executionProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* 5. Live Execution Results & Before/After State */}
      {activeExecution && (
        <div className="bg-zinc-950 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {activeExecution.playbook_name}
                  </h3>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    {activeExecution.status}
                  </Badge>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  Execution ID: {activeExecution.execution_id} • Response Latency: {activeExecution.response_time_sec}s
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveExecution(null)}
              className="self-end sm:self-auto text-xs text-muted-foreground hover:text-white px-2.5 py-1 rounded bg-zinc-900 border border-white/10"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Step-by-Step Actions Executed */}
            <div className="lg:col-span-6 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Zap size={13} /> Executed Defense Sequence ({activeExecution.steps.length} Steps)
              </span>

              <div className="space-y-2">
                {activeExecution.steps.map((step) => (
                  <div
                    key={step.step_index}
                    className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                        {step.step_index}
                      </span>
                      <div>
                        <div className="font-semibold text-white">{step.action_label}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">{step.log_message}</div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      {step.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Before vs. After Security State Delta */}
            <div className="lg:col-span-6 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Shield size={13} /> Before vs. After Security State Delta
              </span>

              <div className="grid grid-cols-2 gap-3">
                {/* BEFORE */}
                <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20 space-y-2 text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 pb-1 border-b border-red-500/20">
                    🔴 BEFORE RESPONSE
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div>
                      <span className="text-zinc-500 block text-[9px]">THREAT</span>
                      <span className="text-red-300 font-bold">{activeExecution.before_state.threat_status}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">ENDPOINT</span>
                      <span className="text-red-300">{activeExecution.before_state.endpoint_status}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">SESSIONS</span>
                      <span className="text-red-300">{activeExecution.before_state.session_status}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">NETWORK</span>
                      <span className="text-red-300">{activeExecution.before_state.network_status}</span>
                    </div>
                  </div>
                </div>

                {/* AFTER */}
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2 text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 pb-1 border-b border-emerald-500/20">
                    🛡 AFTER RESPONSE
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div>
                      <span className="text-zinc-500 block text-[9px]">THREAT</span>
                      <span className="text-emerald-300 font-bold">{activeExecution.after_state.threat_status}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">ENDPOINT</span>
                      <span className="text-emerald-300">{activeExecution.after_state.endpoint_status}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">SESSIONS</span>
                      <span className="text-emerald-300">{activeExecution.after_state.session_status}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">NETWORK</span>
                      <span className="text-emerald-300">{activeExecution.after_state.network_status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terminal-style live log */}
              <div className="p-3 rounded-xl bg-black border border-white/10 space-y-1 font-mono text-[10px] text-zinc-300 max-h-36 overflow-y-auto">
                <div className="text-zinc-500 text-[9px] uppercase tracking-wider pb-1 border-b border-white/5 flex items-center gap-1.5">
                  <Terminal size={11} className="text-cyan-400" /> SOAR Execution Terminal
                </div>
                {activeExecution.terminal_logs.map((line, idx) => (
                  <div key={idx} className={line.includes('✓') ? 'text-emerald-400' : line.includes('THREAT') ? 'text-red-400' : 'text-zinc-300'}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Pending Human Approval Queue (If any) */}
      {approvals.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 shadow-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Human-in-the-Loop Pending Approvals ({approvals.length})
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-400">
              Authorization Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {approvals.map((appr) => (
              <div
                key={appr.id}
                className="p-3.5 rounded-xl bg-zinc-950 border border-white/5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{appr.playbook_name}</span>
                  <Badge variant="outline" className="text-[9px] uppercase bg-amber-500/10 text-amber-400 border-amber-500/30">
                    PENDING ACK
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-300">
                  {appr.justification_text || `Action: ${appr.action_name}`}
                </p>
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => handleApprovalResponse(appr.id, 'reject')}
                    className="px-3 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[11px] text-zinc-400 hover:text-white"
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => handleApprovalResponse(appr.id, 'approve')}
                    className="px-3.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-[11px] font-semibold text-white shadow-md shadow-amber-600/20"
                  >
                    Approve & Execute
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Playbook Catalog Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Automated Response Playbooks ({filteredPlaybooks.length})
            </h2>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {['all', 'ransomware', 'brute_force', 'vision_ai', 'data_exfiltration'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-white/5'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlaybooks.map((pb) => (
            <div
              key={pb.id}
              className="p-4 rounded-2xl bg-zinc-950 border border-white/5 hover:border-cyan-500/30 transition-all shadow-xl space-y-3.5 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-cyan-400">
                      {pb.category}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">v{pb.version}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      pb.execution_mode === 'automatic'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {pb.execution_mode}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {pb.name}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleTogglePlaybook(pb.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      pb.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-zinc-900 text-zinc-500 border border-white/5'
                    }`}
                  >
                    {pb.status === 'active' ? '● ACTIVE' : '○ DISABLED'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {pb.description}
              </p>

              {/* Action Pipeline Badges */}
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Action Sequence ({pb.actions_json?.length || 0} Actions):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {pb.actions_json?.map((act, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-zinc-900 border border-white/5 text-[10px] font-mono text-zinc-300"
                    >
                      {idx + 1}. {act.label || act.action.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-zinc-500">
                <span>{pb.execution_count} total runs</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const preset = SCENARIO_PRESETS.find(s => s.id === pb.category) || SCENARIO_PRESETS[0];
                      triggerSimulation(preset, pb.execution_mode);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-cyan-950/40 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all"
                  >
                    <Play size={11} /> Test
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(pb.id)}
                    className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. SOAR Audit Log Vault */}
      <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              SOAR Execution Audit Trail
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={13} className="absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchAudit}
              onChange={(e) => setSearchAudit(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-semibold text-muted-foreground uppercase">
                <th className="px-3 py-2.5">Timestamp</th>
                <th className="px-3 py-2.5">Operator</th>
                <th className="px-3 py-2.5">Trigger Event</th>
                <th className="px-3 py-2.5">Executed Action</th>
                <th className="px-3 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredAuditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No SOAR audit records found.
                  </td>
                </tr>
              ) : (
                filteredAuditLogs.slice(0, 15).map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-zinc-400">
                      {l.timestamp}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-zinc-300">
                      {l.user}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-cyan-300">
                      {l.trigger_event}
                    </td>
                    <td className="px-3 py-2.5 text-zinc-300">
                      {l.action}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL: Simulate Threat ─────────────────────────────────── */}
      <AnimatePresence>
        {isSimModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/60">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Select Threat Simulation Scenario
                  </h3>
                </div>
                <button onClick={() => setIsSimModalOpen(false)} className="text-muted-foreground hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Target Threat Scenario
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {SCENARIO_PRESETS.map((sc) => {
                      const Icon = sc.icon;
                      const isSelected = simScenario.id === sc.id;
                      return (
                        <div
                          key={sc.id}
                          onClick={() => setSimScenario(sc)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'bg-cyan-950/30 border-cyan-500/60 text-white'
                              : 'bg-zinc-900/40 border-white/5 hover:border-white/20 text-zinc-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sc.badgeColor}`}>
                            <Icon size={16} />
                          </div>
                          <div className="space-y-0.5 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{sc.label}</span>
                              <Badge variant="outline" className={`text-[9px] uppercase ${sc.badgeColor}`}>
                                {sc.severity}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">{sc.desc}</p>
                            <div className="text-[10px] font-mono text-zinc-500 pt-1">
                              Target: {sc.targetHost} ({sc.targetIp})
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Autonomy Execution Tier
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSimExecutionMode('automatic')}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        simExecutionMode === 'automatic'
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                          : 'bg-zinc-900 border-white/5 text-zinc-400'
                      }`}
                    >
                      <div className="font-bold">Full Autonomous</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Executes all actions instantly</div>
                    </button>
                    <button
                      onClick={() => setSimExecutionMode('human_approval')}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        simExecutionMode === 'human_approval'
                          ? 'bg-amber-950/30 border-amber-500/50 text-amber-300'
                          : 'bg-zinc-900 border-white/5 text-zinc-400'
                      }`}
                    >
                      <div className="font-bold">Human Approval</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Pauses for operator ACK</div>
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex justify-end gap-2">
                  <button
                    onClick={() => setIsSimModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => triggerSimulation(simScenario, simExecutionMode)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white uppercase tracking-wider shadow-lg shadow-cyan-600/20"
                  >
                    Start Simulation
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Visual Playbook Builder (WHEN -> CONDITION -> THEN) ── */}
      <AnimatePresence>
        {isBuilderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/60">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Interactive Playbook Workflow Builder
                  </h3>
                </div>
                <button onClick={() => setIsBuilderOpen(false)} className="text-muted-foreground hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-zinc-400">Playbook Name</label>
                    <input
                      type="text"
                      value={builderName}
                      onChange={(e) => setBuilderName(e.target.value)}
                      placeholder="e.g. RANSOMWARE CONTAINMENT"
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-zinc-400">Category</label>
                    <select
                      value={builderCategory}
                      onChange={(e) => setBuilderCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="ransomware">Ransomware</option>
                      <option value="brute_force">Brute Force</option>
                      <option value="vision_ai">Vision AI</option>
                      <option value="data_exfiltration">Data Exfiltration</option>
                      <option value="malware">Malware</option>
                    </select>
                  </div>
                </div>

                {/* Visual Workflow Canvas */}
                <div className="space-y-3 pt-2">
                  {/* Step 1: WHEN */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[9px]">1</span>
                      WHEN (Trigger Event)
                    </div>
                    <select
                      value={builderTrigger}
                      onChange={(e) => setBuilderTrigger(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white"
                    >
                      <option value="threat_detected">Threat Event Detected</option>
                      <option value="critical_alert">Critical Severity Alert Fired</option>
                      <option value="case_opened">SOC Incident Case Opened</option>
                      <option value="manual">Manual Operator Trigger</option>
                    </select>
                  </div>

                  {/* Step 2: CONDITION */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-[9px]">2</span>
                      CONDITION (Rule Evaluator)
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={builderConditions[0]?.field || 'severity'}
                        onChange={(e) => setBuilderConditions([{ ...builderConditions[0], field: e.target.value }])}
                        className="px-2 py-1.5 rounded bg-zinc-900 border border-white/10 text-xs text-white"
                      >
                        <option value="severity">Severity</option>
                        <option value="threat_type">Threat Type</option>
                        <option value="source">Source</option>
                        <option value="confidence">Confidence</option>
                      </select>
                      <select
                        value={builderConditions[0]?.operator || '=='}
                        onChange={(e) => setBuilderConditions([{ ...builderConditions[0], operator: e.target.value }])}
                        className="px-2 py-1.5 rounded bg-zinc-900 border border-white/10 text-xs text-white"
                      >
                        <option value="==">equals (==)</option>
                        <option value=">=">greater/equal (&gt;=)</option>
                        <option value="in">in list (in)</option>
                      </select>
                      <input
                        type="text"
                        value={builderConditions[0]?.value || 'CRITICAL'}
                        onChange={(e) => setBuilderConditions([{ ...builderConditions[0], value: e.target.value }])}
                        placeholder="CRITICAL"
                        className="px-2 py-1.5 rounded bg-zinc-900 border border-white/10 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Step 3: THEN ACTIONS */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2.5">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[9px]">3</span>
                      THEN (Simulated Defense Action Pipeline)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AVAILABLE_ACTIONS.map((act) => {
                        const isSelected = builderActions.includes(act.id);
                        return (
                          <div
                            key={act.id}
                            onClick={() => {
                              setBuilderActions(
                                isSelected ? builderActions.filter(a => a !== act.id) : [...builderActions, act.id]
                              );
                            }}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all text-xs flex items-center justify-between ${
                              isSelected
                                ? 'bg-cyan-950/40 border-cyan-500/40 text-white'
                                : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:border-white/20'
                            }`}
                          >
                            <span className="font-semibold">{act.label}</span>
                            {isSelected && <Check size={14} className="text-cyan-400" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex justify-end gap-2">
                  <button
                    onClick={() => setIsBuilderOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePlaybook}
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white uppercase tracking-wider shadow-lg shadow-cyan-600/20"
                  >
                    Save Playbook
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: Delete Confirmation ─────────────────────────────── */}
      <AnimatePresence>
        {deleteTargetId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl p-5 max-w-sm w-full space-y-4"
            >
              <div className="flex items-center gap-2.5 text-red-400">
                <AlertTriangle size={20} />
                <h3 className="text-sm font-bold text-white uppercase">Confirm Deletion</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Are you sure you want to delete this response playbook? This action is recorded in the SOAR audit log.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => setDeleteTargetId(null)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 text-xs text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePlaybook}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
                >
                  Delete Playbook
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
