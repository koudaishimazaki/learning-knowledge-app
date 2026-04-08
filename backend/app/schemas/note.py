from datetime import datetime

from pydantic import BaseModel, Field


class NoteCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    markdown_content: str = ""
    summary: str | None = Field(default=None, max_length=500)
    is_starred: bool = False
    topic_id: str | None = None
    tag_ids: list[str] = Field(default_factory=list)


class NoteUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    markdown_content: str | None = None
    summary: str | None = Field(default=None, max_length=500)
    is_starred: bool | None = None
    topic_id: str | None = None
    tag_ids: list[str] | None = None


class NoteResponse(BaseModel):
    id: str
    title: str
    markdown_content: str
    summary: str | None
    is_starred: bool
    topic_id: str | None = None
    tag_ids: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

