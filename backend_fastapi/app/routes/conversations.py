import os
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query


router = APIRouter()


@router.get("/")
async def list_conversations():
    # Keep for compatibility but return empty
    return {"items": []}


@router.get("/latest")
async def get_latest_transcript():
    """Return only transcript (agent messages) and summary from payload.json"""
    data_dir = Path(os.getcwd()) / "backend" / "data"
    payload_file = data_dir / "payload.json"
    
    if not payload_file.exists():
        return {"transcript": [], "summary": None}
    
    try:
        with payload_file.open("r", encoding="utf-8") as f:
            payload = json.load(f)
        
        # Extract transcript and include both agent and user messages
        raw_transcript = payload.get("data", {}).get("transcript", [])
        all_messages = []
        
        for entry in raw_transcript:
            if entry.get("role") in ["agent", "user"] and entry.get("message"):
                all_messages.append({
                    "role": entry["role"],
                    "message": entry["message"]
                })
        
        # Extract summary
        summary = payload.get("data", {}).get("analysis", {}).get("transcript_summary")
        
        return {
            "transcript": all_messages,
            "summary": summary if isinstance(summary, str) else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": f"Failed to read payload: {str(e)}"})

