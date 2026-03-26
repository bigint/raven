from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProfileUpdate(BaseModel):
    name: str


class UserResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    email: str
    name: str
    role: str
    avatar_url: str | None = Field(alias="avatarUrl")
    created_at: datetime = Field(alias="createdAt")
