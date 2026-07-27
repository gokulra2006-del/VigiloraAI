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

export const MOCK_MODELS: AIModel[] = [
  {
    id: "mod-001",
    name: "YOLOv8 Nano (Vehicles)",
    version: "8.0.2-n",
    architecture: "YOLOv8",
    description: "Ultra-fast object detection optimized for edge devices. Primary model for vehicle tracking.",
    status: "running",
    priority: "primary",
    enabled: true,
    isActive: true,
    size: 6.2,
    lastDeployed: "2026-07-20T08:30:00Z",
    tags: ["vehicle", "fast", "edge"],
  },
  {
    id: "mod-002",
    name: "YOLOv8 Small (Pedestrians)",
    version: "8.0.1-s",
    architecture: "YOLOv8",
    description: "Balanced model for pedestrian and crowd density estimation.",
    status: "running",
    priority: "primary",
    enabled: true,
    isActive: true,
    size: 21.5,
    lastDeployed: "2026-07-21T14:15:00Z",
    tags: ["pedestrian", "crowd"],
  },
  {
    id: "mod-003",
    name: "SSD MobileNet V2",
    version: "2.4.0",
    architecture: "MobileNet",
    description: "Fallback low-resource model for license plate localization.",
    status: "loading",
    priority: "fallback",
    enabled: true,
    isActive: false,
    size: 14.8,
    lastDeployed: "2026-07-24T21:30:00Z",
    tags: ["anpr", "fallback", "lightweight"],
  },
  {
    id: "mod-004",
    name: "EfficientDet D1",
    version: "1.2.0",
    architecture: "EfficientDet",
    description: "High-accuracy model for detailed anomaly detection (abandoned objects).",
    status: "offline",
    priority: "experimental",
    enabled: false,
    isActive: false,
    size: 42.1,
    lastDeployed: "2026-06-15T09:00:00Z",
    tags: ["anomaly", "experimental", "heavy"],
  },
];

export const MOCK_METRICS: Record<string, ModelMetrics> = {
  "mod-001": {
    modelId: "mod-001",
    gpuUsage: 45.2,
    cpuUsage: 12.5,
    ramUsage: 1.2,
    vramUsage: 2.4,
    inferenceSpeed: 120,
    avgResponseTime: 8.3,
    detectionAccuracy: 94.5,
    confidenceThreshold: 0.65,
    falsePositiveRate: 2.1,
    falseNegativeRate: 3.4,
    totalInferences: 15420000,
    uptime: 142.5,
    gpuTemperature: 62,
    throughput: 115,
  },
  "mod-002": {
    modelId: "mod-002",
    gpuUsage: 68.7,
    cpuUsage: 18.2,
    ramUsage: 2.1,
    vramUsage: 3.8,
    inferenceSpeed: 85,
    avgResponseTime: 11.7,
    detectionAccuracy: 96.2,
    confidenceThreshold: 0.70,
    falsePositiveRate: 1.8,
    falseNegativeRate: 2.0,
    totalInferences: 8250000,
    uptime: 142.5,
    gpuTemperature: 68,
    throughput: 82,
  },
  "mod-003": {
    modelId: "mod-003",
    gpuUsage: 15.0,
    cpuUsage: 45.0,
    ramUsage: 0.8,
    vramUsage: 0.5,
    inferenceSpeed: 30,
    avgResponseTime: 33.3,
    detectionAccuracy: 88.5,
    confidenceThreshold: 0.55,
    falsePositiveRate: 4.5,
    falseNegativeRate: 7.0,
    totalInferences: 125000,
    uptime: 0.1,
    gpuTemperature: 45,
    throughput: 0,
  }
};

export const MOCK_HEALTH: Record<string, ModelHealthStatus> = {
  "mod-001": {
    modelId: "mod-001",
    status: "healthy",
    latencyTrend: [8.1, 8.2, 8.5, 8.3, 8.2, 8.4, 8.3, 8.1, 8.3],
    throughputTrend: [110, 115, 118, 112, 115, 120, 116, 115, 115],
    errorRateTrend: [0.1, 0.1, 0.2, 0.1, 0.0, 0.1, 0.1, 0.1, 0.1],
    memoryTrend: [2.3, 2.3, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4, 2.4],
    lastHealthCheck: new Date().toISOString(),
    alerts: []
  },
  "mod-002": {
    modelId: "mod-002",
    status: "degraded",
    latencyTrend: [11.2, 11.5, 12.1, 13.5, 14.2, 12.8, 11.9, 11.7, 11.7],
    throughputTrend: [85, 84, 82, 78, 75, 80, 83, 82, 82],
    errorRateTrend: [0.2, 0.3, 0.5, 0.8, 1.2, 0.7, 0.4, 0.3, 0.3],
    memoryTrend: [3.5, 3.6, 3.7, 3.8, 3.9, 3.8, 3.8, 3.8, 3.8],
    lastHealthCheck: new Date().toISOString(),
    alerts: [
      {
        id: "alert-1",
        message: "Elevated latency detected in region US-East",
        severity: "warning",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        acknowledged: false
      }
    ]
  }
};

export const MOCK_SETTINGS: Record<string, ModelSettings> = {
  "mod-001": {
    modelId: "mod-001",
    confidenceThreshold: 0.65,
    nmsThreshold: 0.45,
    maxDetections: 300,
    batchSize: 8,
    inputResolution: "640x640",
    inferenceMode: "gpu",
    autoScaling: true,
    maxInstances: 4,
    warmupFrames: 10
  }
};

export const MOCK_DEPLOYMENTS: DeploymentRecord[] = [
  {
    id: "dep-001",
    modelId: "mod-001",
    modelName: "YOLOv8 Nano",
    fromVersion: "8.0.1-n",
    toVersion: "8.0.2-n",
    status: "success",
    deployedBy: "system_admin",
    deployedAt: "2026-07-20T08:30:00Z",
    duration: 125,
    notes: "Minor weights update for night vision accuracy",
    rollbackAvailable: true
  },
  {
    id: "dep-002",
    modelId: "mod-002",
    modelName: "YOLOv8 Small",
    fromVersion: "8.0.0-s",
    toVersion: "8.0.1-s",
    status: "success",
    deployedBy: "auto_deployer",
    deployedAt: "2026-07-21T14:15:00Z",
    duration: 240,
    notes: "Routine weekly update",
    rollbackAvailable: true
  },
  {
    id: "dep-003",
    modelId: "mod-003",
    modelName: "SSD MobileNet V2",
    fromVersion: "2.3.9",
    toVersion: "2.4.0",
    status: "in-progress",
    deployedBy: "gokul",
    deployedAt: "2026-07-24T21:30:00Z",
    duration: 45,
    notes: "Testing new fallback weights",
    rollbackAvailable: false
  },
  {
    id: "dep-004",
    modelId: "mod-004",
    modelName: "EfficientDet D1",
    fromVersion: "1.1.0",
    toVersion: "1.2.0",
    status: "failed",
    deployedBy: "system_admin",
    deployedAt: "2026-06-15T08:55:00Z",
    duration: 312,
    notes: "OOM error during compilation",
    rollbackAvailable: false
  }
];

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "aud-001",
    action: "model.deployed",
    severity: "info",
    user: "gokul",
    target: "SSD MobileNet V2 (v2.4.0)",
    details: "Initiated manual deployment",
    timestamp: "2026-07-24T21:30:00Z",
    ipAddress: "192.168.1.105"
  },
  {
    id: "aud-002",
    action: "model.threshold-updated",
    severity: "warning",
    user: "system_admin",
    target: "YOLOv8 Nano",
    details: "Changed confidence threshold from 0.60 to 0.65",
    timestamp: "2026-07-24T18:45:12Z",
    ipAddress: "10.0.0.12"
  },
  {
    id: "aud-003",
    action: "system.health-check",
    severity: "warning",
    user: "system",
    target: "YOLOv8 Small",
    details: "Elevated latency detected (14.2ms)",
    timestamp: "2026-07-24T10:15:00Z",
    ipAddress: "localhost"
  },
  {
    id: "aud-004",
    action: "model.activated",
    severity: "info",
    user: "auto_scaler",
    target: "YOLOv8 Nano",
    details: "Scaled up instance count to 3",
    timestamp: "2026-07-23T08:00:00Z",
    ipAddress: "localhost"
  }
];

export const MOCK_USAGE: UsageStats = {
  totalInferences: 23670000,
  todayInferences: 1450000,
  avgDailyInferences: 1380000,
  peakThroughput: 215,
  dailyTrend: Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      date: d.toISOString().split('T')[0],
      inferences: 1200000 + Math.random() * 400000,
      avgLatency: 9 + Math.random() * 2,
      errorRate: 0.1 + Math.random() * 0.2
    };
  }),
  modelBreakdown: [
    { modelId: "mod-001", modelName: "YOLOv8 Nano", percentage: 65, inferences: 15420000, color: "var(--color-chart-1)" },
    { modelId: "mod-002", modelName: "YOLOv8 Small", percentage: 34, inferences: 8250000, color: "var(--color-chart-2)" },
    { modelId: "mod-003", modelName: "Other", percentage: 1, inferences: 250000, color: "var(--color-chart-3)" }
  ]
};

// Generate realistic performance data points for charts
export const generatePerformanceData = (points = 24): PerformanceDataPoint[] => {
  const data: PerformanceDataPoint[] = [];
  const now = new Date();
  
  for (let i = points; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600000); // Hourly points
    
    // Create realistic curves (diurnal pattern)
    const hour = d.getHours();
    const trafficMultiplier = hour >= 7 && hour <= 19 ? 1.5 : 0.6; // Busy during day
    const noise = () => (Math.random() - 0.5) * 0.1;
    
    data.push({
      timestamp: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      accuracy: 94 + noise() * 10,
      latency: (8 + noise() * 5) * (trafficMultiplier > 1 ? 1.2 : 0.9),
      throughput: 80 * trafficMultiplier + noise() * 20,
      errorRate: 0.1 + (trafficMultiplier > 1 ? noise() * 0.5 : 0),
      confidence: 0.85 + noise() * 2
    });
  }
  
  return data;
};

export const MOCK_PERFORMANCE_CHART = generatePerformanceData(24);
