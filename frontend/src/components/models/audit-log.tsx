import { MOCK_AUDIT_LOGS } from "@/services/model-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

export function AuditLog() {
  const severityColors = {
    info: "default",
    warning: "warning",
    critical: "destructive"
  } as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldAlert className="text-primary" />
          Security & Audit Logs
        </CardTitle>
        <CardDescription>Track all system changes, deployments, and alerts.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>User / System</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_AUDIT_LOGS.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString(undefined, {
                    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </TableCell>
                <TableCell className="font-medium">{log.user}</TableCell>
                <TableCell>
                  <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground">{log.action}</code>
                </TableCell>
                <TableCell>{log.target}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={severityColors[log.severity]}>
                    {log.severity}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
