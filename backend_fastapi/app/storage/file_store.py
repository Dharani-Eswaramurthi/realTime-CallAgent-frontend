import os
import json
from pathlib import Path
from typing import Any, List, Optional


DATA_DIR = Path(os.getcwd()) / "backend" / "data"


def ensure_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _get_filename(payload: Any) -> str:
    payload_type = payload.get("type", "unknown") if isinstance(payload, dict) else "unknown"
    conversation_id = (
        payload.get("data", {}).get("conversation_id", "no_conversation")
        if isinstance(payload, dict)
        else "no_conversation"
    )
    event_ts = payload.get("event_timestamp") if isinstance(payload, dict) else None
    if not isinstance(event_ts, int):
        import time

        event_ts = int(time.time() * 1000)
    safe_conv = str(conversation_id)
    safe_conv = "".join(c if c.isalnum() or c in ["_", "-"] else "_" for c in safe_conv)
    return f"{event_ts}_{payload_type}_{safe_conv}.json"


def save_conversation_payload(*, payload: Any) -> None:
    ensure_dir()
    filename = _get_filename(payload)
    file_path = DATA_DIR / filename
    with file_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def get_all_conversations(*, limit: int = 100) -> List[Any]:
    ensure_dir()
    files = sorted([p for p in DATA_DIR.glob("*.json")], key=lambda p: p.name, reverse=True)
    items: List[Any] = []
    for p in files[:limit]:
        try:
            with p.open("r", encoding="utf-8") as f:
                items.append(json.load(f))
        except Exception:
            pass
    return items


def get_conversation_by_id(conversation_id: str) -> Optional[Any]:
    ensure_dir()
    matches = sorted([p for p in DATA_DIR.glob(f"*{conversation_id}*.json")], key=lambda p: p.name, reverse=True)
    if not matches:
        return None
    try:
        with matches[0].open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


