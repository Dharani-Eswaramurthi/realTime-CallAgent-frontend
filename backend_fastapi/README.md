FastAPI backend

Run locally

1. Create and activate a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install dependencies

```bash
pip install -r requirements.txt
```

3. Set environment variables

```bash
export PORT=4001
export WEBHOOK_SECRET=your_shared_secret
```

4. Start the server

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-4001} --reload
```

Endpoints

- GET `/health` → `{ "ok": true }`
- POST `/webhooks/elevenlabs` → verifies signature and stores JSON payload
- GET `/conversations` → latest payloads
- GET `/conversations/{conversation_id}` → latest payload for id


