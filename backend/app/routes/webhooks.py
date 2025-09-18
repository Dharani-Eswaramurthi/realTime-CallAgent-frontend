import os
import json
import base64
from pathlib import Path
from fastapi import APIRouter, Request, Header, HTTPException
from app.utils.signature import verify_signature
from dotenv import load_dotenv

load_dotenv(override=True)

router = APIRouter()


@router.post("")
async def elevenlabs_webhook(
    request: Request,
    elevenlabs_signature: str | None = Header(default=None, alias="ElevenLabs-Signature"),
    elevenlabs_timestamp: str | None = Header(default=None, alias="ElevenLabs-Timestamp"),
):
    secret = os.getenv("WEBHOOK_SECRET", "")
    print(secret)
    if not secret:
        raise HTTPException(status_code=500, detail={"error": "Webhook secret not configured"})

    raw_body = await request.body()

    if not verify_signature(
        raw_body=raw_body,
        secret=secret,
        signature_header=elevenlabs_signature,
        timestamp_header=elevenlabs_timestamp,
    ):
        raise HTTPException(status_code=401, detail={"error": "Invalid signature"})

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail={"error": "Invalid payload"})

    # Store payload in payload.json (overwrite each time)
    data_dir = Path(os.getcwd()) / "backend" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    payload_file = data_dir / "payload.json"
    with payload_file.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    # concise one-line summary output
    try:
        payload_type = payload.get("type")
        conversation_id = (payload.get("data") or {}).get("conversation_id")
        event_ts = payload.get("event_timestamp")
        print(f"[elevenlabs] type={payload_type} conversation_id={conversation_id} ts={event_ts}")
    except Exception:
        print("[elevenlabs] received payload")

    # full payload (pretty) as requested
    try:
        print(json.dumps(payload, ensure_ascii=False))
    except Exception:
        pass

    # If audio webhook, optionally save audio as mp3 for convenience
    try:
        if payload.get("type") == "post_call_audio":
            data = payload.get("data") or {}
            b64 = data.get("full_audio")
            conv_id = data.get("conversation_id", "unknown")
            if isinstance(b64, str) and b64:
                audio_bytes = base64.b64decode(b64)
                out_dir = Path(os.getcwd()) / "backend" / "data"
                out_dir.mkdir(parents=True, exist_ok=True)
                out_path = out_dir / f"{conv_id}.mp3"
                with out_path.open("wb") as f:
                    f.write(audio_bytes)
                print(f"[elevenlabs] saved audio -> {out_path}")
    except Exception:
        # ignore errors writing audio
        pass

    return {"ok": True}


