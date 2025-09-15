from fastapi import FastAPI, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from app.routes.health import router as health_router
from app.routes.webhooks import router as webhook_router, elevenlabs_webhook
from app.routes.conversations import router as conversations_router


app = FastAPI()

# CORS for frontend dev (Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(webhook_router, prefix="/webhooks/elevenlabs", tags=["webhooks"])
app.include_router(conversations_router, prefix="/conversations", tags=["conversations"])


@app.post("/")
async def root_webhook(
    request: Request,
    elevenlabs_signature: str | None = Header(default=None, alias="ElevenLabs-Signature"),
    elevenlabs_timestamp: str | None = Header(default=None, alias="ElevenLabs-Timestamp"),
):
    return await elevenlabs_webhook(
        request=request,
        elevenlabs_signature=elevenlabs_signature,
        elevenlabs_timestamp=elevenlabs_timestamp,
    )


