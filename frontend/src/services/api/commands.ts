const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export interface ParsedCommand {
  transcript: string;
  intent: string;
  target?: string;
  confidence: number;
  risk_level: string;
  simulation: boolean;
  confirmation_required: boolean;
}

export interface CommandExecutionResult {
  status: string;
  message: string;
  action_log: string[];
}

export interface CommandAudit {
  id: number;
  user: string;
  transcript: string;
  intent: string;
  target?: string;
  authorization_result: string;
  confirmation_result: string;
  execution_result: string;
  mode: string;
  timestamp: string;
}

export const parseVoiceCommand = async (transcript: string): Promise<ParsedCommand> => {
  const response = await fetch(`${API_BASE_URL}/commands/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript })
  });
  if (!response.ok) throw new Error('Failed to parse command');
  return response.json();
};

export const executeVoiceCommand = async (command: ParsedCommand): Promise<CommandExecutionResult> => {
  const response = await fetch(`${API_BASE_URL}/commands/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: command.intent,
      target: command.target,
      transcript: command.transcript,
      simulation: command.simulation
    })
  });
  if (!response.ok) throw new Error('Failed to execute command');
  return response.json();
};

export const fetchCommandHistory = async (): Promise<CommandAudit[]> => {
  const response = await fetch(`${API_BASE_URL}/commands/history`);
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
};

export const fetchCommandStatus = async (): Promise<Record<string, string>> => {
  const response = await fetch(`${API_BASE_URL}/commands/status`);
  if (!response.ok) throw new Error('Failed to fetch status');
  return response.json();
};

export const startDemoSequence = async (): Promise<{ sequence: any[] }> => {
  const response = await fetch(`${API_BASE_URL}/commands/demo`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to get demo sequence');
  return response.json();
};
