import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelDashboard } from "@/components/models/model-dashboard";
import { ModelHealthMonitor } from "@/components/models/model-health-monitor";
import { PerformanceCharts } from "@/components/models/performance-charts";
import { DeploymentHistory } from "@/components/models/deployment-history";
import { AuditLog } from "@/components/models/audit-log";
import { UsageStatistics } from "@/components/models/usage-statistics";
import { ModelSettings } from "@/components/models/model-settings";
import { PipelineBuilder } from "@/components/models/pipeline-builder";
import { ModelStoreProvider } from "@/hooks/use-model-store";

export function AIModelsPage() {
  return (
    <ModelStoreProvider>
      <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">AI Models</h2>
            <p className="text-muted-foreground mt-1 text-[13px]">
              Manage, monitor, and configure detection models across your deployment.
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard">
          <div className="flex justify-between items-center mb-6 overflow-x-auto pb-2">
            <TabsList>
              <TabsTrigger value="dashboard">Overview</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline Builder</TabsTrigger>
              <TabsTrigger value="health">Health & Metrics</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="deployments">Deployments</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
            <ModelDashboard />
          </TabsContent>
          
          <TabsContent value="pipeline" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
             <PipelineBuilder />
          </TabsContent>

          <TabsContent value="health" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
             <ModelHealthMonitor />
          </TabsContent>
          
          <TabsContent value="performance" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
             <PerformanceCharts />
          </TabsContent>

          <TabsContent value="usage" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
             <UsageStatistics />
          </TabsContent>

          <TabsContent value="deployments" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
             <DeploymentHistory />
          </TabsContent>

          <TabsContent value="audit" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
             <AuditLog />
          </TabsContent>

          <TabsContent value="settings" className="animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
             <ModelSettings />
          </TabsContent>
        </Tabs>
      </div>
    </ModelStoreProvider>
  );
}
