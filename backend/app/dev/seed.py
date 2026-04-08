import argparse
import uuid

from sqlalchemy import delete, select

from app.db import SessionLocal
from app.models import Note, NoteTag, Tag, Topic, User
from app.security import hash_password


SEED_EMAIL = "sample.user@example.com"
SEED_PASSWORD = "Password123!"


def get_or_create_user(email: str, password: str) -> User:
    with SessionLocal() as db:
        existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if existing:
            return existing
        user = User(email=email, password_hash=hash_password(password))
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


def reset_user_data(user_id: uuid.UUID) -> None:
    with SessionLocal() as db:
        note_ids = db.execute(select(Note.id).where(Note.user_id == user_id)).scalars().all()
        if note_ids:
            db.execute(delete(NoteTag).where(NoteTag.note_id.in_(note_ids)))
            db.execute(delete(Note).where(Note.id.in_(note_ids)))
        db.execute(delete(Tag).where(Tag.user_id == user_id))
        db.execute(delete(Topic).where(Topic.user_id == user_id))
        db.commit()


def get_or_create_topic(
    user_id: uuid.UUID,
    *,
    name: str,
    color: str,
    icon_type: str,
    icon_emoji: str | None = None,
    icon_image_url: str | None = None,
) -> Topic:
    with SessionLocal() as db:
        existing = db.execute(
            select(Topic).where(Topic.user_id == user_id, Topic.name == name)
        ).scalar_one_or_none()
        if existing:
            return existing
        topic = Topic(
            user_id=user_id,
            name=name,
            color=color,
            icon_type=icon_type,
            icon_emoji=icon_emoji if icon_type == "emoji" else None,
            icon_image_url=icon_image_url if icon_type == "image" else None,
        )
        db.add(topic)
        db.commit()
        db.refresh(topic)
        return topic


def get_or_create_tag(user_id: uuid.UUID, *, name: str) -> Tag:
    with SessionLocal() as db:
        existing = db.execute(select(Tag).where(Tag.user_id == user_id, Tag.name == name)).scalar_one_or_none()
        if existing:
            return existing
        tag = Tag(user_id=user_id, name=name)
        db.add(tag)
        db.commit()
        db.refresh(tag)
        return tag


def create_note(
    user_id: uuid.UUID,
    *,
    title: str,
    markdown_content: str,
    topic_id: uuid.UUID | None = None,
    is_starred: bool = False,
    tag_ids: list[uuid.UUID] | None = None,
) -> Note:
    with SessionLocal() as db:
        note = Note(
            user_id=user_id,
            topic_id=topic_id,
            title=title,
            markdown_content=markdown_content,
            is_starred=is_starred,
            search_text=(title + "\n" + (markdown_content or "")).strip(),
        )
        db.add(note)
        db.commit()
        db.refresh(note)

        if tag_ids:
            for tid in dict.fromkeys(tag_ids):
                db.add(NoteTag(note_id=note.id, tag_id=tid))
            db.commit()

        return note


def seed(reset: bool) -> None:
    user = get_or_create_user(SEED_EMAIL, SEED_PASSWORD)
    if reset:
        reset_user_data(user.id)

    # Topics
    t_backend = get_or_create_topic(
        user.id, name="Backend", color="blue", icon_type="emoji", icon_emoji="🧱"
    )
    t_frontend = get_or_create_topic(
        user.id, name="Frontend", color="purple", icon_type="emoji", icon_emoji="🖥️"
    )
    t_db = get_or_create_topic(user.id, name="DB", color="green", icon_type="emoji", icon_emoji="🗄️")

    # Tags
    tag_names = [
        "fastapi",
        "react",
        "typescript",
        "postgres",
        "docker",
        "auth",
        "fts",
        "tips",
    ]
    tags = {name: get_or_create_tag(user.id, name=name) for name in tag_names}

    # Notes
    create_note(
        user.id,
        title="FastAPI: Depends と認証の最小構成",
        markdown_content=(
            "## 要点\n"
            "- `Depends(get_current_user)` でルート単位に認可\n"
            "- JWT は `sub` に user_id を入れる\n\n"
            "## メモ\n"
            "ルータ分割する場合は `api_router.include_router(...)` で集約。"
        ),
        topic_id=t_backend.id,
        is_starred=True,
        tag_ids=[tags["fastapi"].id, tags["auth"].id],
    )
    create_note(
        user.id,
        title="PostgreSQL FTS: websearch_to_tsquery の使いどころ",
        markdown_content=(
            "検索ボックス向けに `websearch_to_tsquery('simple', q)` が便利。\n"
            "- quoted phrase\n"
            "- AND/OR\n"
            "- `-word` の除外\n\n"
            "`ts_rank_cd` で relevance ソート。"
        ),
        topic_id=t_db.id,
        tag_ids=[tags["postgres"].id, tags["fts"].id],
    )
    create_note(
        user.id,
        title="React: Notes 画面のレイアウト改善案",
        markdown_content=(
            "- 左: 一覧 / 右: 編集\n"
            "- Sticky header に検索・フィルタ\n"
            "- ボタン/入力の見た目を統一\n"
        ),
        topic_id=t_frontend.id,
        tag_ids=[tags["react"].id, tags["typescript"].id, tags["tips"].id],
    )
    create_note(
        user.id,
        title="Docker Compose: 開発でのホットリロード方針",
        markdown_content=(
            "frontend/backed ともに volume mount。\n"
            "- frontend: Vite dev server\n"
            "- backend: uvicorn --reload\n"
        ),
        topic_id=t_backend.id,
        tag_ids=[tags["docker"].id, tags["tips"].id],
    )

    print("Seed completed.")
    print(f"Sample account email: {SEED_EMAIL}")
    print(f"Sample account password: {SEED_PASSWORD}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed dev data for MyKnowledge.")
    parser.add_argument("--reset", action="store_true", help="Delete existing data for the seed user first.")
    args = parser.parse_args()
    seed(reset=args.reset)


if __name__ == "__main__":
    main()

