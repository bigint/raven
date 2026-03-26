from pydantic import BaseModel, Field


class SetupComplete(BaseModel):
    email: str
    name: str
    password: str = Field(min_length=8)
