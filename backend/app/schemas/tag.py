from pydantic import BaseModel, Field


class TagCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class TagResponse(BaseModel):
    id: str
    name: str

