from datetime import datetime
from pydantic import BaseModel, ConfigDict
from models.enums import RoleEnum

class UserCreate(BaseModel):
    username: str
    password: str
    role: RoleEnum = RoleEnum.operator

class UserResponse(BaseModel):
    id: str
    username: str
    role: RoleEnum
    is_active: bool
    created_at: datetime | None

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    
class TokenData(BaseModel):
    username: str | None = None
    role: str | None = None

class LoginRequest(BaseModel):
    username: str
    password: str
