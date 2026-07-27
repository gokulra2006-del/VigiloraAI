import { MOCK_HEALTH } from "@/services/model-data";
import { useModelStore } from "@/hooks/use-model-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

export function ModelHealthMonitor() {
  const { getActiveModel } = useModelStore();
  const activeModel = getActiveModel();
  
  if (!activeModel) return null;
  
  const health = MOCK_HEALTH[activeModel.id] || MOCK_HEALTH["mod-001"]; // Fallback to 001 if no health data

  const statusIcons = {
    healthy: <CheckCircle2 className="text-success" size={20} />,
    degraded: <AlertTriangle className="text-warning" size={20} />,
    critical: <AlertTriangle className="text-destructive" size={20} />
  };

  const statusColors = {
    healthy: "success",
    degraded: "warning",
    critical: "destructive"
  } as const;

  // Format data for sparklines
  const latencyData = health.latencyTrend.map((v, i) => ({ value: v, index: i }));
  const errorData = health.errorRateTrend.map((v, i) => ({ value: v, index: i }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="text-primary" />
              System Health Overview
            </CardTitle>
            <Badge variant={statusColors[health.status]} className="capitalize flex items-center gap-1.5 px-3 py-1">
              {statusIcons[health.status]}
              {health.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Latency Sparkline */}
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm font-medium text-muted-foreground">P95 Latency</div>
                <div className="text-xl font-bold font-mono">{health.latencyTrend[health.latencyTrend.length - 1]}ms</div>
              </div>
              <div className="h-[60px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={latencyData}>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Line type="monotone" dataKey="value" stroke="var(--color-chart-4)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Error Rate Sparkline */}
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm font-medium text-muted-foreground">Error Rate</div>
                <div className="text-xl font-bold font-mono">{health.errorRateTrend[health.errorRateTrend.length - 1]}%</div>
              </div>
              <div className="h-[60px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={errorData}>
                    <YAxis domain={[0, 'auto']} hide />
                    <Line type="stepAfter" dataKey="value" stroke="var(--color-chart-5)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Throughput */}
            <div className="bg-muted/30 rounded-lg p-4 border flex flex-col justify-between">
               <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-muted-foreground">Throughput</div>
                <TrendingUp size={16} className="text-chart-1" />
              </div>
              <div>
                <div className="text-3xl font-bold font-mono">{health.throughputTrend[health.throughputTrend.length - 1]}</div>
                <div className="text-sm text-muted-foreground mt-1">inferences / sec</div>
              </div>
            </div>

          </div>

          {health.alerts.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold mb-2">Active Alerts</h4>
              {health.alerts.map(alert => (
                <div key={alert.id} className="flex items-start gap-3 bg-warning/10 border border-warning/20 text-warning-foreground p-3 rounded-md">
                  <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{alert.message}</p>
                    <p className="text-xs opacity-70 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
