/* ── AI Model Management Types ── */

export type ModelStatus = "running" | "loading" | "offline" | "error";
export type ModelPriority = "primary" | "fallback" | "experimental";
export type DeploymentStatus = "success" | "failed" | "rolled-back" | "in-progress";
export type AuditAction =
  | "model.activated"
  | "model.deactivated"
  | "model.deployed"
  | "model.rolled-back"
  | "model.config-changed"
  | "model.threshold-updated"
  | "system.startup"
  | "system.health-check";
export type AuditSeverity = "info" | "warning" | "critical";

export interface AIModel {
  id: string;
  name: string;
  version: string;
  architecture: string;
  description: string;
  status: ModelStatus;
  priority: ModelPriority;
  enabled: boolean;
  isActive: boolean;
  /** Size in MB */
  size: number;
  /** When this model was last deployed */
  lastDeployed: string;
  /** Tags for filtering */
  tags: string[];
}

export interface ModelMetrics {
  modelId: string;
  gpuUsage: number;
  cpuUsage: number;
  ramUsage: number;
  vramUsage: number;
  /** Frames per second */
  inferenceSpeed: number;
  /** Average response time in ms */
  avgResponseTime: number;
  /** Detection accuracy percentage */
  detectionAccuracy: number;
  /** Confidence threshold (0-1) */
  confidenceThreshold: number;
  /** False positive rate percentage */
  falsePositiveRate: number;
  /** False negative rate percentage */
  falseNegativeRate: number;
  /** Total inferences made */
  totalInferences: number;
  /** Uptime in hours */
  uptime: number;
  /** Temperature in celsius */
  gpuTemperature: number;
  /** Throughput in inferences/sec */
  throughput: number;
}

export interface ModelHealthStatus {
  modelId: string;
  status: "healthy" | "degraded" | "critical";
  latencyTrend: number[];
  throughputTrend: number[];
  errorRateTrend: number[];
  memoryTrend: number[];
  lastHealthCheck: string;
  alerts: HealthAlert[];
}

export interface HealthAlert {
  id: string;
  message: string;
  severity: AuditSeverity;
  timestamp: string;
  acknowledged: boolean;
}

export interface DeploymentRecord {
  id: string;
  modelId: string;
  modelName: string;
  fromVersion: string;
  toVersion: string;
  status: DeploymentStatus;
  deployedBy: string;
  deployedAt: string;
  duration: number;
  notes: string;
  rollbackAvailable: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  severity: AuditSeverity;
  user: string;
  target: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

export interface UsageStats {
  totalInferences: number;
  todayInferences: number;
  avgDailyInferences: number;
  peakThroughput: number;
  dailyTrend: DailyUsage[];
  modelBreakdown: ModelUsageBreakdown[];
}

export interface DailyUsage {
  date: string;
  inferences: number;
  avgLatency: number;
  errorRate: number;
}

export interface ModelUsageBreakdown {
  modelId: string;
  modelName: string;
  percentage: number;
  inferences: number;
  color: string;
}

export interface ModelSettings {
  modelId: string;
  confidenceThreshold: number;
  nmsThreshold: number;
  maxDetections: number;
  batchSize: number;
  inputResolution: string;
  inferenceMode: "gpu" | "cpu" | "auto";
  autoScaling: boolean;
  maxInstances: number;
  warmupFrames: number;
}

export interface PerformanceDataPoint {
  timestamp: string;
  accuracy: number;
  latency: number;
  throughput: number;
  errorRate: number;
  confidence: number;
}
