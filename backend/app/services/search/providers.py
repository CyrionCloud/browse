from typing import List
from duckduckgo_search import DDGS
from .base import BaseSearchEngine, SearchResult
import logging

logger = logging.getLogger(__name__)

class DuckDuckGoSearchEngine(BaseSearchEngine):
    """DuckDuckGo Search Implementation."""
    
    async def search(self, query: str, num_results: int = 5, **kwargs) -> List[SearchResult]:
        try:
            results = DDGS().text(query, max_results=num_results)
            formatted_results = []
            
            if not results:
                return []
                
            for i, res in enumerate(results):
                formatted_results.append(SearchResult(
                    position=i+1,
                    url=res.get('href', ''),
                    title=res.get('title', ''),
                    description=res.get('body', ''),
                    source='duckduckgo'
                ))
            return formatted_results
            
        except Exception as e:
            logger.error(f"DDG Search failed: {e}")
            return []

# Placeholder for Google if we add it later
class GoogleSearchEngine(BaseSearchEngine):
    async def search(self, query: str, num_results: int = 5, **kwargs) -> List[SearchResult]:
        # Implement using googlesearch-python or custom scraper
        return []
