# ElevenLabs Post-call Webhook Backend

Small Express + TypeScript backend to receive, verify, and store ElevenLabs Agents Platform post-call webhooks, and expose simple retrieval endpoints.

- POST /webhooks/elevenlabs: receives `post_call_transcription` and `post_call_audio`
- GET /conversations: list latest stored payloads
- GET /conversations/:conversationId: fetch most recent payload by conversation id
- GET /health: health check

## Setup

1. Create `.env` in `backend/` and set secrets. Example:

```
PORT=4000
ELEVENLABS_CONVAI_WEBHOOK_SECRET=your_shared_secret
ELEVENLABS_AGENT_ID=agent_5801k53sh15pfysvq5re9xzne33f
```

2. Install and run:

```
cd backend
npm install
npm run dev
```

The server listens on port 4000 by default.

3. Expose locally if testing inbound webhooks:

```
ngrok http 4000
```

Use the public URL to configure your webhook: `https://<ngrok>.ngrok-free.app/webhooks/elevenlabs`.

## Security: Signature Verification

This backend validates the `ElevenLabs-Signature` HMAC-SHA256 and `ElevenLabs-Timestamp` with a 5-minute skew window. Requests failing verification return 401.

- Post-call Webhooks (signature, delivery, payload fields): [link](https://elevenlabs.io/docs/agents-platform/workflows/post-call-webhooks)
- Next.js cookbook end-to-end example: [link](https://elevenlabs.io/docs/cookbooks/agents-platform/post-call-webhooks)

## Data Stored

Payloads are saved as JSON files in `backend/data/`, filename includes `event_timestamp`, `type`, and `conversation_id`. The `post_call_transcription` payload includes transcript, analysis, and metadata. As of Aug 15, 2025, fields `has_audio`, `has_user_audio`, `has_response_audio` may be included.

## Notes

- The webhook route reads the raw body for signature verification, then parses JSON.
- Respond quickly with 200 to avoid retries from ElevenLabs.


