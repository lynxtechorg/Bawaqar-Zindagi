"""
Bawaqar Zindagi — AI copilot proxy.

`ollamafreeapi` is a Python package, so it can't run in the browser. This tiny
FastAPI service wraps it and exposes a /chat endpoint the React app calls.

RUN:
    cd ai-server
    pip install -r requirements.txt
    uvicorn main:app --port 8000 --reload

The frontend talks to http://localhost:8000 (override with VITE_AI_URL).
NOTE: the app de-identifies clinical text (no names/CNIC/contact) before sending,
since the free model tier is not a PHI-safe environment.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ollamafreeapi import OllamaFreeAPI

app = FastAPI(title="BWZ AI Copilot")

# Allow the Vite dev server (and your deployed frontend) to call this.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OllamaFreeAPI()

# A small, fast, free model. Swap for any from `client.list_models()`.
DEFAULT_MODEL = "llama3.2:3b"


class ChatRequest(BaseModel):
    prompt: str
    model: str | None = None
    temperature: float = 0.4


@app.get("/health")
def health():
    return {"ok": True, "model": DEFAULT_MODEL}


@app.get("/models")
def models():
    try:
        return {"ok": True, "models": client.list_models()}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": str(e)}


@app.post("/chat")
def chat(req: ChatRequest):
    try:
        text = client.chat(
            model=req.model or DEFAULT_MODEL,
            prompt=req.prompt,
            temperature=req.temperature,
        )
        return {"ok": True, "text": str(text)}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "error": str(e)}
