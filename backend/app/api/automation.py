import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import Note, NoteTag, Tag, Topic, User
from app.schemas.automation import AutomationUpsertNoteRequest, AutomationUpsertNoteResponse
from app.settings import settings

router = APIRouter(prefix="/automation", tags=["automation"])


def get_automation_user(
    x_automation_key: str | None = Header(default=None, alias="X-Automation-Key"),
    x_automation_user: str | None = Header(default=None, alias="X-Automation-User"),
    db: Session = Depends(get_db),
) -> User:
    if not settings.automation_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Automation API is disabled (AUTOMATION_API_KEY not set)",
        )
    if not x_automation_key or x_automation_key != settings.automation_api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid automation key")

    # Determine target user:
    # - request override: X-Automation-User (email)
    # - default: AUTOMATION_USER_EMAIL
    # - fallback: first user (oldest) for personal single-user use
    target_email = (x_automation_user or settings.automation_user_email or "").strip() or None
    if target_email:
        user = db.execute(select(User).where(User.email == target_email)).scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Automation target user not found: {target_email}",
            )
        return user

    user = db.execute(select(User).order_by(User.created_at.asc())).scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No users exist. Create an account first via /api/auth/register.",
        )
    return user


def get_or_create_topic(db: Session, user_id: uuid.UUID, name: str) -> Topic:
    existing = db.execute(select(Topic).where(Topic.user_id == user_id, Topic.name == name)).scalar_one_or_none()
    if existing:
        return existing
    # Minimal defaults for automation-created topics
    topic = Topic(user_id=user_id, name=name, color="gray", icon_type="emoji", icon_emoji="🧠", icon_image_url=None)
    db.add(topic)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return db.execute(select(Topic).where(Topic.user_id == user_id, Topic.name == name)).scalar_one()
    db.refresh(topic)
    return topic


def get_or_create_tag(db: Session, user_id: uuid.UUID, name: str) -> Tag:
    existing = db.execute(select(Tag).where(Tag.user_id == user_id, Tag.name == name)).scalar_one_or_none()
    if existing:
        return existing
    tag = Tag(user_id=user_id, name=name)
    db.add(tag)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return db.execute(select(Tag).where(Tag.user_id == user_id, Tag.name == name)).scalar_one()
    db.refresh(tag)
    return tag


@router.post("/notes:upsert", response_model=AutomationUpsertNoteResponse)
def upsert_note(
    payload: AutomationUpsertNoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_automation_user),
):
    # Resolve topic/tags by name (create if missing)
    topic_id: uuid.UUID | None = None
    if payload.topic_name:
        topic = get_or_create_topic(db, current_user.id, payload.topic_name.strip())
        topic_id = topic.id

    tag_ids: list[uuid.UUID] = []
    for raw in payload.tag_names:
        name = raw.strip()
        if not name:
            continue
        tag = get_or_create_tag(db, current_user.id, name)
        tag_ids.append(tag.id)

    created = False
    note: Note | None = None
    if payload.external_id:
        note = db.execute(
            select(Note).where(Note.user_id == current_user.id, Note.external_id == payload.external_id)
        ).scalar_one_or_none()

    if note is None:
        note = Note(
            user_id=current_user.id,
            topic_id=topic_id,
            title=payload.title,
            markdown_content=payload.markdown_content or "",
            summary=payload.summary,
            is_starred=payload.is_starred,
            external_id=payload.external_id,
            source=payload.source,
            search_text=(payload.title + "\n" + (payload.markdown_content or "")).strip(),
        )
        db.add(note)
        try:
            db.commit()
        except IntegrityError as e:
            db.rollback()
            # Likely external_id race; try fetch and update
            if payload.external_id:
                note = db.execute(
                    select(Note).where(Note.user_id == current_user.id, Note.external_id == payload.external_id)
                ).scalar_one_or_none()
            if note is None:
                raise HTTPException(status_code=409, detail="Upsert conflict") from e
        db.refresh(note)
        created = True
    else:
        note.title = payload.title
        note.markdown_content = payload.markdown_content or ""
        note.summary = payload.summary
        note.is_starred = payload.is_starred
        note.topic_id = topic_id
        note.source = payload.source
        note.search_text = (note.title + "\n" + (note.markdown_content or "")).strip()
        db.add(note)
        db.commit()
        db.refresh(note)

    # Replace note tags
    db.execute(delete(NoteTag).where(NoteTag.note_id == note.id))
    for tid in dict.fromkeys(tag_ids):
        db.add(NoteTag(note_id=note.id, tag_id=tid))
    db.commit()

    return AutomationUpsertNoteResponse(note_id=str(note.id), created=created)

