from fastapi import APIRouter, HTTPException
from app.storage.file_store import get_all_conversations, get_conversation_by_id


router = APIRouter()


@router.get("/")
async def list_conversations():
    items = get_all_conversations(limit=50)
    return {"items": items}


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str):
    item = get_conversation_by_id(conversation_id)
    if item is None:
        raise HTTPException(status_code=404, detail={"error": "Not found"})
    return item


