from __future__ import annotations

from psycopg2 import errors

from app.logger import safe_text, write
from app.repos import (
    UserRow,
    get_user_by_id,
    get_user_by_username,
    insert_user,
    list_active_users,
    logical_delete_user,
    update_user,
)
from app.security import hash_password


class NotFoundError(Exception):
    pass


class DuplicateError(Exception):
    pass


class ForbiddenOpError(Exception):
    pass


def list_users() -> list[UserRow]:
    write("INF", "ユーザ一覧要求")
    users = list_active_users()
    write("INF", f"ユーザ一覧成功 count={len(users)}")
    return users


def add_user(username: str, password: str) -> UserRow:
    logged = safe_text(username)
    write("INF", f"ユーザ追加要求 username={logged}")
    if get_user_by_username(username) is not None:
        write("WRN", f"ユーザ追加失敗 username={logged} 理由=重複")
        raise DuplicateError
    try:
        user = insert_user(username, hash_password(password))
    except errors.UniqueViolation:
        write("WRN", f"ユーザ追加失敗 username={logged} 理由=重複")
        raise DuplicateError from None
    write("INF", f"ユーザ追加成功 username={logged} id={user.id}")
    return user


def change_user(user_id: int, username: str, password: str | None) -> UserRow:
    logged = safe_text(username)
    write("INF", f"ユーザ更新要求 id={user_id} username={logged} password_set={password is not None}")
    current = get_user_by_id(user_id)
    if current is None or current.is_deleted:
        write("WRN", f"ユーザ更新失敗 id={user_id} 理由=対象なし")
        raise NotFoundError
    other = get_user_by_username(username)
    if other is not None and other.id != user_id:
        write("WRN", f"ユーザ更新失敗 id={user_id} username={logged} 理由=重複")
        raise DuplicateError
    hashed = hash_password(password) if password else None
    try:
        update_user(user_id, username, hashed)
    except errors.UniqueViolation:
        write("WRN", f"ユーザ更新失敗 id={user_id} username={logged} 理由=重複")
        raise DuplicateError from None
    updated = get_user_by_id(user_id)
    assert updated is not None
    write("INF", f"ユーザ更新成功 id={user_id} username={logged}")
    return updated


def remove_user(user_id: int, actor_id: int) -> None:
    write("INF", f"ユーザ削除要求 id={user_id} actor_id={actor_id}")
    if user_id == actor_id:
        write("WRN", f"ユーザ削除失敗 id={user_id} 理由=自己削除")
        raise ForbiddenOpError
    current = get_user_by_id(user_id)
    if current is None or current.is_deleted:
        write("WRN", f"ユーザ削除失敗 id={user_id} 理由=対象なし")
        raise NotFoundError
    logical_delete_user(user_id)
    write("INF", f"ユーザ削除成功 id={user_id} username={safe_text(current.username)}")
