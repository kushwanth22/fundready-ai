"""
FundReady AI — LangGraph Agent
4 nodes: research → analyze → generate → upload
"""
from typing import AsyncGenerator
import json

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END

from backend.models.state import AgentState, ResearchData, GeneratedDocs, BoxDealRoom
from backend.tools.apify_tool import run_research
from backend.tools.box_tool import upload_all_docs
from backend.utils.config import settings

llm = ChatAnthropic(
    model=settings.anthropic_model,
    api_key=settings.anthropic_api_key,
    max_tokens=4096,
)


# ─────────────────────────────────────────
# NODE 1: Research (Apify)
# ─────────────────────────────────────────
async def research_node(state: AgentState) -> AgentState:
    state.status = "researching"
    state.log.append("🔍 Scraping live data with Apify...")

    data = await run_research(
        startup_name=state.startup.name,
        description=state.startup.description,
        industry=state.startup.industry or state.startup.description,
    )

    state.research = ResearchData(**data)
    state.log.append(
        f"✅ Research complete — {len(state.research.competitors)} competitors, "
        f"{len(state.research.market_news)} news articles, "
        f"{len(state.research.producthunt_results)} ProductHunt results"
    )
    return state


# ─────────────────────────────────────────
# NODE 2: Analyze (Claude)
# ─────────────────────────────────────────
async def analyze_node(state: AgentState) -> AgentState:
    state.status = "analyzing"
    state.log.append("🧠 Claude is analyzing market data...")

    research_summary = json.dumps({
        "competitors": state.research.competitors[:5],
        "market_news": state.research.market_news[:4],
        "funding_rounds": state.research.funding_rounds[:4],
        "producthunt": state.research.producthunt_results[:3],
    }, indent=2)

    system = """You are a top-tier startup analyst and VC associate.
You have deep expertise in market research, competitive analysis, and fundraising strategy.
Always be specific, data-driven, and actionable. Use the scraped data provided."""

    prompt = f"""Analyze this startup and the scraped research data:

STARTUP:
Name: {state.startup.name}
Description: {state.startup.description}
Stage: {state.startup.stage}
Industry: {state.startup.industry}
Target Market: {state.startup.target_market}

SCRAPED RESEARCH DATA:
{research_summary}

Provide a structured analysis in JSON format with these keys:
{{
  "market_size_estimate": "...",
  "top_competitors": [...],
  "market_gaps": [...],
  "icp": {{
    "title": "...",
    "company_size": "...",
    "pain_points": [...],
    "buying_triggers": [...]
  }},
  "positioning_angle": "...",
  "key_differentiators": [...],
  "fundraising_narrative": "..."
}}

Respond ONLY with the JSON, no markdown fences."""

    response = await llm.ainvoke([
        SystemMessage(content=system),
        HumanMessage(content=prompt),
    ])

    try:
        state.analysis = json.loads(response.content)
    except Exception:
        state.analysis = {"raw": response.content}

    state.log.append("✅ Market analysis complete")
    return state


# ─────────────────────────────────────────
# NODE 3: Generate Docs (Claude)
# ─────────────────────────────────────────
async def generate_node(state: AgentState) -> AgentState:
    state.status = "generating"
    state.log.append("📝 Generating investor documents...")

    analysis = state.analysis
    startup = state.startup

    context = f"""
Startup: {startup.name}
Description: {startup.description}
Stage: {startup.stage}
Industry: {startup.industry}
Target Market: {startup.target_market}
Analysis: {json.dumps(analysis, indent=2)}
Raw Research: {json.dumps({
    "competitors": state.research.competitors[:4],
    "news": state.research.market_news[:3],
    "funding": state.research.funding_rounds[:3],
}, indent=2)}
"""

    async def generate_doc(doc_type: str, instructions: str) -> str:
        response = await llm.ainvoke([
            SystemMessage(content="You are a world-class startup advisor and VC pitch writer. Write in a professional, confident, and investor-ready tone. Use markdown formatting."),
            HumanMessage(content=f"{instructions}\n\nCONTEXT:\n{context}"),
        ])
        return response.content

    market_research = await generate_doc("market_research", """
Write a comprehensive Market Research report (400-500 words) with sections:
# Market Research — {name}
## Market Overview
## Market Size & Growth
## Key Trends
## Opportunity
Use specific data points from the research provided.""".format(name=startup.name))
    state.log.append("  📄 Market research written")

    competitor_analysis = await generate_doc("competitor_analysis", """
Write a Competitor Analysis (400-500 words) with sections:
# Competitor Analysis — {name}
## Competitive Landscape
## Top Competitors (table with Name | Strength | Weakness | Pricing)
## Our Differentiation
## Competitive Moat
Base it on the actual competitors found in research.""".format(name=startup.name))
    state.log.append("  📄 Competitor analysis written")

    tam_sam_som = await generate_doc("tam_sam_som", """
Write a TAM/SAM/SOM breakdown (300-400 words):
# Market Sizing — {name}
## TAM (Total Addressable Market)
## SAM (Serviceable Addressable Market)
## SOM (Serviceable Obtainable Market — Year 1-3)
## Bottom-Up Validation
Be specific with numbers and methodology.""".format(name=startup.name))
    state.log.append("  📄 TAM/SAM/SOM written")

    icp_profile = await generate_doc("icp_profile", """
Write an Ideal Customer Profile (300-400 words):
# Ideal Customer Profile — {name}
## Primary ICP
## Demographics & Firmographics
## Pain Points
## Buying Journey
## Success Metrics for Customer""".format(name=startup.name))
    state.log.append("  📄 ICP profile written")

    one_pager = await generate_doc("one_pager", """
Write a one-pager for investors (400-500 words):
# {name} — Investor One-Pager
## The Problem
## Our Solution
## Market Opportunity
## Business Model
## Traction / Why Now
## The Ask
## Team
Make it punchy and compelling — this is the first thing an investor reads.""".format(name=startup.name))
    state.log.append("  📄 One-pager written")

    investor_emails = await generate_doc("investor_emails", """
Write 3 investor outreach email templates:
# Investor Email Templates — {name}

## Template 1: Cold Outreach (Seed VC)
## Template 2: Warm Introduction Request
## Template 3: Follow-Up After No Response

Each email should be under 150 words, specific, and have a clear ask.
Include subject line for each.""".format(name=startup.name))
    state.log.append("  📄 Investor email templates written")

    state.docs = GeneratedDocs(
        market_research=market_research,
        competitor_analysis=competitor_analysis,
        tam_sam_som=tam_sam_som,
        icp_profile=icp_profile,
        one_pager=one_pager,
        investor_emails=investor_emails,
    )
    state.log.append("✅ All 6 documents generated")
    return state


# ─────────────────────────────────────────
# NODE 4: Upload to Box
# ─────────────────────────────────────────
async def upload_node(state: AgentState) -> AgentState:
    state.status = "uploading"
    state.log.append("📁 Creating Box deal room...")

    import asyncio
    result = await asyncio.to_thread(
        upload_all_docs, state.startup.name, state.docs
    )

    state.deal_room = BoxDealRoom(**result)
    state.status = "complete"
    state.log.append(f"✅ Deal room ready → {state.deal_room.folder_url}")
    return state


# ─────────────────────────────────────────
# Build the graph
# ─────────────────────────────────────────
def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("scrape", research_node)
    graph.add_node("analyze", analyze_node)
    graph.add_node("generate", generate_node)
    graph.add_node("upload", upload_node)

    graph.set_entry_point("scrape")
    graph.add_edge("scrape", "analyze")
    graph.add_edge("analyze", "generate")
    graph.add_edge("generate", "upload")
    graph.add_edge("upload", END)

    return graph.compile()


agent = build_graph()


# ─────────────────────────────────────────
# Streaming runner
# ─────────────────────────────────────────
async def run_agent_stream(startup_input: dict) -> AsyncGenerator[str, None]:
    """Run the agent and yield SSE-formatted log lines + final result."""
    from backend.models.state import StartupInput

    state = AgentState(startup=StartupInput(**startup_input))
    prev_log_len = 0

    # Emit immediately so the frontend shows activity before Apify completes (2-5 min)
    yield f"data: {json.dumps({'type': 'log', 'message': '🔍 Scraping live market data with Apify...'})}\n\n"
    yield f"data: {json.dumps({'type': 'log', 'message': '⏳ Research takes 2-4 minutes — hang tight...'})}\n\n"

    async for chunk in agent.astream(state):
        # LangGraph 0.1.x returns chunks as dicts, not AgentState objects
        for node_name, node_state in chunk.items():
            get = (lambda s: (lambda k, d=None: s.get(k, d)))(node_state) \
                if isinstance(node_state, dict) \
                else (lambda s: (lambda k, d=None: getattr(s, k, d)))(node_state)

            log = get("log", [])
            new_logs = log[prev_log_len:]
            for msg in new_logs:
                yield f"data: {json.dumps({'type': 'log', 'message': msg})}\n\n"
            if log:
                prev_log_len = len(log)

            if get("status") == "complete":
                deal_room = get("deal_room")
                docs = get("docs")
                dr = deal_room.model_dump() if hasattr(deal_room, "model_dump") else deal_room
                dc = docs.model_dump() if hasattr(docs, "model_dump") else docs
                yield f"data: {json.dumps({'type': 'complete', 'deal_room': dr, 'docs': dc})}\n\n"

            error = get("error")
            if error:
                yield f"data: {json.dumps({'type': 'error', 'message': error})}\n\n"
