import hmac
import time
from hashlib import sha256
from typing import Optional, Tuple


def _parse_signature_header(signature_header: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """Parses combined header format: 't=timestamp,v0=hash'.
    Returns (timestamp, signature_hex) or (None, None) if parsing fails.
    """
    if not signature_header:
        return None, None
    # split by comma, allow whitespace
    parts = [p.strip() for p in signature_header.split(",") if p.strip()]
    ts: Optional[str] = None
    sig: Optional[str] = None
    for p in parts:
        if p.startswith("t="):
            ts = p[2:]
        elif p.startswith("v0="):
            sig = p[3:]
        elif p.startswith("sha256="):
            # backward compatibility if sent in this header
            sig = p[len("sha256="):]
    return ts, sig


def verify_signature(
    *,
    raw_body: bytes,
    secret: str,
    signature_header: Optional[str] = None,
    timestamp_header: Optional[str] = None,
    max_skew_seconds: int = 30 * 60,
) -> bool:
    """Verify HMAC per ElevenLabs docs.

    Supports:
    - Combined header: 't=timestamp,v0=hex'
    - Legacy separate headers: timestamp in `timestamp_header` and signature like 'sha256=hex' in `signature_header`
    """
    if not secret:
        return False

    ts, sig = _parse_signature_header(signature_header)
    # If combined header missing pieces, try legacy timestamp header
    if not ts and timestamp_header:
        ts = timestamp_header
    if not sig:
        return False

    try:
        ts_int = int(ts)  # seconds epoch
    except Exception:
        return False

    now = int(time.time())
    if abs(now - ts_int) > max_skew_seconds:
        return False

    h = hmac.new(secret.encode("utf-8"), digestmod=sha256)
    h.update(f"{ts_int}.".encode("utf-8"))
    h.update(raw_body)
    expected = h.hexdigest()

    try:
        return hmac.compare_digest(bytes.fromhex(expected), bytes.fromhex(sig))
    except Exception:
        return False


