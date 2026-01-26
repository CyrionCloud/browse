import asyncio
import requests
from bs4 import BeautifulSoup
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class WebContentFetcher:
    """Fetches and cleans content from URLs."""
    
    @staticmethod
    async def fetch(url: str, timeout: int = 10) -> Optional[str]:
        """Fetches URL content and returns clean text."""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        try:
            # Use run_in_executor for blocking I/O
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                lambda: requests.get(url, headers=headers, timeout=timeout)
            )
            
            if response.status_code != 200:
                logger.warning(f"Failed to fetch {url}: {response.status_code}")
                return None
                
            soup = BeautifulSoup(response.text, "html.parser")
            
            # Remove junk
            for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
                tag.decompose()
                
            text = soup.get_text(separator="\n", strip=True)
            
            # Basic cleanup
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            return "\n".join(lines)[:10000] # Limit size
            
        except Exception as e:
            logger.warning(f"Error fetching {url}: {e}")
            return None
