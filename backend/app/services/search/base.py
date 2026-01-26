from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, ConfigDict
from abc import ABC, abstractmethod

class SearchResult(BaseModel):
    """Represents a single search result."""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    position: int = Field(description="Position in search results")
    url: str = Field(description="URL of the search result")
    title: str = Field(default="", description="Title of the search result")
    description: str = Field(default="", description="Snippet/Description")
    source: str = Field(description="Source engine name")
    content: Optional[str] = Field(default=None, description="Fetched page content")

class SearchResponse(BaseModel):
    """Structured response from search service."""
    query: str
    results: List[SearchResult] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None

class BaseSearchEngine(ABC):
    """Abstract base class for search engines."""
    
    @abstractmethod
    async def search(self, query: str, num_results: int = 5, **kwargs) -> List[SearchResult]:
        pass
