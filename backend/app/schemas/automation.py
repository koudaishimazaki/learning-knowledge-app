from pydantic import BaseModel, Field


class AutomationUpsertNoteRequest(BaseModel):
    external_id: str | None = Field(
        default=None,
        max_length=200,
        description="Idempotency key from external system. If provided, same external_id will update the existing note.",
    )
    title: str = Field(min_length=1, max_length=200)
    markdown_content: str = Field(default="", max_length=20000)
    summary: str | None = Field(default=None, max_length=500)
    is_starred: bool = False

    topic_name: str | None = Field(default=None, max_length=80)
    tag_names: list[str] = Field(default_factory=list, description="Tag names (will be created if missing).")

    source: str | None = Field(
        default="automation",
        max_length=50,
        description="Optional source label (e.g., claude, cursor, github).",
    )


class AutomationUpsertNoteResponse(BaseModel):
    note_id: str
    created: bool

