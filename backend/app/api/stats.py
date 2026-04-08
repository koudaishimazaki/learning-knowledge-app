from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import Note, NoteTag, Tag, Topic, User
from app.schemas.stats import NamedCount, StatsSummaryResponse

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/summary", response_model=StatsSummaryResponse)
def get_stats_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notes_total = (
        db.execute(select(func.count(Note.id)).where(Note.user_id == current_user.id)).scalar_one()
    )
    starred_total = (
        db.execute(
            select(func.count(Note.id)).where(Note.user_id == current_user.id, Note.is_starred.is_(True))
        ).scalar_one()
    )

    tag_rows = db.execute(
        select(Tag.id, Tag.name, func.count(NoteTag.id))
        .outerjoin(NoteTag, NoteTag.tag_id == Tag.id)
        .where(Tag.user_id == current_user.id)
        .group_by(Tag.id)
        .order_by(func.count(NoteTag.id).desc(), Tag.name.asc())
        .limit(10)
    ).all()
    topic_rows = db.execute(
        select(Topic.id, Topic.name, func.count(Note.id))
        .outerjoin(Note, Note.topic_id == Topic.id)
        .where(Topic.user_id == current_user.id)
        .group_by(Topic.id)
        .order_by(func.count(Note.id).desc(), Topic.updated_at.desc())
        .limit(10)
    ).all()

    return StatsSummaryResponse(
        notes_total=int(notes_total),
        starred_total=int(starred_total),
        tags=[NamedCount(id=str(i), name=n, count=int(c)) for i, n, c in tag_rows],
        topics=[NamedCount(id=str(i), name=n, count=int(c)) for i, n, c in topic_rows],
    )

