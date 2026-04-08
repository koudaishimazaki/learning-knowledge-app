from pydantic import BaseModel, Field, HttpUrl


class TopicCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str = Field(min_length=1, max_length=32)
    icon_type: str = Field(pattern="^(emoji|image)$")
    icon_emoji: str | None = Field(default=None, max_length=16)
    icon_image_url: HttpUrl | None = None


class TopicUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    color: str | None = Field(default=None, min_length=1, max_length=32)
    icon_type: str | None = Field(default=None, pattern="^(emoji|image)$")
    icon_emoji: str | None = Field(default=None, max_length=16)
    icon_image_url: HttpUrl | None = None


class TopicResponse(BaseModel):
    id: str
    name: str
    color: str
    icon_type: str
    icon_emoji: str | None
    icon_image_url: str | None
