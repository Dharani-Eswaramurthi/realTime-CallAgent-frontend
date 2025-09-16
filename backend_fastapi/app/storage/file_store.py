import os
import json
from pathlib import Path
from typing import Any, List, Optional

# Use absolute path instead of relative path
BASE_DIR = Path(__file__).parent.parent.parent  # Points to backend_fastapi directory
DATA_DIR = BASE_DIR / "backend" / "data"
PAYLOAD_FILE = DATA_DIR / "payload.json"  # Single payload file


def ensure_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def save_conversation_payload(*, payload: Any) -> None:
    # Save the conversation payload to a single payload.json file, overwriting any existing file
    ensure_dir()
    with PAYLOAD_FILE.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def get_payload() -> Optional[Any]:
    # Get the current payload from the payload.json file
    ensure_dir()
    if not PAYLOAD_FILE.exists():
        return None
    try:
        with PAYLOAD_FILE.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


# Keep these functions for backward compatibility but modify them to use the single payload file
def get_all_conversations(*, limit: int = 100) -> List[Any]:
    payload = get_payload()
    return [payload] if payload else []


def get_conversation_by_id(conversation_id: str) -> Optional[Any]:
    payload = get_payload()
    if not payload:
        return None
    
    # Check if this payload matches the requested conversation_id
    payload_conv_id = (payload.get("data", {}).get("conversation_id", ""))
    
    if payload_conv_id == conversation_id:
        return payload
    return None


