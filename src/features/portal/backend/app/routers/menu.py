from __future__ import annotations

from fastapi import APIRouter, Depends

from app.deps import AuthContext, get_current_user
from app.security import to_data_url
from app.services.menu_service import list_allowed_menu_items

router = APIRouter()


@router.get("/menu")
def get_menu(auth: AuthContext = Depends(get_current_user)) -> dict[str, list[dict[str, str]]]:
    items = list_allowed_menu_items(auth.user.id)
    return {
        "items": [
            {
                "id": item.id,
                "title": item.title,
                "url": item.url,
                "icon": to_data_url(item.icon_media_type, item.icon),
            }
            for item in items
        ]
    }
