import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import NoteTag, Tag, User
from app.schemas.tag import TagCreateRequest, TagResponse, TagUpdateRequest

router = APIRouter(prefix="/tags", tags=["tags"])


def to_tag_response(tag: Tag, usage_count: int = 0) -> TagResponse:
    return TagResponse(id=str(tag.id), name=tag.name, usage_count=usage_count)


@router.get("", response_model=list[TagResponse])
def list_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.execute(
        select(Tag, func.count(NoteTag.id))
        .outerjoin(NoteTag, NoteTag.tag_id == Tag.id)
        .where(Tag.user_id == current_user.id)
        .group_by(Tag.id)
        .order_by(Tag.name.asc())
    ).all()
    return [to_tag_response(tag, int(cnt)) for tag, cnt in rows]


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(
    payload: TagCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tag = Tag(user_id=current_user.id, name=payload.name)
    db.add(tag)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tag already exists") from e
    db.refresh(tag)
    return to_tag_response(tag, 0)


@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(
    tag_id: str,
    payload: TagUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        tag_uuid = uuid.UUID(tag_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail="Tag not found") from e

    tag = db.get(Tag, tag_uuid)
    if not tag or tag.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")

    try:
        db.execute(update(Tag).where(Tag.id == tag.id).values(name=payload.name))
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tag already exists") from e

    db.refresh(tag)
    usage_count = (
        db.execute(select(func.count(NoteTag.id)).where(NoteTag.tag_id == tag.id)).scalar_one()
    )
    return to_tag_response(tag, int(usage_count))


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        tag_uuid = uuid.UUID(tag_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail="Tag not found") from e

    tag = db.get(Tag, tag_uuid)
    if not tag or tag.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tag not found")

    db.execute(delete(NoteTag).where(NoteTag.tag_id == tag.id))
    db.delete(tag)
    db.commit()

