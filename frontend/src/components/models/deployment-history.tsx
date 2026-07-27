import { MOCK_DEPLOYMENTS } from "@/services/model-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, RotateCcw } from "lucide-react";

export function DeploymentHistory() {
  const statusColors = {
    "success": "success",
    "failed": "destructive",
    "in-progress": "warning",
    "rolled-back": "secondary"
  } as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="text-primary" />
          Deployment History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Triggered By</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_DEPLOYMENTS.map((dep) => (
              <TableRow key={dep.id}>
                <TableCell className="whitespace-nowrap font-medium">
                  {new Date(dep.deployedAt).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </TableCell>
                <TableCell>{dep.modelName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-muted-foreground">{dep.fromVersion}</span>
                    <span className="text-muted-foreground">→</span>
                    <span>{dep.toVersion}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[dep.status] || "default"} className="capitalize">
                    {dep.status.replace('-', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{dep.deployedBy}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!dep.rollbackAvailable}
                    className="h-8"
                  >
                    <RotateCcw size={14} className="mr-2" />
                    Rollback
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
