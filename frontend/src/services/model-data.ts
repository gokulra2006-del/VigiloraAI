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
    name: "YOLOv8-Sentinel",
    version: "8.2.1",
    architecture: "YOLO",
    description: "Primary model for object detection and tracking in real-time.",
    status: "running",
    priority: "primary",
    enabled: true,
    isActive: true,
    size: 156,
    lastDeployed: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    tags: ["object-detection", "tracking", "real-time"]
  },
  {
    id: "mod-002",
    name: "ResNet-50-Facial",
    version: "1.4.0",
    architecture: "ResNet",
    description: "Facial recognition and feature extraction model.",
    status: "running",
    priority: "fallback",
    enabled: true,
    isActive: true,
    size: 245,
    lastDeployed: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    tags: ["facial-recognition", "feature-extraction"]
  },
  {
    id: "mod-003",
    name: "Anomaly-Detect-GAN",
    version: "2.0.1",
    architecture: "GAN",
    description: "Detects unusual patterns in movement and crowd behavior.",
    status: "offline",
    priority: "experimental",
    enabled: false,
    isActive: false,
    size: 512,
    lastDeployed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    tags: ["anomaly-detection", "crowd-behavior", "beta"]
  }
];

export const MOCK_METRICS: Record<string, ModelMetrics> = {
  "mod-001": {
    modelId: "mod-001",
    gpuUsage: 68,
    cpuUsage: 45,
    ramUsage: 35,
    vramUsage: 72,
    inferenceSpeed: 45,
    avgResponseTime: 22.5,
    detectionAccuracy: 94.2,
    confidenceThreshold: 0.65,
    falsePositiveRate: 1.2,
    falseNegativeRate: 0.8,
    totalInferences: 1254300,
    uptime: 345,
    gpuTemperature: 65,
    throughput: 120
  },
  "mod-002": {
    modelId: "mod-002",
    gpuUsage: 45,
    cpuUsage: 30,
    ramUsage: 25,
    vramUsage: 40,
    inferenceSpeed: 25,
    avgResponseTime: 40,
    detectionAccuracy: 88.5,
    confidenceThreshold: 0.75,
    falsePositiveRate: 2.1,
    falseNegativeRate: 1.5,
    totalInferences: 54300,
    uptime: 120,
    gpuTemperature: 55,
    throughput: 40
  },
  "mod-003": {
    modelId: "mod-003",
    gpuUsage: 0,
    cpuUsage: 0,
    ramUsage: 0,
    vramUsage: 0,
    inferenceSpeed: 0,
    avgResponseTime: 0,
    detectionAccuracy: 80.0,
    confidenceThreshold: 0.5,
    falsePositiveRate: 5.0,
    falseNegativeRate: 3.0,
    totalInferences: 1200,
    uptime: 0,
    gpuTemperature: 40,
    throughput: 0
  }
};

export const MOCK_HEALTH: Record<string, ModelHealthStatus> = {
  "mod-001": {
    modelId: "mod-001",
    status: "healthy",
    latencyTrend: [22, 21, 23, 22, 24, 21, 22],
    throughputTrend: [110, 115, 120, 118, 122, 119, 120],
    errorRateTrend: [0.1, 0.2, 0.1, 0.05, 0.1, 0.15, 0.1],
    memoryTrend: [70, 71, 72, 72, 73, 71, 72],
    lastHealthCheck: new Date().toISOString(),
    alerts: []
  },
  "mod-002": {
    modelId: "mod-002",
    status: "degraded",
    latencyTrend: [35, 38, 40, 45, 50, 42, 40],
    throughputTrend: [45, 42, 40, 38, 35, 39, 40],
    errorRateTrend: [1.5, 1.8, 2.0, 2.5, 2.2, 2.0, 2.1],
    memoryTrend: [38, 39, 40, 42, 41, 40, 40],
    lastHealthCheck: new Date().toISOString(),
    alerts: [
      {
        id: "alert-001",
        message: "High latency detected during peak hours",
        severity: "warning",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        acknowledged: false
      }
    ]
  },
  "mod-003": {
    modelId: "mod-003",
    status: "critical",
    latencyTrend: [0, 0, 0, 0, 0, 0, 0],
    throughputTrend: [0, 0, 0, 0, 0, 0, 0],
    errorRateTrend: [0, 0, 0, 0, 0, 0, 0],
    memoryTrend: [0, 0, 0, 0, 0, 0, 0],
    lastHealthCheck: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    alerts: [
      {
        id: "alert-002",
        message: "Model offline",
        severity: "critical",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        acknowledged: true
      }
    ]
  }
};

export const MOCK_SETTINGS: Record<string, ModelSettings> = {
  "mod-001": {
    modelId: "mod-001",
    confidenceThreshold: 0.65,
    nmsThreshold: 0.45,
    maxDetections: 100,
    batchSize: 16,
    inputResolution: "640x640",
    inferenceMode: "gpu",
    autoScaling: true,
    maxInstances: 4,
    warmupFrames: 10
  },
  "mod-002": {
    modelId: "mod-002",
    confidenceThreshold: 0.75,
    nmsThreshold: 0.5,
    maxDetections: 50,
    batchSize: 8,
    inputResolution: "512x512",
    inferenceMode: "gpu",
    autoScaling: false,
    maxInstances: 2,
    warmupFrames: 5
  },
  "mod-003": {
    modelId: "mod-003",
    confidenceThreshold: 0.5,
    nmsThreshold: 0.4,
    maxDetections: 200,
    batchSize: 32,
    inputResolution: "416x416",
    inferenceMode: "auto",
    autoScaling: true,
    maxInstances: 1,
    warmupFrames: 30
  }
};

export const MOCK_DEPLOYMENTS: DeploymentRecord[] = [
  {
    id: "dep-001",
    modelId: "mod-001",
    modelName: "YOLOv8-Sentinel",
    fromVersion: "8.2.0",
    toVersion: "8.2.1",
    status: "success",
    deployedBy: "admin",
    deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    duration: 125,
    notes: "Minor patch for better bounding box accuracy in low light.",
    rollbackAvailable: true
  },
  {
    id: "dep-002",
    modelId: "mod-002",
    modelName: "ResNet-50-Facial",
    fromVersion: "1.3.5",
    toVersion: "1.4.0",
    status: "success",
    deployedBy: "system",
    deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    duration: 310,
    notes: "Major update with new feature extraction layers.",
    rollbackAvailable: true
  },
  {
    id: "dep-003",
    modelId: "mod-003",
    modelName: "Anomaly-Detect-GAN",
    fromVersion: "2.0.0",
    toVersion: "2.0.1",
    status: "failed",
    deployedBy: "admin",
    deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    duration: 45,
    notes: "Failed to initialize CUDA context.",
    rollbackAvailable: false
  }
];

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-001",
    action: "model.deployed",
    severity: "info",
    user: "admin",
    target: "YOLOv8-Sentinel (mod-001)",
    details: "Successfully deployed version 8.2.1",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    ipAddress: "192.168.1.105"
  },
  {
    id: "log-002",
    action: "model.threshold-updated",
    severity: "info",
    user: "admin",
    target: "ResNet-50-Facial (mod-002)",
    details: "Confidence threshold updated from 0.70 to 0.75",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    ipAddress: "192.168.1.105"
  },
  {
    id: "log-003",
    action: "model.deactivated",
    severity: "warning",
    user: "system",
    target: "Anomaly-Detect-GAN (mod-003)",
    details: "Model automatically deactivated due to consecutive errors",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    ipAddress: "localhost"
  }
];

export const MOCK_USAGE: UsageStats = {
  totalInferences: 1309800,
  todayInferences: 54320,
  avgDailyInferences: 48500,
  peakThroughput: 165,
  dailyTrend: [
    { date: "Mon", inferences: 45000, avgLatency: 23.5, errorRate: 0.15 },
    { date: "Tue", inferences: 48000, avgLatency: 22.8, errorRate: 0.12 },
    { date: "Wed", inferences: 51000, avgLatency: 24.1, errorRate: 0.18 },
    { date: "Thu", inferences: 47500, avgLatency: 22.5, errorRate: 0.10 },
    { date: "Fri", inferences: 52000, avgLatency: 25.0, errorRate: 0.21 },
    { date: "Sat", inferences: 42000, avgLatency: 21.5, errorRate: 0.08 },
    { date: "Sun", inferences: 40000, avgLatency: 21.0, errorRate: 0.05 },
  ],
  modelBreakdown: [
    { modelId: "mod-001", modelName: "YOLOv8-Sentinel", percentage: 75, inferences: 982350, color: "#3b82f6" },
    { modelId: "mod-002", modelName: "ResNet-50-Facial", percentage: 20, inferences: 261960, color: "#10b981" },
    { modelId: "mod-003", modelName: "Anomaly-Detect-GAN", percentage: 5, inferences: 65490, color: "#8b5cf6" },
  ]
};

export const MOCK_PERFORMANCE_CHART: PerformanceDataPoint[] = [
  { timestamp: "00:00", accuracy: 94.5, latency: 21.5, throughput: 110, errorRate: 0.05, confidence: 0.85 },
  { timestamp: "04:00", accuracy: 94.2, latency: 22.0, throughput: 115, errorRate: 0.08, confidence: 0.84 },
  { timestamp: "08:00", accuracy: 93.8, latency: 24.5, throughput: 145, errorRate: 0.15, confidence: 0.82 },
  { timestamp: "12:00", accuracy: 93.5, latency: 25.0, throughput: 155, errorRate: 0.18, confidence: 0.81 },
  { timestamp: "16:00", accuracy: 94.0, latency: 23.5, throughput: 135, errorRate: 0.12, confidence: 0.83 },
  { timestamp: "20:00", accuracy: 94.3, latency: 22.5, throughput: 125, errorRate: 0.09, confidence: 0.84 },
];

