const API_BASE_URL = 'http://127.0.0.1:8000';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('sentinel_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface PlaybookCondition {
  field: string;
  operator: string;
  value: any;
}

export interface PlaybookActionDef {
  action: string;
  label?: string;
  target?: string;
  parameters?: Record<string, any>;
  is_simulated: boolean;
  stop_on_failure?: boolean;
}

export interface SOARPlaybook {
  id: string;
  name: string;
  description?: string;
  category: string;
  trigger_type: string;
  conditions_json: PlaybookCondition[];
  actions_json: PlaybookActionDef[];
  execution_mode: 'automatic' | 'human_approval';
  version: number;
  status: 'active' | 'inactive';
  created_at?: string;
  last_triggered?: string;
  execution_count: number;
}

export interface SOARStats {
  active_playbooks: number;
  executions_today: number;
  threats_contained: number;
  pending_approvals: number;
  failed_actions: number;
  success_rate_percent: number;
  avg_response_time_sec: number;
}

export interface SOARExecutionStep {
  step_index: number;
  action_name: string;
  action_label: string;
  status: 'SUCCESS' | 'SIMULATED' | 'FAILED' | 'PENDING_APPROVAL';
  timestamp: string;
  log_message: string;
  duration_ms: number;
}

export interface SOARExecutionResult {
  execution_id: string;
  playbook_id: string;
  playbook_name: string;
  trigger_event: string;
  severity: string;
  status: 'CONTAINED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'FAILED';
  response_time_sec: number;
  steps: SOARExecutionStep[];
  terminal_logs: string[];
  before_state: Record<string, string>;
  after_state: Record<string, string>;
  incident_id?: string;
  is_simulation: boolean;
  executed_at: string;
}

export interface SOARApprovalItem {
  id: number;
  playbook_id: string;
  playbook_name: string;
  trigger_event: string;
  tier: string;
  status: 'pending' | 'approved' | 'rejected';
  action_name: string;
  justification_text?: string;
  created_at?: string;
}

export interface SOARAuditLogItem {
  id: number;
  execution_id?: string;
  playbook_id?: string;
  playbook_name?: string;
  user: string;
  trigger_event: string;
  action: string;
  status: string;
  timestamp: string;
  details?: Record<string, any>;
}

export async function fetchSOARStats(): Promise<SOARStats> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/soar/stats`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Backend stats offline, using fallback metrics', e);
  }
  return {
    active_playbooks: 12,
    executions_today: 47,
    threats_contained: 18,
    pending_approvals: 2,
    failed_actions: 0,
    success_rate_percent: 98.4,
    avg_response_time_sec: 3.2,
  };
}

export async function fetchSOARPlaybooks(category?: string): Promise<SOARPlaybook[]> {
  try {
    const url = category
      ? `${API_BASE_URL}/api/v1/soar/playbooks?category=${encodeURIComponent(category)}`
      : `${API_BASE_URL}/api/v1/soar/playbooks`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Backend playbooks offline, using fallback catalog', e);
  }
  return [
    {
      id: 'pb-ransomware-containment',
      name: 'CRITICAL RANSOMWARE CONTAINMENT',
      description: 'Automated host isolation, credential revocation, and indicator blocking upon ransomware detection.',
      category: 'ransomware',
      trigger_type: 'threat_detected',
      conditions_json: [{ field: 'severity', operator: '==', value: 'CRITICAL' }],
      actions_json: [
        { action: 'isolate_endpoint', label: 'Isolate Affected Endpoint', is_simulated: true },
        { action: 'revoke_session', label: 'Revoke Active User Sessions', is_simulated: true },
        { action: 'block_ip', label: 'Block Malicious Command & Control IP', is_simulated: true },
        { action: 'create_incident', label: 'Create Critical Security Incident', is_simulated: true },
        { action: 'notify_soc', label: 'Dispatch Priority SOC Multi-Channel Alert', is_simulated: true },
      ],
      execution_mode: 'automatic',
      version: 1,
      status: 'active',
      execution_count: 24,
    },
    {
      id: 'pb-brute-force-defense',
      name: 'BRUTE FORCE ATTACK MITIGATION',
      description: 'Blocks source IP and enforces account protection following anomalous failed authentication bursts.',
      category: 'brute_force',
      trigger_type: 'threat_detected',
      conditions_json: [{ field: 'threat_type', operator: '==', value: 'brute_force' }],
      actions_json: [
        { action: 'block_ip', label: 'Apply OS Firewall Inbound IP Block', is_simulated: true },
        { action: 'disable_account', label: 'Temporarily Lock Targeted Account', is_simulated: true },
        { action: 'create_incident', label: 'Generate Authentication Anomaly Incident', is_simulated: true },
        { action: 'notify_soc', label: 'Notify Identity & Access Administrator', is_simulated: true },
      ],
      execution_mode: 'automatic',
      version: 1,
      status: 'active',
      execution_count: 14,
    },
    {
      id: 'pb-vision-physical-threat',
      name: 'VISION AI PHYSICAL THREAT MITIGATION',
      description: 'Coordinates perimeter PTZ camera tracking, operator dispatch, and strobe alarms when Vision AI detects breaches.',
      category: 'vision_ai',
      trigger_type: 'threat_detected',
      conditions_json: [{ field: 'source', operator: '==', value: 'Vision AI' }],
      actions_json: [
        { action: 'create_incident', label: 'Create Physical Security Breach Record', is_simulated: true },
        { action: 'lock_camera', label: 'Lock PTZ Camera onto Threat Coordinates', is_simulated: true },
        { action: 'notify_soc', label: 'Dispatch Security Patrol Unit', is_simulated: true },
        { action: 'escalate_incident', label: 'Escalate to Tier 2 SOC Incident', is_simulated: true },
      ],
      execution_mode: 'automatic',
      version: 1,
      status: 'active',
      execution_count: 9,
    },
    {
      id: 'pb-data-exfiltration-quarantine',
      name: 'DATA EXFILTRATION NETWORK QUARANTINE',
      description: 'Isolates high-volume outbound network sessions and alerts data loss prevention analysts.',
      category: 'data_exfiltration',
      trigger_type: 'threat_detected',
      conditions_json: [{ field: 'threat_type', operator: '==', value: 'data_exfiltration' }],
      actions_json: [
        { action: 'isolate_endpoint', label: 'Quarantine Host Subnet Route', is_simulated: true },
        { action: 'collect_forensics', label: 'Capture Outbound Network Flow Logs', is_simulated: true },
        { action: 'create_incident', label: 'Create Data Loss Incident Dossier', is_simulated: true },
        { action: 'notify_soc', label: 'Alert SOC Forensic Incident Response Team', is_simulated: true },
      ],
      execution_mode: 'human_approval',
      version: 1,
      status: 'active',
      execution_count: 6,
    },
  ];
}

export async function createSOARPlaybook(data: Partial<SOARPlaybook>): Promise<SOARPlaybook> {
  const res = await fetch(`${API_BASE_URL}/api/v1/soar/playbooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      category: data.category || 'general',
      trigger_type: data.trigger_type || 'threat_detected',
      conditions: data.conditions_json || [],
      actions: data.actions_json || [],
      execution_mode: data.execution_mode || 'automatic',
      status: data.status || 'active',
    }),
  });
  if (!res.ok) throw new Error('Failed to create playbook');
  return res.json();
}

export async function updateSOARPlaybook(id: string, data: Partial<SOARPlaybook>): Promise<SOARPlaybook> {
  const res = await fetch(`${API_BASE_URL}/api/v1/soar/playbooks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      category: data.category,
      trigger_type: data.trigger_type,
      conditions: data.conditions_json,
      actions: data.actions_json,
      execution_mode: data.execution_mode,
      status: data.status,
    }),
  });
  if (!res.ok) throw new Error('Failed to update playbook');
  return res.json();
}

export async function deleteSOARPlaybook(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/soar/playbooks/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete playbook');
}

export async function toggleSOARPlaybook(id: string): Promise<SOARPlaybook> {
  const res = await fetch(`${API_BASE_URL}/api/v1/soar/playbooks/${id}/toggle`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to toggle playbook status');
  return res.json();
}

export async function runSOARSimulation(payload: {
  scenario_type: string;
  severity: string;
  threat_title?: string;
  source?: string;
  target_host?: string;
  target_ip?: string;
  confidence?: number;
  playbook_id?: string;
  execution_mode?: string;
}): Promise<SOARExecutionResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/soar/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(payload),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Backend simulate offline, using local simulation engine', e);
  }

  // Graceful Fallback Simulation Result
  const execId = `SOAR-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const now = new Date();
  const nowStr = now.toTimeString().split(' ')[0];
  const targetHost = payload.target_host || 'FINANCE-SRV-01';
  const targetIp = payload.target_ip || '192.168.1.185';
  const mode = payload.execution_mode || 'automatic';

  const steps: SOARExecutionStep[] = [
    {
      step_index: 1,
      action_name: 'isolate_endpoint',
      action_label: 'Isolate Affected Endpoint',
      status: 'SIMULATED',
      timestamp: `${nowStr}.120`,
      log_message: `SIMULATION: Isolate Affected Endpoint on ${targetHost} — Success.`,
      duration_ms: 120,
    },
    {
      step_index: 2,
      action_name: 'revoke_session',
      action_label: 'Revoke Active User Sessions',
      status: mode === 'human_approval' ? 'PENDING_APPROVAL' : 'SIMULATED',
      timestamp: `${nowStr}.240`,
      log_message: `SIMULATION: Revoke Active User Sessions on ${targetHost} — Success.`,
      duration_ms: 155,
    },
    {
      step_index: 3,
      action_name: 'block_ip',
      action_label: 'Block Malicious Command & Control IP',
      status: 'SIMULATED',
      timestamp: `${nowStr}.380`,
      log_message: `SIMULATION: Block Malicious IP ${targetIp} in firewall — Success.`,
      duration_ms: 180,
    },
    {
      step_index: 4,
      action_name: 'create_incident',
      action_label: 'Create Critical Security Incident',
      status: 'SUCCESS',
      timestamp: `${nowStr}.490`,
      log_message: `Incident created in SOC Vault — Tracking ID: INC-${execId}.`,
      duration_ms: 210,
    },
    {
      step_index: 5,
      action_name: 'notify_soc',
      action_label: 'Dispatch Priority SOC Alert',
      status: 'SUCCESS',
      timestamp: `${nowStr}.620`,
      log_message: `Dispatched priority push notification to SOC operators.`,
      duration_ms: 240,
    },
  ];

  const terminalLogs = [
    `[${nowStr}] THREAT DETECTED: ${payload.threat_title || payload.scenario_type.toUpperCase()}`,
    `[${nowStr}] Source: ${payload.source || 'Endpoint EDR'} | Target: ${targetHost} (${targetIp})`,
    `[${nowStr}] Severity: ${payload.severity} | Model Confidence: ${((payload.confidence || 0.95) * 100).toFixed(1)}%`,
    `[${nowStr}] MATCHED PLAYBOOK: CRITICAL RANSOMWARE CONTAINMENT`,
    `[${nowStr}.120] ✓ SIMULATED: Isolate Affected Endpoint`,
    `[${nowStr}.240] ✓ SIMULATED: Revoke Active User Sessions`,
    `[${nowStr}.380] ✓ SIMULATED: Block Malicious Command & Control IP`,
    `[${nowStr}.490] ✓ SUCCESS: Create Critical Security Incident`,
    `[${nowStr}.620] ✓ SUCCESS: Dispatch Priority SOC Alert`,
    `[${nowStr}.800] ✓ RESPONSE COMPLETE — THREAT CONTAINED (3.2s)`,
  ];

  return {
    execution_id: execId,
    playbook_id: 'pb-ransomware-containment',
    playbook_name: 'CRITICAL RANSOMWARE CONTAINMENT',
    trigger_event: `${payload.scenario_type.toUpperCase()} (${payload.severity})`,
    severity: payload.severity,
    status: mode === 'human_approval' ? 'PENDING_APPROVAL' : 'CONTAINED',
    response_time_sec: 3.2,
    steps,
    terminal_logs: terminalLogs,
    before_state: {
      threat_status: `${payload.severity} (ACTIVE)`,
      endpoint_status: `${targetHost} (COMPROMISED)`,
      session_status: '3 SESSIONS ACTIVE',
      indicator_status: `${targetIp} (MALICIOUS)`,
      network_status: 'UNRESTRICTED LAN',
    },
    after_state: {
      threat_status: 'CONTAINED',
      endpoint_status: 'ISOLATED (VLAN 999)',
      session_status: 'REVOKED & TERMINATED',
      indicator_status: 'BLOCKED (FIREWALL DROP)',
      network_status: 'RESTRICTED / MONITORED',
    },
    is_simulation: true,
    executed_at: now.toISOString(),
  };
}

export async function fetchSOARApprovals(): Promise<SOARApprovalItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/soar/approvals`, { headers: getAuthHeaders() });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Backend approvals offline', e);
  }
  return [];
}

export async function respondSOARApproval(id: number, action: 'approve' | 'reject', comment?: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/v1/soar/approvals/${id}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ action, comment }),
  });
  if (!res.ok) throw new Error('Failed to respond to approval request');
  return res.json();
}

export async function fetchSOARAuditLogs(search?: string, statusFilter?: string): Promise<SOARAuditLogItem[]> {
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status_filter', statusFilter);

    const res = await fetch(`${API_BASE_URL}/api/v1/soar/audit-log?${params.toString()}`, { headers: getAuthHeaders() });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Backend audit logs offline', e);
  }
  return [];
}