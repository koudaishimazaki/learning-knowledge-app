from pydantic import BaseModel


class NamedCount(BaseModel):
    id: str
    name: str
    count: int


class StatsSummaryResponse(BaseModel):
    notes_total: int
    starred_total: int
    tags: list[NamedCount]
    topics: list[NamedCount]

