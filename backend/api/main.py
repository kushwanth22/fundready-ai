from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.agents.fundready_agent import run_agent_stream

app = FastAPI(title="FundReady AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    name: str
    description: str
    stage: str = "pre-seed"
    industry: str = ""
    target_market: str = ""


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/generate")
async def generate(req: GenerateRequest):
    """
    Start the FundReady agent.
    Returns a Server-Sent Events stream with log messages + final deal room.
    """
    async def event_stream():
        try:
            async for chunk in run_agent_stream(req.model_dump()):
                yield chunk
        except Exception as e:
            import json
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/chat")
async def chat(body: dict):
    """
    Chat endpoint for follow-up questions against generated docs.
    body: { message: str, context: { docs: {...}, deal_room: {...} } }
    """
    from langchain_anthropic import ChatAnthropic
    from langchain_core.messages import HumanMessage, SystemMessage
    from backend.utils.config import settings
    import json

    llm = ChatAnthropic(
        model=settings.anthropic_model,
        api_key=settings.anthropic_api_key,
        max_tokens=1024,
    )

    docs_context = json.dumps(body.get("context", {}).get("docs", {}), indent=2)
    message = body.get("message", "")

    response = await llm.ainvoke([
        SystemMessage(content=f"""You are a startup advisor helping a founder refine their fundraising materials.
You have access to their generated documents. Answer questions, suggest improvements,
and help them prepare for investor conversations.

GENERATED DOCUMENTS:
{docs_context}"""),
        HumanMessage(content=message),
    ])

    return {"response": response.content}
