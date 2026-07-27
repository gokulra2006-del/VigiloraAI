from datetime import datetime
from pydantic import BaseModel, Field

class DetectionCreate(BaseModel):
    camera_id: str
    class_name: str
    confidence: float
    bbox_json: str
    snapshot_path: str | None = None

class DetectionResponse(BaseModel):
    id: int
    camera_id: str
    class_name: str
    confidence: float
    bbox_json: str | None
    snapshot_path: str | None
    timestamp: datetime

    model_config = {"from_attributes": True}
