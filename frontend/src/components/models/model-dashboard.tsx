import { useModelStore } from "@/hooks/use-model-store";
import { ModelCard } from "./model-card";
import { Card, CardContent } from "@/components/ui/card";
import { Cpu, Server, Zap, ShieldCheck } from "lucide-react";
import { MOCK_METRICS } from "@/services/model-data";
import { formatPercent } from "@/lib/utils";

export function ModelDashboard() {
  const { models } = useModelStore();
  
  const activeModels = models.filter(m => m.enabled);
  const totalInferences = activeModels.reduce((acc, m) => acc + (MOCK_METRICS[m.id]?.totalInferences || 0), 0);
  const avgAccuracy = activeModels.reduce((acc, m) => acc + (MOCK_METRICS[m.id]?.detectionAccuracy || 0), 0) / (activeModels.length || 1);

  return (
    <div className="space-y-8">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-muted/10">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Server size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Active Models</p>
              <h3 className="text-2xl font-bold">{activeModels.length} <span className="text-sm font-normal text-muted-foreground">/ {models.length}</span></h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/10">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-lg text-success">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Avg Accuracy</p>
              <h3 className="text-2xl font-bold">{formatPercent(avgAccuracy)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/10">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-warning/10 rounded-lg text-warning">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total Inferences</p>
              <h3 className="text-2xl font-bold">{(totalInferences / 1000000).toFixed(1)}M</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/10">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-chart-1/10 rounded-lg text-chart-1">
              <Cpu size={24} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Global GPU Load</p>
              <h3 className="text-2xl font-bold">42%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Models Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Deployed Models</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {models.map(model => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      </div>
    </div>
  );
}
