"""Pydantic schemas for Vision AI Multimodal Threat Analysis."""

from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, Field


class DetectedObject(BaseModel):
    label: str
    confidence: float = Field(ge=0.0, le=1.0)
    bbox: Optional[List[int]] = None  # [x1, y1, x2, y2]
    category: Optional[str] = "object"  # person | vehicle | package | hazard | access


class ThreatItem(BaseModel):
    type: str  # e.g., "perimeter_breach", "suspicious_package", "crowd_anomaly", "fire_hazard"
    severity: str  # NORMAL | LOW | MEDIUM | HIGH | CRITICAL
    confidence: float = Field(ge=0.0, le=1.0)
    description: str


class VisionAnalysisResponse(BaseModel):
    analysis_id: str
    camera_name: str = "Camera 04 (Main Security)"
    sector: str = "Sector 7 (Perimeter)"
    threat_level: str  # NORMAL | LOW | MEDIUM | HIGH | CRITICAL
    threat_score: float  # 0.0 to 100.0
    confidence: float  # 0.0 to 1.0
    summary: str
    incident_title: str
    incident_description: str
    detected_objects: List[DetectedObject] = []
    threats: List[ThreatItem] = []
    location_context: str
    visual_observations: List[str] = []
    recommended_actions: List[str] = []
    image_url: Optional[str] = None
    image_metadata: Optional[dict] = None
    timestamp: str
    is_demo_mode: bool = False
    model_provider: str = "VIGILORA Vision Core"

    model_config = ConfigDict(protected_namespaces=())



class VisionIncidentCreate(BaseModel):
    analysis_id: str
    camera_name: str = "Camera 04 (Main Security)"
    sector: str = "Sector 7 (Perimeter)"
    threat_level: str = "HIGH"
    threat_score: float = 85.0
    confidence: float = 0.90
    summary: str
    incident_title: str = "Suspicious Visual Activity"
    incident_description: Optional[str] = None
    detected_objects: List[DetectedObject] = []
    threats: List[ThreatItem] = []
    visual_observations: List[str] = []
    recommended_actions: List[str] = []
    image_url: Optional[str] = None
    image_metadata: Optional[dict] = None
    is_demo_mode: bool = False


class VisionIncidentResponse(BaseModel):
    id: str
    camera_name: str
    sector: str
    threat_level: str
    threat_score: float
    confidence: float
    summary: str
    incident_title: str
    incident_description: Optional[str] = None
    detected_objects_json: Optional[Any] = None
    threats_json: Optional[Any] = None
    visual_observations_json: Optional[Any] = None
    recommended_actions_json: Optional[Any] = None
    image_url: Optional[str] = None
    image_metadata_json: Optional[Any] = None
    is_demo_mode: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class VisionScenario(BaseModel):
    id: str
    title: str
    category: str
    sector: str
    camera_name: str
    threat_level: str
    threat_score: float
    description: str
    image_url: str