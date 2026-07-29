import type {
  AIModel,
  ModelMetrics,
  DeploymentRecord,
  AuditLogEntry,
  UsageStats,
  ModelHealthStatus,
  PerformanceDataPoint,
  ModelSettings
} from "@/types/models";

export const MOCK_MODELS: AIModel[] = [];

export const MOCK_METRICS: Record<string, ModelMetrics> = {};

export const MOCK_HEALTH: Record<string, ModelHealthStatus> = {};

export const MOCK_SETTINGS: Record<string, ModelSettings> = {};

export const MOCK_DEPLOYMENTS: DeploymentRecord[] = [];

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [];

export const MOCK_USAGE: UsageStats = {
  totalInferences: 0,
  todayInferences: 0,
  avgDailyInferences: 0,
  peakThroughput: 0,
  dailyTrend: [],
  modelBreakdown: []
};

export const MOCK_PERFORMANCE_CHART: PerformanceDataPoint[] = [];
