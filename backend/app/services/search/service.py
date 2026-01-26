from typing import List, Optional
from tenacity import retry, stop_after_attempt, wait_exponential
from .base import SearchResult, SearchResponse
from .providers import DuckDuckGoSearchEngine
from .fetcher import WebContentFetcher
import logging
import asyncio

logger = logging.getLogger(__name__)

class SearchService:
    """Orchestrates search across multiple engines with fallback."""
    
    def __init__(self):
        self.engines = {
            'duckduckgo': DuckDuckGoSearchEngine(),
            # 'google': GoogleSearchEngine()
        }
        self.default_order = ['duckduckgo'] # Add google later
        
    async def execute(self, query: str, num_results: int = 5, fetch_content: bool = False) -> SearchResponse:
        """Executes search with fallback logic."""
        
        all_results = []
        used_engine = None
        
        # 1. Try Engines in order
        for engine_name in self.default_order:
            engine = self.engines.get(engine_name)
            if not engine: continue
            
            logger.info(f"Attempting search with {engine_name} for '{query}'")
            results = await engine.search(query, num_results)
            
            if results:
                all_results = results
                used_engine = engine_name
                break
        
        if not all_results:
            logger.warning(f"All search engines failed for '{query}'")
            return SearchResponse(query=query, results=[], metadata={'error': 'All engines failed'})

        # 2. Fetch Content (Parallel)
        if fetch_content:
            logger.info(f"Fetching content for {len(all_results)} results")
            tasks = [WebContentFetcher.fetch(r.url) for r in all_results]
            contents = await asyncio.gather(*tasks)
            
            for res, content in zip(all_results, contents):
                res.content = content
                
        return SearchResponse(
            query=query,
            results=all_results,
            metadata={
                'source': used_engine,
                'total_results': len(all_results)
            }
        )

# Global Instance
search_service = SearchService()
