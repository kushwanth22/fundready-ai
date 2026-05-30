from typing import Optional
from pydantic import BaseModel


class StartupInput(BaseModel):
    name: str
    description: str
    stage: str = "pre-seed"          # pre-seed | seed | series-a
    industry: str = ""
    target_market: str = ""


class ResearchData(BaseModel):
    competitors: list[dict] = []
    market_news: list[dict] = []
    funding_rounds: list[dict] = []
    producthunt_results: list[dict] = []


class GeneratedDocs(BaseModel):
    market_research: str = ""
    competitor_analysis: str = ""
    tam_sam_som: str = ""
    icp_profile: str = ""
    one_pager: str = ""
    investor_emails: str = ""


class BoxDealRoom(BaseModel):
    folder_id: str = ""
    folder_url: str = ""
    files: list[dict] = []


class AgentState(BaseModel):
    """Full state passed through every LangGraph node."""
    startup: StartupInput
    research: ResearchData = ResearchData()
    analysis: dict = {}
    docs: GeneratedDocs = GeneratedDocs()
    deal_room: BoxDealRoom = BoxDealRoom()
    status: str = "starting"
    error: Optional[str] = None
    log: list[str] = []
