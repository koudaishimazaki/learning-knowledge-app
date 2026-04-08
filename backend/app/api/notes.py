import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import Note, User
from app.schemas.note import NoteCreateRequest, NoteResponse, NoteUpdateRequest

router = APIRouter(prefix="/notes", tags=["notes"])


def to_note_response(note: Note) -> NoteResponse:
    return NoteResponse(
        id=str(note.id),
        title=note.title,
        markdown_content=note.markdown_content,
        summary=note.summary,
        is_starred=note.is_starred,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.get("", response_model=list[NoteResponse])
def list_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notes = db.execute(
        select(Note).where(Note.user_id == current_user.id).order_by(Note.updated_at.desc())
    ).scalars()
    return [to_note_response(n) for n in notes]


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NoteCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    note = Note(
        user_id=current_user.id,
        title=payload.title,
        markdown_content=payload.markdown_content or "",
        summary=payload.summary,
        is_starred=payload.is_starred,
        search_text=(payload.title + "\n" + (payload.markdown_content or "")).strip(),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
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

    note.search_text = (note.title + "\n" + (note.markdown_content or "")).strip()

    db.add(note)
    db.commit()
    db.refresh(note)
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

