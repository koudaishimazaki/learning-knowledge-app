from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import Tag, User
from app.schemas.tag import TagCreateRequest, TagResponse

router = APIRouter(prefix="/tags", tags=["tags"])


def to_tag_response(tag: Tag) -> TagResponse:
    return TagResponse(id=str(tag.id), name=tag.name)


@router.get("", response_model=list[TagResponse])
def list_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tags = db.execute(
        select(Tag).where(Tag.user_id == current_user.id).order_by(Tag.name.asc())
    ).scalars()
    return [to_tag_response(t) for t in tags]


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
    return to_tag_response(tag)

