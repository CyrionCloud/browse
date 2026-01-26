from langchain_core.tools import tool
from .search.service import search_service
from .planning.service import planning_service, StepStatus
from .cdp.client import CDPClient
from .cdp.dispatcher import CDPActionDispatcher
from .cdp.a11y import A11yProvider
from typing import List, Optional
import json

# --- Search Tools ---
@tool
async def web_search(query: str, num_results: int = 5):
    """
    Performs a high-quality web search.
    Returns a list of results with titles, URLs, and snippets.
    Use this to find information, tutorials, or documentation.
    """
    response = await search_service.execute(query, num_results, fetch_content=False)
    # Simple formatting for LLM
    return json.dumps([r.model_dump() for r in response.results], default=str)

@tool
async def read_page(url: str):
    """
    Reads the main content of a webpage.
    Use this after search to get details suitable for answering questions.
    """
    from .search.fetcher import WebContentFetcher
    content = await WebContentFetcher.fetch(url)
    if not content:
        return "Failed to fetch content."
    return content[:8000] # Limit tokens

# --- Planning Tools ---
@tool
def create_plan(title: str, steps: List[str]):
    """
    Creates a new stateful plan.
    Use this for complex multi-step tasks to track progress.
    """
    plan = planning_service.create_plan(title, steps)
    return f"Plan Created: {plan.title} (ID: {plan.plan_id})"

@tool
def update_step(step_index: int, status: str, notes: str = None):
    """
    Updates a step in the active plan.
    Status can be: 'not_started', 'in_progress', 'completed', 'blocked'.
    """
    # Map string to enum
    try:
        status_enum = StepStatus(status.lower())
    except:
        return f"Invalid status. Use: {', '.join([s.value for s in StepStatus])}"
    
    plan = planning_service.get_active_plan()
    if not plan:
        return "No active plan found. Create one first."
        
    updated = planning_service.update_step_status(plan.plan_id, step_index, status_enum, notes)
    if not updated:
        return "Failed to update step."
    return f"Step {step_index} updated to {status}."

@tool
def get_current_plan():
    """Gets the current plan status."""
    plan = planning_service.get_active_plan()
    if not plan:
        return "No active plan."
    return plan.model_dump_json()

# --- CDP Tools (Requires Initialization) ---
class CDPTools:
    def __init__(self, client: CDPClient):
        self.client = client
        self.dispatcher = CDPActionDispatcher(client)
        self.a11y = A11yProvider(client)
        
    async def get_tools(self):
        """Returns list of bound tools."""
        return [
            self.fast_click,
            self.fast_type,
            self.get_a11y_tree
        ]

    @tool
    async def fast_click(self, x: float, y: float):
        """
        Instantly clicks a coordinate using Chrome DevTools Protocol.
        Much faster (~50ms) than standard click. 
        Use this when you know the coordinates.
        """
        # Note: 'self' binding in @tool is tricky, usually handled by closure or class wrapper
        # For simplicity here, we assume client is passed or bound elsewhere
        # Actual implementation needs proper binding.
        pass

# ... For browser-use, simpler to return function references bound to instance
def create_cdp_tools(client: CDPClient) -> List[any]:
    dispatcher = CDPActionDispatcher(client)
    a11y = A11yProvider(client)

    @tool
    async def cdp_click(x: float, y: float):
        """Fast click at coordinates via CDP."""
        await dispatcher.click(x, y)
        return "Clicked"

    @tool
    async def cdp_type(text: str):
        """Fast type text via CDP."""
        await dispatcher.type_text(text)
        return "Typed"

    @tool
    async def get_accessibility_tree():
        """Gets the simplified accessibility tree (lighter than HTML)."""
        tree = await a11y.get_simplified_tree()
        return json.dumps(tree[:50]) # Limit for tokens
        
    return [cdp_click, cdp_type, get_accessibility_tree]

def get_logic_tools() -> List[any]:
    """Returns Logic Core tools (Search, Planning)."""
    return [
        web_search,
        read_page,
        create_plan,
        update_step,
        get_current_plan
    ]
