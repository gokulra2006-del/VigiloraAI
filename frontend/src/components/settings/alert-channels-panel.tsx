import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, SendHorizonal, Pencil, X, Check, Loader2,
  Bell, MessageSquare, Mail, Phone, Webhook, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  AlertChannel, ChannelType, SeverityThreshold,
  fetchAlertChannels, createAlertChannel, updateAlertChannel,
  deleteAlertChannel, testAlertChannel,
} from '@/services/api/alerting';

// ─── Constants ──────────────────────────────────────────────────────────────

const CHANNEL_META: Record<ChannelType, { label: string; icon: React.ReactNode; color: string }> = {
  slack:    { label: 'Slack',    icon: <MessageSquare size={14} />, color: 'text-emerald-400' },
  discord:  { label: 'Discord',  icon: <Webhook size={14} />,       color: 'text-indigo-400'  },
  telegram: { label: 'Telegram', icon: <Bell size={14} />,          color: 'text-sky-400'     },
  email:    { label: 'Email',    icon: <Mail size={14} />,           color: 'text-amber-400'   },
  sms:      { label: 'SMS',      icon: <Phone size={14} />,          color: 'text-pink-400'    },
};

const SEVERITY_OPTIONS: SeverityThreshold[] = ['critical', 'high', 'medium', 'low'];

const SEVERITY_BADGE: Record<SeverityThreshold, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low:      'bg-green-500/20 text-green-400 border-green-500/30',
};

// ─── Modal Form ─────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  channel_type: ChannelType;
  webhook_url: string;
  bot_token: string;
  chat_id: string;
  email_address: string;
  phone_number: string;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_password: string;
  smtp_use_tls: boolean;
  twilio_sid: string;
  twilio_token: string;
  twilio_from: string;
  severity_threshold: SeverityThreshold;
  enabled: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  channel_type: 'slack',
  webhook_url: '',
  bot_token: '',
  chat_id: '',
  email_address: '',
  phone_number: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_username: '',
  smtp_password: '',
  smtp_use_tls: true,
  twilio_sid: '',
  twilio_token: '',
  twilio_from: '',
  severity_threshold: 'high',
  enabled: true,
};

function formToPayload(form: FormState) {
  const base = {
    name: form.name,
    channel_type: form.channel_type,
    severity_threshold: form.severity_threshold,
    enabled: form.enabled,
    incident_types: null,
  };

  if (form.channel_type === 'slack' || form.channel_type === 'discord') {
    return { ...base, webhook_url: form.webhook_url };
  }
  if (form.channel_type === 'telegram') {
    return { ...base, bot_token: form.bot_token, chat_id: form.chat_id };
  }
  if (form.channel_type === 'email') {
    return {
      ...base,
      email_address: form.email_address,
      smtp_config: {
        host: form.smtp_host,
        port: parseInt(form.smtp_port, 10),
        username: form.smtp_username,
        password: form.smtp_password,
        use_tls: form.smtp_use_tls,
      },
    };
  }
  if (form.channel_type === 'sms') {
    return {
      ...base,
      phone_number: form.phone_number,
      twilio_config: {
        account_sid: form.twilio_sid,
        auth_token: form.twilio_token,
        from_number: form.twilio_from,
      },
    };
  }
  return base;
}

interface ChannelModalProps {
  initial?: Partial<FormState>;
  onClose: () => void;
  onSave: (form: FormState) => Promise<void>;
}

function ChannelModal({ initial, onClose, onSave }: ChannelModalProps) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof FormState, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save channel.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full h-9 px-3 bg-[#09090b] border border-white/10 rounded-md text-[13px] text-white focus:outline-none focus:border-white/20 transition-colors font-mono placeholder:text-zinc-600';
  const labelCls = 'block text-[12px] font-medium text-white mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="font-semibold text-white text-[15px]">
            {initial?.name ? 'Edit Alert Channel' : 'Add Alert Channel'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Channel Type Selector */}
          <div>
            <label className={labelCls}>Channel Type</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(CHANNEL_META) as ChannelType[]).map(type => {
                const meta = CHANNEL_META[type];
                const active = form.channel_type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set('channel_type', type)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-[11px] font-medium transition-all ${
                      active
                        ? 'border-white/30 bg-white/5 text-white'
                        : 'border-white/5 bg-zinc-950 text-muted-foreground hover:bg-white/5'
                    }`}
                  >
                    <span className={active ? meta.color : ''}>{meta.icon}</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className={labelCls}>Display Name</label>
            <input
              className={inputCls}
              placeholder="e.g. #security-alerts"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          {/* Type-specific fields */}
          {(form.channel_type === 'slack' || form.channel_type === 'discord') && (
            <div>
              <label className={labelCls}>Webhook URL</label>
              <input
                className={inputCls}
                type="password"
                placeholder={form.channel_type === 'slack' ? 'https://hooks.slack.com/services/...' : 'https://discord.com/api/webhooks/...'}
                value={form.webhook_url}
                onChange={e => set('webhook_url', e.target.value)}
              />
            </div>
          )}

          {form.channel_type === 'telegram' && (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Bot Token</label>
                <input className={inputCls} type="password" placeholder="123456789:AAF..." value={form.bot_token} onChange={e => set('bot_token', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Chat ID</label>
                <input className={inputCls} placeholder="-100123456789" value={form.chat_id} onChange={e => set('chat_id', e.target.value)} />
              </div>
            </div>
          )}

          {form.channel_type === 'email' && (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Recipient Email Address</label>
                <input className={inputCls} type="email" placeholder="soc-team@company.com" value={form.email_address} onChange={e => set('email_address', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>SMTP Host</label>
                  <input className={inputCls} placeholder="smtp.gmail.com" value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Port</label>
                  <input className={inputCls} type="number" placeholder="587" value={form.smtp_port} onChange={e => set('smtp_port', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Username</label>
                  <input className={inputCls} placeholder="alerts@company.com" value={form.smtp_username} onChange={e => set('smtp_username', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Password / App Key</label>
                  <input className={inputCls} type="password" placeholder="••••••••" value={form.smtp_password} onChange={e => set('smtp_password', e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-white">Use TLS/STARTTLS</span>
                <Switch checked={form.smtp_use_tls} onCheckedChange={v => set('smtp_use_tls', v)} />
              </div>
            </div>
          )}

          {form.channel_type === 'sms' && (
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Recipient Phone Number</label>
                <input className={inputCls} placeholder="+14155552671" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Twilio Account SID</label>
                <input className={inputCls} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={form.twilio_sid} onChange={e => set('twilio_sid', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Twilio Auth Token</label>
                <input className={inputCls} type="password" placeholder="••••••••••••••••" value={form.twilio_token} onChange={e => set('twilio_token', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Twilio From Number</label>
                <input className={inputCls} placeholder="+18005551234" value={form.twilio_from} onChange={e => set('twilio_from', e.target.value)} />
              </div>
            </div>
          )}

          {/* Severity Threshold */}
          <div>
            <label className={labelCls}>Minimum Severity to Trigger</label>
            <div className="flex gap-2">
              {SEVERITY_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('severity_threshold', s)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-all capitalize ${
                    form.severity_threshold === s
                      ? SEVERITY_BADGE[s]
                      : 'border-white/5 bg-zinc-950 text-muted-foreground hover:bg-white/5'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Alerts will only fire for incidents at or above this severity level.
            </p>
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[13px] font-medium text-white">Enable Channel</p>
              <p className="text-[11px] text-muted-foreground">Disable to pause without deleting.</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={v => set('enabled', v)} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-9 bg-white text-black rounded-md text-[13px] font-medium hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Saving…' : 'Save Channel'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-9 border border-white/10 text-muted-foreground rounded-md text-[13px] hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export function AlertChannelsPanel() {
  const [channels, setChannels] = useState<AlertChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AlertChannel | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAlertChannels();
      setChannels(data);
    } catch {
      // silently fail — no data shown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form: FormState) => {
    const payload = formToPayload(form);
    await createAlertChannel(payload as Parameters<typeof createAlertChannel>[0]);
    await load();
  };

  const handleUpdate = async (form: FormState) => {
    if (!editTarget) return;
    const payload = formToPayload(form);
    await updateAlertChannel(editTarget.id, payload);
    await load();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAlertChannel(id);
      setChannels(prev => prev.filter(c => c.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testAlertChannel(id);
      setTestResults(prev => ({ ...prev, [id]: result }));
      setTimeout(() => setTestResults(prev => { const n = { ...prev }; delete n[id]; return n; }), 5000);
    } catch {
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: 'Request failed.' } }));
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleEnabled = async (channel: AlertChannel) => {
    await updateAlertChannel(channel.id, { enabled: !channel.enabled });
    setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, enabled: !c.enabled } : c));
  };

  const editFormFromChannel = (ch: AlertChannel): Partial<FormState> => ({
    name: ch.name,
    channel_type: ch.channel_type,
    webhook_url: ch.webhook_url || '',
    chat_id: ch.chat_id || '',
    email_address: ch.email_address || '',
    phone_number: ch.phone_number || '',
    severity_threshold: ch.severity_threshold,
    enabled: ch.enabled,
  });

  return (
    <>
      <AnimatePresence>
        {(showModal || editTarget) && (
          <ChannelModal
            initial={editTarget ? editFormFromChannel(editTarget) : undefined}
            onClose={() => { setShowModal(false); setEditTarget(null); }}
            onSave={editTarget ? handleUpdate : handleCreate}
          />
        )}
      </AnimatePresence>

      <Card className="bg-zinc-900/40 border-white/5">
        <CardHeader className="pb-2 border-b border-white/5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[14px] font-medium text-white">Alert Channels</CardTitle>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 h-8 px-3 bg-white text-black rounded-md text-[12px] font-medium hover:bg-zinc-200 transition-colors"
            >
              <Plus size={13} /> Add Channel
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Bell size={32} className="mx-auto text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">No alert channels configured.</p>
              <p className="text-[11px] text-muted-foreground/60">
                Add a Slack, Discord, Telegram, Email, or SMS channel to receive automated notifications.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {channels.map(ch => {
                const meta = CHANNEL_META[ch.channel_type];
                const testResult = testResults[ch.id];
                return (
                  <motion.div
                    key={ch.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950/50 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-md bg-zinc-900 flex items-center justify-center ${meta.color}`}>
                      {meta.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-white truncate">{ch.name}</p>
                        <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded capitalize">{meta.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${SEVERITY_BADGE[ch.severity_threshold]}`}>
                          ≥ {ch.severity_threshold}
                        </span>
                      </div>
                      {testResult && (
                        <p className={`text-[11px] mt-0.5 ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                          {testResult.success ? '✓' : '✕'} {testResult.message}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={ch.enabled}
                        onCheckedChange={() => handleToggleEnabled(ch)}
                      />
                      <button
                        onClick={() => handleTest(ch.id)}
                        disabled={testingId === ch.id}
                        title="Send test alert"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-sky-400 hover:bg-sky-400/10 transition-colors disabled:opacity-40"
                      >
                        {testingId === ch.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <SendHorizonal size={14} />}
                      </button>
                      <button
                        onClick={() => setEditTarget(ch)}
                        title="Edit channel"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(ch.id)}
                        disabled={deletingId === ch.id}
                        title="Delete channel"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                      >
                        {deletingId === ch.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-zinc-900/40 border-white/5">
        <CardContent className="pt-4">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            <span className="text-white font-medium">How it works:</span> When a new incident is created, Sentinel-AI automatically evaluates all enabled channels. Alerts fire only if the incident severity meets the channel's minimum threshold. The pipeline's <code className="font-mono bg-zinc-800 px-1 py-0.5 rounded text-xs">POST /incidents/</code> call triggers this automatically — no manual steps needed.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
