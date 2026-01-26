import asyncio
import base64
import cv2
import numpy as np
from browser_use import Agent, Browser, BrowserConfig
from langchain_openai import ChatOpenAI
from app.core.config import settings
from app.services.websocket import notify_session
from app.services.database import db
from app.services.self_healing_service import SelfHealingService
from app.services.owl_vision_service import owl_vision
import traceback
import json
from app.services.cdp_stream_service import cdp_streamer
from app.services.cdp.client import CDPClient
from app.services.controller_service import controller, init_cdp_tools
from app.services.cache.action_cache import action_cache

# Store running agents for intervention capability
running_agents: dict[str, Agent] = {}
# Store running browsers so they can be closed on cancel
running_browsers: dict[str, Browser] = {}
# Store stop flags to signal agents to stop
stop_flags: dict[str, bool] = {}
# Store streaming tasks for live screenshot streaming
streaming_tasks: dict[str, asyncio.Task] = {}
# Store active agent tasks for cancellation
active_tasks: dict[str, asyncio.Task] = {}

async def wait_for_cdp(cdp_url: str, timeout: int = 15) -> bool:
    """
    Wait for CDP URL to be available and return valid JSON.
    Retries for 'timeout' seconds.
    """
    import aiohttp
    
    print(f"⏳ Waiting for CDP at {cdp_url}...")
    start_time = asyncio.get_event_loop().time()
    
    # Clean URL (remove trailing slash)
    base_url = cdp_url.rstrip('/')
    
    while True:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{base_url}/json/version", timeout=2) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        print(f"   ✓ CDP available: {data.get('Browser', 'Unknown')}")
                        return True
        except Exception as e:
            pass
            
        if asyncio.get_event_loop().time() - start_time > timeout:
            print(f"   ❌ CDP wait timed out")
            return False
            
        await asyncio.sleep(1)



def get_active_page(browser: Browser):
    """
    Get the most recently active/opened page from all browser contexts.
    This fixes the issue where context.pages[0] becomes stale when new tabs are opened.
    """
    if not browser or not hasattr(browser, 'playwright_browser') or not browser.playwright_browser:
        return None
    
    all_pages = []
    try:
        for context in browser.playwright_browser.contexts:
            for page in context.pages:
                try:
                    # Check if page is still valid and not closed
                    if not page.is_closed():
                        all_pages.append(page)
                except:
                    pass
    except Exception as e:
        print(f"   ⚠ Error enumerating pages: {e}")
        return None
    
    if not all_pages:
        return None
    
    # Return the LAST page (most recently opened/active)
    # This correctly follows new tabs opened by the agent
    return all_pages[-1]

def get_running_agent(session_id: str) -> Agent | None:
    """Get a running agent by session ID."""
    return running_agents.get(session_id)

def should_stop(session_id: str) -> bool:
    """Check if agent should stop."""
    return stop_flags.get(session_id, False)

async def intervene_agent(session_id: str, message: str) -> bool:
    """Add a new task to the running agent."""
    agent = running_agents.get(session_id)
    if agent and hasattr(agent, 'add_new_task'):
        agent.add_new_task(message)
        await notify_session(session_id, "intervention", {
            "sessionId": session_id,
            "message": f"Task updated: {message}"
        })
        return True
    return False


async def click_by_mark(session_id: str, mark_id: int) -> dict:
    """
    Click an element by its Set-of-Marks visual ID.
    
    This enables visual element selection - the user/LLM sees numbered marks
    on the annotated screenshot and can click by saying "click mark 5".
    
    Args:
        session_id: Active session ID
        mark_id: The visual mark number (1-indexed)
        
    Returns:
        dict with success status and details
    """
    browser = running_browsers.get(session_id)
    if not browser:
        return {"success": False, "error": "No active browser for session"}
    
    # Get active page
    page = get_active_page(browser)
    if not page:
        return {"success": False, "error": "No active page found"}
    
    # Use OWL vision service to click by mark
    if owl_vision.is_available():
        try:
            success = await owl_vision.click_by_mark(page, mark_id)
            if success:
                element = owl_vision.get_element_by_mark(mark_id)
                coords = owl_vision.get_click_coordinates(mark_id)
                await notify_session(session_id, "click_by_mark", {
                    "sessionId": session_id,
                    "mark_id": mark_id,
                    "success": True,
                    "coordinates": coords,
                    "element_type": element.element_type if element else None
                })
                return {
                    "success": True, 
                    "mark_id": mark_id,
                    "coordinates": coords,
                    "element_type": element.element_type if element else "unknown"
                }
            else:
                return {"success": False, "error": f"Mark {mark_id} not found in current view"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    else:
        return {"success": False, "error": "OWL Vision not available"}

async def stream_cdp_screencast(session_id: str, browser: Browser):
    """
    Stream browser view using CDP's native screencast.
    This is more efficient than screenshot polling - Chrome encodes video frames natively.
    """
    print(f"🎥 Starting CDP screencast for session {session_id}")
    
    try:
        page = get_active_page(browser)
        if not page:
            print(f"   ✗ No page found for CDP screencast")
            return
        
        # Create CDP session
        cdp = await page.context.new_cdp_session(page)
        
        frame_count = 0
        
        # Handle screencast frames
        async def handle_frame(params):
            nonlocal frame_count
            frame_count += 1
            
            try:
                # Send frame to frontend
                await notify_session(session_id, "screenshot_stream", {
                    "sessionId": session_id,
                    "screenshot": params["data"],
                    "format": "jpeg",
                    "frameId": frame_count
                })
                
                # Acknowledge frame to continue receiving
                await cdp.send("Page.screencastFrameAck", {
                    "sessionId": params["sessionId"]
                })
            except Exception as e:
                print(f"   ⚠ Frame send error: {e}")
        
        # Register frame handler
        cdp.on("Page.screencastFrame", lambda params: asyncio.create_task(handle_frame(params)))
        
        # Start screencast with optimized settings
        await cdp.send("Page.startScreencast", {
            "format": "jpeg",
            "quality": 60,  # Balance quality vs bandwidth
            "maxWidth": 1280,
            "maxHeight": 720,
            "everyNthFrame": 2  # ~30fps down to ~15fps
        })
        
        print(f"   ✓ CDP screencast started")
        
        # Keep running until stop flag or browser disconnect
        while not should_stop(session_id) and session_id in running_browsers:
            # Check browser health
            try:
                if not browser.playwright_browser or not browser.playwright_browser.is_connected():
                    print(f"   ✗ Browser disconnected during screencast")
                    break
            except:
                break
            
            await asyncio.sleep(0.5)
        
        # Stop screencast
        try:
            await cdp.send("Page.stopScreencast")
            print(f"   ✓ CDP screencast stopped after {frame_count} frames")
        except:
            pass
        
    except Exception as e:
        print(f"   ✗ CDP screencast error: {e}")
        # Fallback to screenshot polling
        print(f"   ↩ Falling back to screenshot polling...")
        await stream_screenshots_fallback(session_id, browser)


async def stream_screenshots_fallback(session_id: str, browser: Browser, interval: float = 0.5):
    """
    Fallback screenshot streaming when CDP screencast fails.
    """
    print(f"🎥 Using fallback screenshot streaming for session {session_id}")
    last_screenshot_hash = None
    consecutive_failures = 0
    max_failures = 10
    
    while not should_stop(session_id) and session_id in running_browsers:
        try:
            # Check browser health
            if not browser or not hasattr(browser, 'playwright_browser') or not browser.playwright_browser:
                break
            
            try:
                if not browser.playwright_browser.is_connected():
                    break
            except:
                break
            
            page = get_active_page(browser)
            if page:
                try:
                    screenshot_bytes = await page.screenshot(
                        timeout=2000,
                        type='jpeg',
                        quality=60
                    )
                    
                    screenshot_hash = hash(screenshot_bytes[:1000])
                    
                    if screenshot_hash != last_screenshot_hash:
                        screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                        await notify_session(session_id, "screenshot_stream", {
                            "sessionId": session_id,
                            "screenshot": screenshot_base64,
                            "format": "jpeg"
                        })
                        last_screenshot_hash = screenshot_hash
                        consecutive_failures = 0
                except Exception as e:
                    consecutive_failures += 1
                    if consecutive_failures >= max_failures:
                        break
            else:
                consecutive_failures += 1
                
        except Exception as e:
            consecutive_failures += 1
            if consecutive_failures >= max_failures:
                break
        
        await asyncio.sleep(interval)
    
    print(f"🎥 Fallback streaming stopped for session {session_id}")


def start_streaming(session_id: str, browser: Browser):
    """Start the background CDP screencast streaming task."""
    if session_id not in streaming_tasks:
        # Use CDP screencast (with fallback to screenshots)
        task = asyncio.create_task(stream_cdp_screencast(session_id, browser))
        streaming_tasks[session_id] = task
        print(f"🎥 CDP streaming task started for session {session_id}")


async def stop_streaming(session_id: str):
    """Stop the background streaming task."""
    if session_id in streaming_tasks:
        task = streaming_tasks.pop(session_id)
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        print(f"🎥 Streaming task stopped for session {session_id}")

async def run_agent_task(session_id: str, task: str, token: str = None, agent_config: dict = None):
    """
    Direct integration of browser-use agent with Supabase persistence.
    """
    
    # Get max steps from config or default to 50
    max_steps = 50
    if agent_config and isinstance(agent_config, dict):
        max_steps = agent_config.get('maxSteps', 50)
    
    # notify start
    await notify_session(session_id, "session_start", {"sessionId": session_id, "status": "active", "maxSteps": max_steps})
    
    try:
        # Initialize LLM (DeepSeek via OpenAI compatible endpoint)
        llm = ChatOpenAI(
            base_url="https://api.deepseek.com",
            model="deepseek-chat",
            api_key=settings.DEEPSEEK_API_KEY
        )
        
        # Initialize Browser
        if (settings.BROWSER_MODE in ["container", "custom"]) and settings.CDP_URL:
            # Wait for CDP to be ready
            is_ready = await wait_for_cdp(settings.CDP_URL)
            if not is_ready:
                raise ConnectionError(f"Could not connect to browser at {settings.CDP_URL}")
                
            print(f"🌐 Connecting to remote browser at {settings.CDP_URL}")
            browser_config = BrowserConfig(
                cdp_url=settings.CDP_URL,
                headless=False,
                disable_security=True,
            )
        else:
            print(f"🌐 Browser initialized in HEADFUL mode for screenshot reliability")
            browser_config = BrowserConfig(
                headless=False,  # VISIBLE browser for proper rendering
                disable_security=True,
                extra_chromium_args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars", 
                    "--window-size=1920,1080",
                    "--disable-extensions",
                    "--disable-gpu",
                    "--no-sandbox",
                ],
            )
        
        browser = Browser(config=browser_config)
        print(f"🌐 Browser initialized in HEADFUL mode for screenshot reliability")

        cdp_client = None

        # Initialize CDP for Performance Core
        if (settings.BROWSER_MODE in ["container", "custom"]) and settings.CDP_URL:
            try:
                # Reuse streamer logic to find page WS URL
                ws_url = await cdp_streamer.get_cdp_ws_url(settings.CDP_URL)
                if ws_url:
                    cdp_client = CDPClient(ws_url)
                    await cdp_client.connect()
                    init_cdp_tools(cdp_client)
                    print(f"🚀 Performance Core (CDP) enabled")
            except Exception as cdp_err:
                print(f"⚠ Failed to initialize Performance Core: {cdp_err}")

        # Initialize Agent with Controller
        agent = Agent(
            task=task,
            llm=llm,
            browser=browser,
            controller=controller,
            use_vision=False,
            enable_memory=False
        )
        
        # Store agent and browser for intervention/stop capability
        running_agents[session_id] = agent
        running_browsers[session_id] = browser
        
        # Initialize OWL Vision for visual element detection
        owl_vision_enabled = False
        if agent_config and agent_config.get('enableOwlVision', True):
            try:
                owl_vision_enabled = await owl_vision.initialize()
                if owl_vision_enabled:
                    print(f"🦉 OWL Vision initialized for session {session_id}")
                else:
                    print(f"⚠ OWL Vision not available, using standard screenshots")
            except Exception as e:
                print(f"⚠ OWL Vision init error: {e}")
        
        # Start live screenshot streaming (2fps)
        start_streaming(session_id, browser)
        
        step_count = 0
        all_results = []
        current_marks = []  # Store current Set-of-Marks for click-by-mark

        # PERFORMANCE CORE: Check Action Cache
        cached_actions = None
        current_url = "about:blank" 
        
        # Try to get initial URL from task or browser
        try:
            if browser and hasattr(browser, 'playwright_browser'):
                page = get_active_page(browser)
                if page: current_url = page.url
        except: pass

        cached_actions = await action_cache.get_cached_plan(task, current_url)
        
        if cached_actions and len(cached_actions) > 0:
            print(f"🚀 PERFORMANCE CORE: Cache Hit! Replaying {len(cached_actions)} actions...")
            await notify_session(session_id, "session_update", {
                "sessionId": session_id,
                "progress": f"🚀 Instant Replay: Executing {len(cached_actions)} cached actions...",
                "step": 0,
                "maxSteps": len(cached_actions)
            })
            
            async def replay_cached_plan(actions):
                """Replay actions using CDP Action Dispatcher"""
                if not cdp_client:
                    print("⚠ No CDP Client available for replay")
                    return False
                
                from app.services.cdp.dispatcher import CDPActionDispatcher
                dispatcher = CDPActionDispatcher(cdp_client)
                
                try:
                    for i, action in enumerate(actions):
                        print(f"   ▶ Replaying action {i+1}: {action.get('type')}")
                        
                        if action.get("type") == "click" and "x" in action and "y" in action:
                            await dispatcher.click(action["x"], action["y"])
                            await asyncio.sleep(0.5) # Slight delay for stability
                            
                        elif action.get("type") == "type_text" and "text" in action:
                            await dispatcher.type_text(action["text"])
                            await asyncio.sleep(0.1)
                            
                        elif action.get("type") == "key_press" and "key" in action:
                            await dispatcher.key_press(action["key"])
                            await asyncio.sleep(0.1)
                        
                        # Use wait logic if specified
                        if "wait_ms" in action:
                            await asyncio.sleep(action["wait_ms"] / 1000)
                            
                    print(f"   ✅ Replay complete")
                    return True
                except Exception as e:
                    print(f"   ❌ Replay failed: {e}")
                    return False

            # Execute Replay
            replay_success = await replay_cached_plan(cached_actions)
            
            if replay_success:
                 # Update DB to completed
                 await db.update_session_status(session_id, "completed", {
                    "completed_at": "now()",
                    "actions_count": len(cached_actions),
                    "result": json.dumps({"success": True, "method": "replay"}, default=str)
                })
                 await notify_session(session_id, "session_complete", {
                    "sessionId": session_id,
                    "results": {"success": True, "message": "Task completed via Instant Replay"}
                })
                 return # Exit early on successful replay

            # Fallthrough to normal execution if replay failed
            print(f"   ℹ Replay failed or incomplete, falling back to Agent")

        async def on_step_end(agent_instance=None):
            nonlocal step_count
            step_count += 1
            
            step_data = {
                "step": step_count,
                "maxSteps": max_steps,
                "goal": None,
                "action": None,
                "result": None,
                "evaluation": None,
                "memory": None,
                "url": None
            }
            
            try:
                # CRITICAL: Check for stop signal immediately
                if should_stop(session_id):
                    print(f"🛑 Stop signal detected in on_step_end for session {session_id}")
                    raise asyncio.CancelledError("Session stopped by user")

                if agent_instance and hasattr(agent_instance, 'state') and agent_instance.state:
                    state = agent_instance.state
                    
                    # Get last result
                    if hasattr(state, 'last_result') and state.last_result:
                        last_result = state.last_result[-1] if isinstance(state.last_result, list) else state.last_result
                        if hasattr(last_result, 'extracted_content'):
                            step_data["result"] = last_result.extracted_content
                    
                    # Get history with model outputs
                    if hasattr(state, 'history') and state.history:
                        history = state.history
                        
                        # Get latest model output (action info)
                        if hasattr(history, 'all_model_outputs') and history.all_model_outputs:
                            latest_output = history.all_model_outputs[-1]
                            # This is a dict like {'go_to_url': {'url': '...'}} or {'click_element_by_index': {...}}
                            step_data["action"] = latest_output
                        
                        # Get latest action result
                        if hasattr(history, 'all_results') and history.all_results:
                            latest_result = history.all_results[-1]
                            if hasattr(latest_result, 'extracted_content'):
                                step_data["result"] = latest_result.extracted_content
                    
                    # Get message manager state for goal/memory/evaluation
                    if hasattr(state, 'message_manager_state') and state.message_manager_state:
                        mms = state.message_manager_state
                        if hasattr(mms, 'history') and mms.history and hasattr(mms.history, 'messages'):
                            # Look for the latest AI message with tool calls
                            for msg in reversed(mms.history.messages):
                                if hasattr(msg, 'message') and hasattr(msg.message, 'tool_calls') and msg.message.tool_calls:
                                    for tool_call in msg.message.tool_calls:
                                        if tool_call.get('name') == 'AgentOutput' and 'args' in tool_call:
                                            args = tool_call['args']
                                            if 'current_state' in args:
                                                cs = args['current_state']
                                                step_data["evaluation"] = cs.get('evaluation_previous_goal')
                                                step_data["memory"] = cs.get('memory')
                                                step_data["goal"] = cs.get('next_goal')
                                            if 'action' in args:
                                                step_data["action"] = args['action']
                                    break
                
                # EARLY STOPPING: Check for task completion
                if step_count >= 3:  # Safety: minimum 3 steps before early stop
                    evaluation = step_data.get("evaluation", "").lower() if step_data.get("evaluation") else ""
                    next_goal = step_data.get("goal", "").lower() if step_data.get("goal") else ""
                    
                    completion_indicators = ["task completed", "goal achieved", "successfully finished", 
                                            "completed successfully", "task is complete", "finished successfully"]
                    goal_empty_indicators = ["none", "no further", "task complete", "done"]
                    
                    # Check if evaluation indicates completion
                    if any(indicator in evaluation for indicator in completion_indicators):
                        print(f"✅ Early stopping detected: Task completion in evaluation at step {step_count}")
                        await notify_session(session_id, "session_update", {
                            "sessionId": session_id,
                            "progress": f"✅ Task completed successfully at step {step_count}",
                            "step": step_count,
                            "maxSteps": max_steps
                        })
                        # Signal agent to stop by raising StopIteration
                        raise StopIteration("Task completed")
                    
                    # Check if next_goal indicates finish
                    if any(indicator in next_goal for indicator in goal_empty_indicators):
                        print(f"✅ Early stopping detected: No further goals at step {step_count}")
                        await notify_session(session_id, "session_update", {
                            "sessionId": session_id,
                            "progress": f"✅ Task completed - no further actions needed at step {step_count}",
                            "step": step_count,
                            "maxSteps": max_steps
                        })
                        raise StopIteration("No further goals")
                
                all_results.append(step_data)
                print(f"Step {step_count} data: goal={step_data['goal'][:50] if step_data['goal'] else None}...")
                
            except StopIteration:
                # Re-raise to stop the agent
                raise
            except Exception as e:
                print(f"Error extracting step data: {e}")

            # Log to DB with rich metadata in dedicated columns
            try:
                # Get human-readable action name
                action_name = "navigate"
                if step_data.get("action"):
                    if isinstance(step_data["action"], list) and len(step_data["action"]) > 0:
                        first_action = step_data["action"][0]
                        if isinstance(first_action, dict):
                            action_name = list(first_action.keys())[0] if first_action else "navigate"
                
                await db.log_action(session_id, {
                    "action_type": "navigate",  # Valid DB constraint value
                    "target_description": (step_data.get("goal") or "Step completed")[:500],
                    "target_selector": action_name,  # Store action type name here
                    "input_value": (step_data.get("memory") or "")[:1000],  # Store memory
                    "output_value": (step_data.get("result") or step_data.get("evaluation") or "")[:1000],  # Store result/evaluation
                    "success": True,
                    "duration_ms": 0,
                    "metadata": json.dumps({
                        "step": step_data.get("step"),
                        "maxSteps": step_data.get("maxSteps"),
                        "goal": step_data.get("goal"),
                        "action": step_data.get("action"),
                        "evaluation": step_data.get("evaluation"),
                        "memory": step_data.get("memory"),
                        "result": step_data.get("result"),
                        "url": step_data.get("url")
                    }, default=str)
                }, token=token)
            except Exception as e:
                print(f"DB log error: {e}")

            # Capture screenshot from browser and send to frontend
            print(f"🖼️  Attempting screenshot capture for step {step_count}...")
            try:
                nonlocal current_marks
                screenshot_base64 = None
                annotated_base64 = None
                page = None
                marks_description = ""
                
                # Use improved page discovery - follows active tab
                page = get_active_page(browser)
                if page:
                    print(f"   ✓ Found active page (URL: {page.url})")
                else:
                    # Fallback to agent's browser_context if available
                    if agent_instance and hasattr(agent_instance, 'browser_context') and agent_instance.browser_context:
                        try:
                            pages = agent_instance.browser_context.pages
                            if pages:
                                # Get last page (most recent)
                                page = pages[-1] if not pages[-1].is_closed() else pages[0]
                                print(f"   ✓ Found page via agent.browser_context")
                        except:
                            pass
                
                if page:
                    # Strategy 1: Try immediate screenshot first
                    try:
                        screenshot_bytes = await page.screenshot(timeout=3000, type='png')
                        screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                        print(f"   ✓ Screenshot captured immediately ({len(screenshot_bytes)} bytes)")
                    except Exception as immediate_err:
                        print(f"   ⚠ Immediate screenshot failed: {immediate_err}")
                        
                        # Strategy 2: Refresh page reference and retry
                        await asyncio.sleep(0.3)
                        page = get_active_page(browser)
                        if page:
                            try:
                                screenshot_bytes = await page.screenshot(timeout=3000, type='png')
                                screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                                print(f"   ✓ Screenshot captured after page refresh ({len(screenshot_bytes)} bytes)")
                            except Exception as retry_err:
                                print(f"   ⚠ Retry screenshot failed: {retry_err}")
                        
                        # Strategy 3: Wait for network idle then capture
                        if not screenshot_base64 and page:
                            try:
                                await page.wait_for_load_state('networkidle', timeout=5000)
                                screenshot_bytes = await page.screenshot(timeout=3000, type='png')
                                screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                                print(f"   ✓ Screenshot captured after networkidle ({len(screenshot_bytes)} bytes)")
                            except Exception as networkidle_err:
                                print(f"   ⚠ Networkidle screenshot failed: {networkidle_err}")
                                
                                # Strategy 4: Wait for load event then capture  
                                try:
                                    await page.wait_for_load_state('load', timeout=5000)
                                    await asyncio.sleep(0.5)
                                    screenshot_bytes = await page.screenshot(timeout=3000, type='png')
                                    screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                                    print(f"   ✓ Screenshot captured after load+delay ({len(screenshot_bytes)} bytes)")
                                except Exception as load_err:
                                    print(f"   ✗ All screenshot strategies failed: {load_err}")
                    
                    # Apply OWL Vision Set-of-Marks overlay if enabled
                    if screenshot_base64 and owl_vision_enabled and owl_vision.is_available():
                        try:
                            print(f"   🦉 Applying OWL Vision Set-of-Marks overlay...")
                            # Use analyze_page for YOLOv8 detection + Set-of-Marks
                            annotated_base64, current_marks, marks_description = await owl_vision.analyze_page(
                                page, 
                                interactive_only=True
                            )
                            print(f"   🦉 Detected {len(current_marks)} interactive elements")
                        except Exception as owl_err:
                            print(f"   ⚠ OWL Vision error: {owl_err}")
                            # Continue with raw screenshot
                    
                    # Send screenshot(s) to frontend
                    if screenshot_base64:
                        # Send raw screenshot
                        await notify_session(session_id, "screenshot", {
                            "sessionId": session_id,
                            "screenshot": screenshot_base64,
                            "format": "png"
                        })
                        print(f"   📤 Raw screenshot sent to frontend for step {step_count}")
                        
                        # Send annotated screenshot with marks if available
                        if annotated_base64:
                            marks_data = [
                                {
                                    "id": m.mark_id,
                                    "type": m.element_type,
                                    "center": m.center,
                                    "box": m.bounding_box,
                                    "text": m.text[:100] if m.text else None,
                                    "confidence": m.confidence
                                }
                                for m in current_marks
                            ]
                            await notify_session(session_id, "owl_vision", {
                                "sessionId": session_id,
                                "annotated_screenshot": annotated_base64,
                                "marks_count": len(current_marks),
                                "marks": marks_data,
                                "description": marks_description
                            })
                            print(f"   🦉 Annotated screenshot with {len(current_marks)} marks sent")
                    else:
                        print(f"   ✗ No screenshot data captured for step {step_count}")
                else:
                    print(f"   ✗ Could not find any active page for screenshot")
                    
            except Exception as e:
                print(f"   ✗ Screenshot capture error: {e}")
                import traceback
                traceback.print_exc()

            # Send WebSocket update
            await notify_session(session_id, "action_log", {
                "sessionId": session_id,
                "step": step_count,
                "maxSteps": max_steps,
                "data": step_data
            })
            
            await notify_session(session_id, "session_update", {
                "sessionId": session_id,
                "progress": f"Step {step_count}/{max_steps}: {step_data.get('goal', 'Processing...')}",
                "step": step_count,
                "maxSteps": max_steps
            })

        # Run agent with configured max_steps
        history = await agent.run(max_steps=max_steps, on_step_end=on_step_end)
        
        # Format final results for Results Tab
        final_results = {
            "task": task,
            "total_steps": step_count,
            "steps": all_results,
            "extracted_data": [],
            "success": True
        }
        
        # Extract any content from history
        for h in history.history:
            if hasattr(h, 'extracted_content') and h.extracted_content:
                final_results["extracted_data"].append(h.extracted_content)
        
        # Update DB
        await db.update_session_status(session_id, "completed", {
            "completed_at": "now()",
            "actions_count": step_count,
            "result": json.dumps(final_results, default=str)
        })

        # PERFORMANCE CORE: Cache successful plan - EXTRACT AND CONVERT TO CDP ACTIONS
        try:
            plan_actions = []
            
            # Iterate through all steps and extract low-level actions if possible
            for res in all_results:
                
                # Check for action data
                action_data = res.get("action")
                
                # Check for result data (often contains the click coordinates from click_by_mark)
                result_data = res.get("result")
                
                if action_data:
                    # Normalize action_data to list
                    actions_list = action_data if isinstance(action_data, list) else [action_data]
                    
                    for act in actions_list:
                        if not isinstance(act, dict): continue
                        
                        action_type = list(act.keys())[0] if act else None
                        
                        # 1. Handle Click by Mark (Owl Vision) -> Convert to Coordinate Click
                        if action_type == "click_by_mark" or (isinstance(act, dict) and 'click_by_mark' in act):
                            # Try to find the coordinates in the *result* of this step
                            if isinstance(result_data, dict) and result_data.get("coordinates"):
                                coords = result_data["coordinates"]
                                plan_actions.append({
                                    "type": "click",
                                    "x": coords[0],
                                    "y": coords[1],
                                    "wait_ms": 1000 # Default wait after click
                                })
                            # Fallback: check if we have mark data in the action itself (unlikely but possible)
                            
                        # 2. Handle Type Text / Fill
                        elif action_type in ["type_text", "fill"]:
                            args = act.get(action_type, {})
                            text = args.get("text") or args.get("value")
                            if text:
                                plan_actions.append({
                                    "type": "type_text",
                                    "text": text,
                                    "wait_ms": 500
                                })
                        
                        # 3. Handle Key Press
                        elif action_type == "press_key":
                            args = act.get(action_type, {})
                            key = args.get("key")
                            if key:
                                plan_actions.append({
                                    "type": "key_press",
                                    "key": key,
                                    "wait_ms": 300
                                })
                                
                        # 4. Handle Go To URL (Initial navigation only)
                        elif action_type == "go_to_url":
                             args = act.get(action_type, {})
                             url = args.get("url")
                             # We don't replay navigation usually as the cache key is (Task+URL)
                             # But we might double check if we are on the right page?
                             pass
            
            if len(plan_actions) > 0:
                print(f"🚀 Caching {len(plan_actions)} low-level actions for replay")
                await action_cache.cache_plan(task, current_url, plan_actions, True)
            else:
                print(f"ℹ No replayable actions found to cache")
                
        except Exception as cache_err:
            print(f"⚠ Failed to cache plan: {cache_err}")
        
        # Notify complete with formatted results
        await notify_session(session_id, "session_complete", {
            "sessionId": session_id,
            "results": final_results
        })
        
    except Exception as e:
        error_msg = str(e)
        print(f"Agent Error: {traceback.format_exc()}")
        
        await db.update_session_status(session_id, "failed", {
            "error_message": error_msg,
            "completed_at": "now()"
        })
        
        await notify_session(session_id, "error", {
            "sessionId": session_id,
            "error": error_msg
        })
    finally:
        # Trigger Session Summary (Async)
        try:
            from app.services.summary_service import summary_service
            # Run in background to not block cleanup
            asyncio.create_task(summary_service.generate_and_save_summary(session_id, task))
            print(f"   📝 Summary generation triggered for session {session_id}")
        except Exception as sum_err:
            print(f"   ⚠ Failed to trigger summary: {sum_err}")

        # Stop screenshot streaming first
        await stop_streaming(session_id)
        
        # Cleanup running agent and browser references
        if session_id in running_agents:
            del running_agents[session_id]
            print(f"Agent removed from running_agents for session {session_id}")
        
        if session_id in stop_flags:
            del stop_flags[session_id]
        
        # Ensure browser is closed (use running_browsers dict)
        try:
            browser_to_close = running_browsers.pop(session_id, None)
            if browser_to_close:
                await browser_to_close.close()
                print(f"Browser closed for session {session_id}")
            elif 'browser' in dir() and browser:
                await browser.close()
                print(f"Browser (local) closed for session {session_id}")
        except Exception as e:
            print(f"Browser cleanup error: {e}")
            
        # Cleanup CDP Client
        if 'cdp_client' in locals() and cdp_client:
            try:
                await cdp_client.disconnect()
                print("CDP Client disconnected")
            except: pass


async def stop_agent_task(session_id: str):
    """
    Stop a running agent task, close browser, and cleanup resources.
    """
    print(f"🛑 Stop requested for session {session_id}")
    
    # Set stop flag for the agent
    stop_flags[session_id] = True
    
    # Stop screenshot streaming first
    await stop_streaming(session_id)
    
    # Cancel the main agent task if it exists
    if session_id in active_tasks:
        task = active_tasks[session_id]
        task.cancel()
        print(f"🛑 Main agent task cancelled for session {session_id}")
        try:
            await task
        except asyncio.CancelledError:
            pass
        active_tasks.pop(session_id, None)

    # Forcefully close the browser and all contexts
    browser = running_browsers.get(session_id)
    if browser:
        try:
            await browser.close()
            print(f"Browser closed for session {session_id}")
        except Exception as e:
            print(f"Error closing browser: {e}")
            
    # Clean up other resources
    if session_id in running_agents:
        del running_agents[session_id]
        
    if session_id in stop_flags:
        del stop_flags[session_id]

def start_agent_task(session_id: str, task: str, token: str = None, agent_config: dict = None):
    """
    Start the agent task as a managed asyncio task.
    """
    async def task_wrapper():
        try:
            await run_agent_task(session_id, task, token, agent_config)
        except asyncio.CancelledError:
            print(f"Task wrapper for {session_id} cancelled")
        except Exception as e:
            print(f"Task wrapper for {session_id} failed: {e}")
        finally:
            active_tasks.pop(session_id, None)
            
    # Create and store the task
    loop = asyncio.get_event_loop()
    agent_task = loop.create_task(task_wrapper())
    active_tasks[session_id] = agent_task
    return agent_task




