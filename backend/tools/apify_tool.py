"""
Apify tool — scrapes live data across 3 sources:
  1. Google Search (competitors + market news)
  2. ProductHunt (similar products)
  3. Crunchbase-style (recent funding rounds via news)
"""
import asyncio
from apify_client import ApifyClient
from backend.utils.config import settings

client = ApifyClient(settings.apify_api_token)


async def scrape_google(query: str, max_results: int = 8) -> list[dict]:
    """Use Apify's Google Search Scraper actor."""
    run_input = {
        "queries": query,
        "maxPagesPerQuery": 1,
        "resultsPerPage": max_results,
        "outputFormats": ["markdown"],
    }
    run = await asyncio.to_thread(
        lambda: client.actor("apify/google-search-scraper").call(run_input=run_input)
    )
    results = []
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        for r in item.get("organicResults", []):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "description": r.get("description", ""),
            })
    return results[:max_results]


async def scrape_producthunt(keyword: str, max_results: int = 5) -> list[dict]:
    """Scrape ProductHunt for similar products."""
    run_input = {
        "search": keyword,
        "maxItems": max_results,
    }
    try:
        run = await asyncio.to_thread(
            lambda: client.actor("hMvNSpz3JnHgl5jkh").call(run_input=run_input)
        )
        results = []
        for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            results.append({
                "name": item.get("name", ""),
                "tagline": item.get("tagline", ""),
                "url": item.get("url", ""),
                "votes": item.get("votesCount", 0),
                "description": item.get("description", ""),
            })
        return results
    except Exception:
        # Fallback — search ProductHunt via Google
        return await scrape_google(f"site:producthunt.com {keyword}", max_results)


async def scrape_funding_news(startup_description: str, industry: str) -> list[dict]:
    """Scrape recent funding news for the industry."""
    query = f"{industry} startup funding raised 2024 2025"
    return await scrape_google(query, max_results=6)


async def run_research(startup_name: str, description: str, industry: str) -> dict:
    """Run all scrapers in parallel and return combined research data."""
    competitor_query = f"{description} competitors alternatives"
    news_query = f"{industry} {description} market trends 2025"

    competitors_task = scrape_google(competitor_query, max_results=8)
    news_task = scrape_google(news_query, max_results=6)
    producthunt_task = scrape_producthunt(description, max_results=5)
    funding_task = scrape_funding_news(description, industry)

    competitors, news, producthunt, funding = await asyncio.gather(
        competitors_task, news_task, producthunt_task, funding_task
    )

    return {
        "competitors": competitors,
        "market_news": news,
        "producthunt_results": producthunt,
        "funding_rounds": funding,
    }
