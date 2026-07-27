import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Settings, Bell, Shield, Database, Layout, Webhook, Network, Moon, Sun, Monitor, Save, Key, Lock, Wifi, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { AlertChannelsPanel } from '@/components/settings/alert-channels-panel';

// Simple hook for local storage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(error);
    }
  };
  return [storedValue, setValue] as const;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  // General Settings
  const [backendUrl, setBackendUrl] = useLocalStorage('sentinel_backend_url', 'http://localhost:8000/api/v1');
  const [globalThreshold, setGlobalThreshold] = useLocalStorage('sentinel_global_threshold', 75);
  
  // Alerts
  const [alertCritical, setAlertCritical] = useLocalStorage('sentinel_alert_critical', true);
  const [alertHealth, setAlertHealth] = useLocalStorage('sentinel_alert_health', true);
  const [alertDigest, setAlertDigest] = useLocalStorage('sentinel_alert_digest', false);

  // Integrations
  const [slackWebhook, setSlackWebhook] = useLocalStorage('sentinel_slack_webhook', '');
  const [twilioKey, setTwilioKey] = useLocalStorage('sentinel_twilio_key', '');

  // UI
  const [theme, setTheme] = useLocalStorage('sentinel_theme', 'dark');

  // Security
  const [require2fa, setRequire2fa] = useLocalStorage('sentinel_require_2fa', true);
  const [sessionTimeout, setSessionTimeout] = useLocalStorage('sentinel_session_timeout', 30);
  const [ipWhitelist, setIpWhitelist] = useLocalStorage('sentinel_ip_whitelist', '192.168.1.0/24\n10.0.0.0/8');

  // Network
  const [proxyUrl, setProxyUrl] = useLocalStorage('sentinel_proxy_url', '');
  const [enableTLS, setEnableTLS] = useLocalStorage('sentinel_enable_tls', true);
  const [dbConnection, setDbConnection] = useLocalStorage('sentinel_db_connection', 'postgresql://user:pass@localhost:5432/sentinel');

  const tabs = [
    { id: 'general', icon: <Settings size={14} />, label: 'General' },
    { id: 'alerts', icon: <Bell size={14} />, label: 'Notifications' },
    { id: 'channels', icon: <Webhook size={14} />, label: 'Alert Channels' },
    { id: 'security', icon: <Shield size={14} />, label: 'Security & Auth' },
    { id: 'integrations', icon: <Key size={14} />, label: 'Integration Keys' },
    { id: 'network', icon: <Network size={14} />, label: 'Network Config' },
    { id: 'ui', icon: <Layout size={14} />, label: 'Appearance' },
  ];

  const handleSave = () => {
    // In a real app this would POST to an API
    alert('Settings saved to local storage successfully.');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Platform Settings</h1>
          <p className="text-muted-foreground mt-1 text-[13px]">Configure global application preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-1">
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-md transition-colors ${
                activeTab === tab.id 
                  ? 'bg-white text-black shadow-sm' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="md:col-span-3 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {activeTab === 'general' && (
                <>
                  <Card className="bg-zinc-900/40 border-white/5">
                    <CardHeader className="pb-2 border-b border-white/5">
                      <CardTitle className="text-[14px] font-medium text-white">System Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Platform Version</p>
                          <p className="font-mono text-[13px] text-white">v2.4.1-enterprise</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">License Node</p>
                          <p className="font-mono text-[13px] text-white">Valid until 2027</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Database</p>
                          <p className="text-[13px] font-medium text-emerald-500 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected (PostgreSQL)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/40 border-white/5">
                    <CardHeader className="pb-2 border-b border-white/5">
                      <CardTitle className="text-[14px] font-medium text-white">API Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                      <div className="space-y-2">
                        <label className="text-[12px] font-medium text-white">Backend URL</label>
                        <input type="text" value={backendUrl} onChange={(e) => setBackendUrl(e.target.value)} className="w-full h-9 px-3 bg-[#09090b] border border-white/10 rounded-md text-[13px] text-white focus:outline-none focus:border-white/20 transition-colors font-mono" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[12px] font-medium text-white">Global Threshold</label>
                        <div className="flex items-center gap-4">
                          <input type="range" value={globalThreshold} onChange={(e) => setGlobalThreshold(parseInt(e.target.value))} className="flex-1 accent-white" />
                          <span className="text-[13px] font-mono text-white w-12 text-right">{globalThreshold}%</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Minimum confidence score required to trigger an automated alert.</p>
                      </div>
                      <div className="pt-2">
                        <button onClick={handleSave} className="h-9 px-4 bg-white text-black rounded-md text-[13px] font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"><Save size={14}/> Save Changes</button>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {activeTab === 'alerts' && (
                <Card className="bg-zinc-900/40 border-white/5">
                  <CardHeader className="pb-2 border-b border-white/5">
                    <CardTitle className="text-[14px] font-medium text-white">Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-white">Critical Incidents</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Immediate notification for critical security breaches</p>
                      </div>
                      <Switch checked={alertCritical} onCheckedChange={setAlertCritical} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-white">System Health</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Alerts for node offline or high latency</p>
                      </div>
                      <Switch checked={alertHealth} onCheckedChange={setAlertHealth} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-white">Daily Digest</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Email summary of daily activities</p>
                      </div>
                      <Switch checked={alertDigest} onCheckedChange={setAlertDigest} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'channels' && (
                <AlertChannelsPanel />
              )}

              {activeTab === 'security' && (
                <Card className="bg-zinc-900/40 border-white/5">
                  <CardHeader className="pb-2 border-b border-white/5">
                    <CardTitle className="flex items-center gap-2 text-[14px] font-medium text-white"><Shield size={16} className="text-muted-foreground" /> Security & Authentication</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-white">Require 2FA</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Mandate two-factor authentication for all SOC analysts.</p>
                      </div>
                      <Switch checked={require2fa} onCheckedChange={setRequire2fa} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-white">Session Timeout (minutes)</label>
                      <input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(parseInt(e.target.value))} className="w-32 h-9 px-3 bg-[#09090b] border border-white/10 rounded-md text-[13px] text-white focus:outline-none focus:border-white/20 transition-colors font-mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-white">IP Whitelist (CIDR notation)</label>
                      <textarea value={ipWhitelist} onChange={(e) => setIpWhitelist(e.target.value)} rows={3} className="w-full px-3 py-2 bg-[#09090b] border border-white/10 rounded-md text-[13px] text-white focus:outline-none focus:border-white/20 transition-colors font-mono resize-none"></textarea>
                      <p className="text-[11px] text-muted-foreground">One subnet per line. Access will be blocked from unlisted IPs.</p>
                    </div>
                    <div className="pt-2">
                      <button onClick={handleSave} className="h-9 px-4 bg-white text-black rounded-md text-[13px] font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"><Lock size={14}/> Save Security Config</button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'network' && (
                <Card className="bg-zinc-900/40 border-white/5">
                  <CardHeader className="pb-2 border-b border-white/5">
                    <CardTitle className="flex items-center gap-2 text-[14px] font-medium text-white"><Network size={16} className="text-muted-foreground" /> Network & Database Config</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium text-white">Require TLS/SSL</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Enforce encrypted connections for all telemetry data.</p>
                      </div>
                      <Switch checked={enableTLS} onCheckedChange={setEnableTLS} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-white">Proxy URL</label>
                      <input type="text" placeholder="http://proxy.internal:3128" value={proxyUrl} onChange={(e) => setProxyUrl(e.target.value)} className="w-full h-9 px-3 bg-[#09090b] border border-white/10 rounded-md text-[13px] text-white focus:outline-none focus:border-white/20 transition-colors font-mono placeholder:text-zinc-600" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-white">Primary Database Connection String</label>
                      <div className="relative">
                        <input type="password" value={dbConnection} onChange={(e) => setDbConnection(e.target.value)} className="w-full h-9 px-3 pr-10 bg-[#09090b] border border-white/10 rounded-md text-[13px] text-white focus:outline-none focus:border-white/20 transition-colors font-mono" />
                        <Database size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="pt-2">
                      <button onClick={handleSave} className="h-9 px-4 bg-white text-black rounded-md text-[13px] font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"><Server size={14}/> Save Network Config</button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'integrations' && (
                <Card className="bg-zinc-900/40 border-white/5">
                  <CardHeader className="pb-2 border-b border-white/5">
                    <CardTitle className="text-[14px] font-medium text-white">API Keys & Webhooks</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-white">Slack Webhook URL</label>
                      <input type="password" value={slackWebhook} onChange={(e) => setSlackWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/..." className="w-full h-9 px-3 bg-[#09090b] border border-white/10 rounded-md text-[13px] text-muted-foreground focus:outline-none focus:border-white/20 transition-colors font-mono placeholder:text-zinc-600" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[12px] font-medium text-white">Twilio API Key (SMS)</label>
                      <input type="password" value={twilioKey} onChange={(e) => setTwilioKey(e.target.value)} placeholder="SK..." className="w-full h-9 px-3 bg-[#09090b] border border-white/10 rounded-md text-[13px] text-muted-foreground focus:outline-none focus:border-white/20 transition-colors font-mono placeholder:text-zinc-600" />
                    </div>
                    <div className="pt-2">
                      <button onClick={handleSave} className="h-9 px-4 bg-white text-black rounded-md text-[13px] font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"><Key size={14}/> Update Keys</button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'ui' && (
                <Card className="bg-zinc-900/40 border-white/5">
                  <CardHeader className="pb-2 border-b border-white/5">
                    <CardTitle className="text-[14px] font-medium text-white">Appearance & Theming</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    <div className="space-y-3">
                      <label className="text-[12px] font-medium text-white">Theme Preference</label>
                      <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => setTheme('dark')} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-md border ${theme === 'dark' ? 'border-primary bg-primary/5 text-white' : 'border-white/10 bg-[#09090b] text-muted-foreground hover:bg-white/5'}`}>
                          <Moon size={20} />
                          <span className="text-[12px] font-medium">Dark (Default)</span>
                        </button>
                        <button onClick={() => setTheme('light')} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-md border ${theme === 'light' ? 'border-primary bg-primary/5 text-white' : 'border-white/10 bg-[#09090b] text-muted-foreground hover:bg-white/5'}`}>
                          <Sun size={20} />
                          <span className="text-[12px] font-medium">Light</span>
                        </button>
                        <button onClick={() => setTheme('system')} className={`flex flex-col items-center justify-center gap-2 p-4 rounded-md border ${theme === 'system' ? 'border-primary bg-primary/5 text-white' : 'border-white/10 bg-[#09090b] text-muted-foreground hover:bg-white/5'}`}>
                          <Monitor size={20} />
                          <span className="text-[12px] font-medium">System</span>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
