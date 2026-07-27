import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Line, LineChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_PERFORMANCE_CHART } from "@/services/model-data";
import { useModelStore } from "@/hooks/use-model-store";

export function PerformanceCharts() {
  const { getActiveModel } = useModelStore();
  const activeModel = getActiveModel();
  
  const data = MOCK_PERFORMANCE_CHART;

  if (!activeModel) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Inference Throughput</CardTitle>
          <CardDescription>Inferences per second (IPS) over 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                />
                <Area type="monotone" dataKey="throughput" stroke="var(--color-chart-1)" strokeWidth={2} fillOpacity={1} fill="url(#colorThroughput)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detection Accuracy & Latency</CardTitle>
          <CardDescription>Accuracy (%) vs Response Time (ms)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="timestamp" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[80, 100]} />
                <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-foreground)' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="accuracy" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="latency" stroke="var(--color-chart-4)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
