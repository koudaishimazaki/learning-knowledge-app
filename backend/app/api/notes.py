import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import Note, NoteTag, Tag, Topic, User
from app.schemas.note import NoteCreateRequest, NoteListItemResponse, NoteResponse, NoteUpdateRequest

router = APIRouter(prefix="/notes", tags=["notes"])


def to_note_response(note: Note) -> NoteResponse:
    # NoteTag -> tag_ids lookup
    tag_ids = getattr(note, "_tag_ids", None)
    if tag_ids is None:
        tag_ids = []
    return NoteResponse(
        id=str(note.id),
        title=note.title,
        markdown_content=note.markdown_content,
        summary=note.summary,
        is_starred=note.is_starred,
        topic_id=str(note.topic_id) if note.topic_id else None,
        tag_ids=[str(tid) for tid in tag_ids],
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


def to_note_list_item_response(note: Note) -> NoteListItemResponse:
    tag_ids = getattr(note, "_tag_ids", None)
    if tag_ids is None:
        tag_ids = []
    return NoteListItemResponse(
        id=str(note.id),
        title=note.title,
        summary=note.summary,
        is_starred=note.is_starred,
        topic_id=str(note.topic_id) if note.topic_id else None,
        tag_ids=[str(tid) for tid in tag_ids],
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.get("", response_model=list[NoteResponse])
def list_notes(
    q: str | None = Query(default=None, min_length=1, max_length=200),
    starred: bool | None = None,
    topic_id: str | None = None,
    tag_ids: str | None = None,
    sort: str = Query(default="updated_desc", pattern="^(updated_desc|created_desc|relevance)$"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Note).where(Note.user_id == current_user.id)

    if starred is True:
        stmt = stmt.where(Note.is_starred.is_(True))
    elif starred is False:
        stmt = stmt.where(Note.is_starred.is_(False))

    if topic_id:
        try:
            topic_uuid = uuid.UUID(topic_id)
        except ValueError as e:
            raise HTTPException(status_code=422, detail="Invalid topic_id") from e
        stmt = stmt.where(Note.topic_id == topic_uuid)

    tag_uuid_list: list[uuid.UUID] = []
    if tag_ids:
        parts = [p.strip() for p in tag_ids.split(",") if p.strip()]
        try:
            tag_uuid_list = [uuid.UUID(p) for p in parts]
        except ValueError as e:
            raise HTTPException(status_code=422, detail="Invalid tag_ids") from e
        if tag_uuid_list:
            stmt = stmt.where(
                Note.id.in_(select(NoteTag.note_id).where(NoteTag.tag_id.in_(tag_uuid_list)))
            )

    ts_query = None
    if q:
        # Use Postgres built-in parser (supports quoted phrases, AND/OR, -, etc.)
        ts_query = func.websearch_to_tsquery("simple", q)
        stmt = stmt.where(Note.search_vector.op("@@")(ts_query))

    if sort == "relevance" and ts_query is not None:
        rank = func.ts_rank_cd(Note.search_vector, ts_query)
        stmt = stmt.order_by(rank.desc(), Note.updated_at.desc())
    elif sort == "created_desc":
        stmt = stmt.order_by(Note.created_at.desc())
    else:
        stmt = stmt.order_by(Note.updated_at.desc())

    stmt = stmt.limit(limit).offset(offset)

    notes = list(db.execute(stmt).scalars())
    if notes:
        # Attach tag ids per note in one query
        note_ids = [n.id for n in notes]
        rows = db.execute(
            select(NoteTag.note_id, NoteTag.tag_id).where(NoteTag.note_id.in_(note_ids))
        )
        mapping: dict[uuid.UUID, list[uuid.UUID]] = {}
        for note_id_row, tag_id_row in rows:
            mapping.setdefault(note_id_row, []).append(tag_id_row)
        for n in notes:
            setattr(n, "_tag_ids", mapping.get(n.id, []))
    return [to_note_response(n) for n in notes]


@router.get("/items", response_model=list[NoteListItemResponse])
def list_note_items(
    q: str | None = Query(default=None, min_length=1, max_length=200),
    starred: bool | None = None,
    topic_id: str | None = None,
    tag_ids: str | None = None,
    sort: str = Query(default="updated_desc", pattern="^(updated_desc|created_desc|relevance)$"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lightweight list endpoint for dedupe / automation use-cases.
    Unlike GET /notes, this omits markdown_content to keep payloads small.
    """
    stmt = select(Note).where(Note.user_id == current_user.id)

    if starred is True:
        stmt = stmt.where(Note.is_starred.is_(True))
    elif starred is False:
        stmt = stmt.where(Note.is_starred.is_(False))

    if topic_id:
        try:
            topic_uuid = uuid.UUID(topic_id)
        except ValueError as e:
            raise HTTPException(status_code=422, detail="Invalid topic_id") from e
        stmt = stmt.where(Note.topic_id == topic_uuid)

    tag_uuid_list: list[uuid.UUID] = []
    if tag_ids:
        parts = [p.strip() for p in tag_ids.split(",") if p.strip()]
        try:
            tag_uuid_list = [uuid.UUID(p) for p in parts]
        except ValueError as e:
            raise HTTPException(status_code=422, detail="Invalid tag_ids") from e
        if tag_uuid_list:
            stmt = stmt.where(Note.id.in_(select(NoteTag.note_id).where(NoteTag.tag_id.in_(tag_uuid_list))))

    ts_query = None
    if q:
        ts_query = func.websearch_to_tsquery("simple", q)
        stmt = stmt.where(Note.search_vector.op("@@")(ts_query))

    if sort == "relevance" and ts_query is not None:
        rank = func.ts_rank_cd(Note.search_vector, ts_query)
        stmt = stmt.order_by(rank.desc(), Note.updated_at.desc())
    elif sort == "created_desc":
        stmt = stmt.order_by(Note.created_at.desc())
    else:
        stmt = stmt.order_by(Note.updated_at.desc())

    stmt = stmt.limit(limit).offset(offset)

    notes = list(db.execute(stmt).scalars())
    if notes:
        note_ids = [n.id for n in notes]
        rows = db.execute(select(NoteTag.note_id, NoteTag.tag_id).where(NoteTag.note_id.in_(note_ids)))
        mapping: dict[uuid.UUID, list[uuid.UUID]] = {}
        for note_id_row, tag_id_row in rows:
            mapping.setdefault(note_id_row, []).append(tag_id_row)
        for n in notes:
            setattr(n, "_tag_ids", mapping.get(n.id, []))
    return [to_note_list_item_response(n) for n in notes]


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NoteCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topic_uuid: uuid.UUID | None = None
    if payload.topic_id:
        try:
            topic_uuid = uuid.UUID(payload.topic_id)
        except ValueError as e:
            raise HTTPException(status_code=422, detail="Invalid topic_id") from e
        topic = db.get(Topic, topic_uuid)
        if not topic or topic.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Topic not found")

    tags: list[Tag] = []
    if payload.tag_ids:
        try:
            tag_uuid_list = [uuid.UUID(tid) for tid in payload.tag_ids]
        except ValueError as e:
            raise HTTPException(status_code=422, detail="Invalid tag_ids") from e
        tags = list(
            db.execute(select(Tag).where(Tag.user_id == current_user.id, Tag.id.in_(tag_uuid_list))).scalars()
        )
        if len(tags) != len(set(tag_uuid_list)):
            raise HTTPException(status_code=404, detail="Tag not found")

    note = Note(
        user_id=current_user.id,
        topic_id=topic_uuid,
        title=payload.title,
        markdown_content=payload.markdown_content or "",
        summary=payload.summary,
        is_starred=payload.is_starred,
        search_text=(payload.title + "\n" + (payload.markdown_content or "")).strip(),
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    if tags:
        for t in tags:
            db.add(NoteTag(note_id=note.id, tag_id=t.id))
        db.commit()

    setattr(note, "_tag_ids", [t.id for t in tags])
    return to_note_response(note)


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        note_uuid = uuid.UUID(note_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found") from e

    note = db.get(Note, note_uuid)
    if not note or note.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    tag_rows = db.execute(select(NoteTag.tag_id).where(NoteTag.note_id == note.id)).scalars().all()
    setattr(note, "_tag_ids", list(tag_rows))
    return to_note_response(note)


@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: str,
    payload: NoteUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        note_uuid = uuid.UUID(note_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found") from e

    note = db.get(Note, note_uuid)
    if not note or note.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if "title" in payload.model_fields_set and payload.title is not None:
        note.title = payload.title
    if "markdown_content" in payload.model_fields_set and payload.markdown_content is not None:
        note.markdown_content = payload.markdown_content
    if "summary" in payload.model_fields_set:
        note.summary = payload.summary
    if "is_starred" in payload.model_fields_set and payload.is_starred is not None:
        note.is_starred = payload.is_starred
    if "topic_id" in payload.model_fields_set:
        if payload.topic_id is None:
            note.topic_id = None
        else:
            try:
                topic_uuid = uuid.UUID(payload.topic_id)
            except ValueError as e:
                raise HTTPException(status_code=422, detail="Invalid topic_id") from e
            topic = db.get(Topic, topic_uuid)
            if not topic or topic.user_id != current_user.id:
                raise HTTPException(status_code=404, detail="Topic not found")
            note.topic_id = topic_uuid

    note.search_text = (note.title + "\n" + (note.markdown_content or "")).strip()

    db.add(note)
    db.commit()
    db.refresh(note)

    if "tag_ids" in payload.model_fields_set and payload.tag_ids is not None:
        # reset note tags
        try:
            tag_uuid_list = [uuid.UUID(tid) for tid in payload.tag_ids]
        except ValueError as e:
            raise HTTPException(status_code=422, detail="Invalid tag_ids") from e

        tags = list(
            db.execute(select(Tag).where(Tag.user_id == current_user.id, Tag.id.in_(tag_uuid_list))).scalars()
        )
        if len(tags) != len(set(tag_uuid_list)):
            raise HTTPException(status_code=404, detail="Tag not found")

        db.execute(delete(NoteTag).where(NoteTag.note_id == note.id))
        for t in tags:
            db.add(NoteTag(note_id=note.id, tag_id=t.id))
        db.commit()
        setattr(note, "_tag_ids", [t.id for t in tags])
    else:
        tag_rows = db.execute(select(NoteTag.tag_id).where(NoteTag.note_id == note.id)).scalars().all()
        setattr(note, "_tag_ids", list(tag_rows))

    return to_note_response(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        note_uuid = uuid.UUID(note_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found") from e

    note = db.get(Note, note_uuid)
    if not note or note.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    db.delete(note)
    db.commit()

