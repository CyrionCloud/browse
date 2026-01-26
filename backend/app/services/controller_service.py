from browser_use import Controller, ActionResult
from app.services.search.service import search_service
from app.services.search.fetcher import WebContentFetcher
from app.services.planning.service import planning_service, StepStatus
from app.services.cdp.client import CDPClient
from app.services.cdp.dispatcher import CDPActionDispatcher
from app.services.cdp.a11y import A11yProvider
import json
import logging

logger = logging.getLogger(__name__)

controller = Controller()

cdp_client: CDPClient | None = None
cdp_dispatcher: CDPActionDispatcher | None = None
a11y_provider: A11yProvider | None = None

def init_cdp_tools(client: CDPClient):
    global cdp_client, cdp_dispatcher, a11y_provider
    cdp_client = client
    cdp_dispatcher = CDPActionDispatcher(client)
    a11y_provider = A11yProvider(client)

@controller.action("Search the web using DuckDuckGo. Use this to find information, tutorials, or documentation.")
async def web_search(query: str, num_results: int = 5) -> ActionResult:
    response = await search_service.execute(query, num_results, fetch_content=False)
    return ActionResult(
        extracted_content=json.dumps([r.model_dump() for r in response.results], default=str),
        include_in_memory=True
    )

@controller.action("Read the main content of a webpage. Use this after search to get details suitable for answering questions.")
async def read_page(url: str) -> ActionResult:
    content = await WebContentFetcher.fetch(url)
    if not content:
        return ActionResult(error="Failed to fetch content.")
    return ActionResult(
        extracted_content=content[:8000],
        include_in_memory=True
    )

@controller.action("Create a new stateful plan with a list of steps. Use this for complex multi-step tasks to track progress.")
async def create_plan(title: str, steps: list[str]) -> ActionResult:
    plan = planning_service.create_plan(title, steps)
    return ActionResult(
        extracted_content=f"Plan Created: {plan.title} (ID: {plan.plan_id})",
        include_in_memory=True
    )

@controller.action("Update a step in the active plan. Status can be: not_started, in_progress, completed, blocked.")
async def update_step(step_index: int, status: str, notes: str = None) -> ActionResult:
    try:
        status_enum = StepStatus(status.lower())
    except:
        valid = ', '.join([s.value for s in StepStatus])
        return ActionResult(error=f"Invalid status. Use: {valid}")
    
    plan = planning_service.get_active_plan()
    if not plan:
        return ActionResult(error="No active plan found. Create one first.")
    
    updated = planning_service.update_step_status(plan.plan_id, step_index, status_enum, notes)
    if not updated:
        return ActionResult(error="Failed to update step.")
    return ActionResult(
        extracted_content=f"Step {step_index} updated to {status}.",
        include_in_memory=True
    )

@controller.action("Get the current plan status including all steps and their statuses.")
async def get_current_plan() -> ActionResult:
    plan = planning_service.get_active_plan()
    if not plan:
        return ActionResult(extracted_content="No active plan.")
    return ActionResult(
        extracted_content=plan.model_dump_json(),
        include_in_memory=True
    )

@controller.action("Instantly click at screen coordinates using Chrome DevTools Protocol. Much faster (~50ms) than standard click. Use this when you know exact coordinates.")
async def cdp_click(x: float, y: float) -> ActionResult:
    if not cdp_dispatcher:
        return ActionResult(error="CDP not initialized.")
    await cdp_dispatcher.click(x, y)
    return ActionResult(extracted_content=f"Clicked at ({x}, {y})", include_in_memory=False)

@controller.action("Type text instantly using Chrome DevTools Protocol. Much faster than standard typing.")
async def cdp_type(text: str) -> ActionResult:
    if not cdp_dispatcher:
        return ActionResult(error="CDP not initialized.")
    await cdp_dispatcher.type_text(text)
    return ActionResult(extracted_content=f"Typed: {text}", include_in_memory=False)

@controller.action("Get the simplified accessibility tree of the current page. This is much lighter (~90% fewer tokens) than raw HTML.")
async def get_accessibility_tree() -> ActionResult:
    if not a11y_provider:
        return ActionResult(error="A11y provider not initialized.")
    tree = await a11y_provider.get_simplified_tree()
    return ActionResult(
        extracted_content=json.dumps(tree[:50], default=str),
        include_in_memory=True
    )
