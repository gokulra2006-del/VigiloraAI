import type { AIModel } from "@/types/models";
import { MOCK_METRICS } from "@/services/model-data";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Activity, Cpu, Database, Server, Zap } from "lucide-react";
import { formatPercent, formatMs, cn } from "@/lib/utils";
import { useModelStore } from "@/hooks/use-model-store";

interface ModelCardProps {
  model: AIModel;
}

export function ModelCard({ model }: ModelCardProps) {
  const { toggleModelStatus, setActiveModelId, activeModelId } = useModelStore();
  const metrics = MOCK_METRICS[model.id];
  const isActive = activeModelId === model.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleModelStatus(model.id);
  };

  const statusColors = {
    running: "success",
    loading: "warning",
    offline: "secondary",
    error: "destructive"
  } as const;

  return (
    <Card 
      className={cn(
        "transition-all duration-300 cursor-pointer overflow-hidden relative",
        isActive ? "border-primary glow-cyan ring-1 ring-primary" : "hover:border-primary/50",
        !model.enabled && "opacity-75"
      )}
      onClick={() => model.enabled && setActiveModelId(model.id)}
    >
      {isActive && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 blur-2xl rounded-full" />
      )}
      <CardHeader className="pb-4 relative z-10">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{model.name}</h3>
              {isActive && <Badge variant="default" className="text-[10px]">Active</Badge>}
            </div>
            <div className="flex gap-2">
              <Badge variant={statusColors[model.status]} className="capitalize">
                {model.status === 'running' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />}
                {model.status}
              </Badge>
              <Badge variant="outline">{model.version}</Badge>
            </div>
          </div>
          <div onClick={handleToggle}>
            <Switch checked={model.enabled} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4 relative z-10">
        <p className="text-sm text-muted-foreground mb-6 line-clamp-2 min-h-[40px]">
          {model.description}
        </p>

        {metrics ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Cpu size={14} /> GPU Usage</span>
                <span className={metrics.gpuUsage > 80 ? "text-destructive" : ""}>{formatPercent(metrics.gpuUsage)}</span>
              </div>
              <Progress value={metrics.gpuUsage} indicatorClassName={metrics.gpuUsage > 80 ? "bg-destructive" : "bg-primary"} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Database size={14} /> RAM Usage</span>
                <span>{formatPercent(metrics.ramUsage)}</span>
              </div>
              <Progress value={metrics.ramUsage} indicatorClassName="bg-primary" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col gap-1 bg-muted/50 p-2.5 rounded-md">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Zap size={12}/> Speed</span>
                <span className="font-mono text-sm font-semibold">{metrics.inferenceSpeed} FPS</span>
              </div>
              <div className="flex flex-col gap-1 bg-muted/50 p-2.5 rounded-md">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Activity size={12}/> Latency</span>
                <span className="font-mono text-sm font-semibold">{formatMs(metrics.avgResponseTime)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border/50">
            <Server size={24} className="mb-2 opacity-50" />
            <span className="text-sm">Model Offline</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
