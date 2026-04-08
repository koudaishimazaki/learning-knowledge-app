import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import Topic, User
from app.schemas.topic import TopicCreateRequest, TopicResponse, TopicUpdateRequest

router = APIRouter(prefix="/topics", tags=["topics"])


def to_topic_response(topic: Topic) -> TopicResponse:
    return TopicResponse(
        id=str(topic.id),
        name=topic.name,
        color=topic.color,
        icon_type=topic.icon_type,
        icon_emoji=topic.icon_emoji,
        icon_image_url=topic.icon_image_url,
    )


def validate_topic_payload(icon_type: str, icon_emoji: str | None, icon_image_url: str | None) -> None:
    if icon_type == "emoji":
        if not icon_emoji:
            raise HTTPException(status_code=422, detail="icon_emoji is required when icon_type=emoji")
    elif icon_type == "image":
        if not icon_image_url:
            raise HTTPException(
                status_code=422, detail="icon_image_url is required when icon_type=image"
            )


@router.get("", response_model=list[TopicResponse])
def list_topics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topics = db.execute(
        select(Topic).where(Topic.user_id == current_user.id).order_by(Topic.updated_at.desc())
    ).scalars()
    return [to_topic_response(t) for t in topics]


@router.post("", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(
    payload: TopicCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_topic_payload(
        payload.icon_type,
        payload.icon_emoji,
        str(payload.icon_image_url) if payload.icon_image_url else None,
    )

    topic = Topic(
        user_id=current_user.id,
        name=payload.name,
        color=payload.color,
        icon_type=payload.icon_type,
        icon_emoji=payload.icon_emoji if payload.icon_type == "emoji" else None,
        icon_image_url=str(payload.icon_image_url) if payload.icon_type == "image" else None,
    )
    db.add(topic)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="Topic already exists") from e
    db.refresh(topic)
    return to_topic_response(topic)


@router.get("/{topic_id}", response_model=TopicResponse)
def get_topic(
    topic_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        topic_uuid = uuid.UUID(topic_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail="Topic not found") from e

    topic = db.get(Topic, topic_uuid)
    if not topic or topic.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Topic not found")
    return to_topic_response(topic)


@router.put("/{topic_id}", response_model=TopicResponse)
def update_topic(
    topic_id: str,
    payload: TopicUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        topic_uuid = uuid.UUID(topic_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail="Topic not found") from e

    topic = db.get(Topic, topic_uuid)
    if not topic or topic.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Topic not found")

    icon_type = topic.icon_type
    icon_emoji = topic.icon_emoji
    icon_image_url = topic.icon_image_url

    if "name" in payload.model_fields_set and payload.name is not None:
        topic.name = payload.name
    if "color" in payload.model_fields_set and payload.color is not None:
        topic.color = payload.color
    if "icon_type" in payload.model_fields_set and payload.icon_type is not None:
        icon_type = payload.icon_type
    if "icon_emoji" in payload.model_fields_set:
        icon_emoji = payload.icon_emoji
    if "icon_image_url" in payload.model_fields_set:
        icon_image_url = str(payload.icon_image_url) if payload.icon_image_url else None

    validate_topic_payload(icon_type, icon_emoji, icon_image_url)

    topic.icon_type = icon_type
    topic.icon_emoji = icon_emoji if icon_type == "emoji" else None
    topic.icon_image_url = icon_image_url if icon_type == "image" else None

    db.add(topic)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="Topic already exists") from e
    db.refresh(topic)
    return to_topic_response(topic)

