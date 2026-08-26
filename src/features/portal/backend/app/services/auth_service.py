from __future__ import annotations

from uuid import UUID

from app.config import load_config
from app.repos import (
    UserRow,
    delete_session,
    get_user_by_username,
    insert_session,
)
from app.security import hash_password, new_session_id, session_expiry, verify_password


class LoginFailedError(Exception):
    pass


def authenticate(username: str, password: str) -> tuple[UserRow, UUID]:
    user = get_user_by_username(username)
    if user is None or user.is_deleted:
        raise LoginFailedError
    if not verify_password(password, user.password_hash):
        raise LoginFailedError
    cfg = load_config()
    session_id = new_session_id()
    insert_session(session_id, user.id, session_expiry(cfg.session_timeout_minutes))
    return user, session_id


def logout(session_id: UUID) -> None:
    delete_session(session_id)


def hash_new_password(password: str) -> str:
    return hash_password(password)
