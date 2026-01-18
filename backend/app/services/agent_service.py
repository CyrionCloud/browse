import asyncio
import base64
from browser_use import Agent, Browser, BrowserConfig
from langchain_openai import ChatOpenAI
from app.core.config import settings
from app.services.websocket import notify_session
from app.services.database import db
from app.services.self_healing_service import SelfHealingService
import traceback
import json

# Store running agents for intervention capability
running_agents: dict[str, Agent] = {}
# Store running browsers so they can be closed on cancel
running_browsers: dict[str, Browser] = {}
# Store stop flags to signal agents to stop
stop_flags: dict[str, bool] = {}

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
        
        # Initialize Browser in HEADFUL mode for reliable screenshots
        # Headless mode causes blank screenshots - headful renders properly
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
        
        # Initialize Agent
        agent = Agent(
            task=task,
            llm=llm,
            browser=browser,
            use_vision=False,
            enable_memory=False
        )
        
        # Store agent and browser for intervention/stop capability
        running_agents[session_id] = agent
        running_browsers[session_id] = browser
        
        step_count = 0
        all_results = []

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
                
                all_results.append(step_data)
                print(f"Step {step_count} data: goal={step_data['goal'][:50] if step_data['goal'] else None}...")
                
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
                screenshot_base64 = None
                page = None
                
                # Find the page - try multiple methods
                if browser and hasattr(browser, 'playwright_browser') and browser.playwright_browser:
                    try:
                        contexts = browser.playwright_browser.contexts
                        if contexts and len(contexts) > 0:
                            context = contexts[0]
                            if context.pages and len(context.pages) > 0:
                                page = context.pages[0]
                                print(f"   ✓ Found page via browser.playwright_browser (URL: {page.url})")
                    except Exception as e:
                        print(f"   ✗ Browser context access failed: {e}")
                
                # Fallback to agent paths
                if not page and agent_instance:
                    if hasattr(agent_instance, 'browser_context') and agent_instance.browser_context:
                        try:
                            if agent_instance.browser_context.pages:
                                page = agent_instance.browser_context.pages[0]
                                print(f"   ✓ Found page via agent.browser_context")
                        except:
                            pass
                
                if page:
                    # Strategy 1: Try immediate screenshot first
                    try:
                        screenshot_bytes = await page.screenshot(timeout=2000)
                        screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                        print(f"   ✓ Screenshot captured immediately ({len(screenshot_bytes)} bytes)")
                    except Exception as immediate_err:
                        print(f"   ⚠ Immediate screenshot failed: {immediate_err}")
                        
                        # Strategy 2: Wait for network idle then capture
                        try:
                            await page.wait_for_load_state('networkidle', timeout=5000)
                            screenshot_bytes = await page.screenshot(timeout=2000)
                            screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                            print(f"   ✓ Screenshot captured after networkidle ({len(screenshot_bytes)} bytes)")
                        except Exception as networkidle_err:
                            print(f"   ⚠ Networkidle screenshot failed: {networkidle_err}")
                            
                            # Strategy 3: Wait for load event then capture  
                            try:
                                await page.wait_for_load_state('load', timeout=5000)
                                await asyncio.sleep(0.5)  # Extra render time
                                screenshot_bytes = await page.screenshot(timeout=2000)
                                screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                                print(f"   ✓ Screenshot captured after load+delay ({len(screenshot_bytes)} bytes)")
                            except Exception as load_err:
                                print(f"   ✗ All screenshot strategies failed: {load_err}")
                    
                    # Send screenshot if we got one
                    if screenshot_base64:
                        await notify_session(session_id, "screenshot", {
                            "sessionId": session_id,
                            "screenshot": screenshot_base64
                        })
                        print(f"   📤 Screenshot sent to frontend for step {step_count}")
                    else:
                        print(f"   ✗ No screenshot data captured for step {step_count}")
                else:
                    print(f"   ✗ Could not find page object for screenshot")
                    
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


async def stop_agent_task(session_id: str):
    """
    Stop a running agent task, close browser, and cleanup resources.
    """
    print(f"Stop requested for session {session_id}")
    
    # Set stop flag for the agent
    stop_flags[session_id] = True
    
    # Try to close the browser
    browser = running_browsers.get(session_id)
    if browser:
        try:
            await browser.close()
            print(f"Browser closed for stopped session {session_id}")
        except Exception as e:
            print(f"Error closing browser for session {session_id}: {e}")
        finally:
            if session_id in running_browsers:
                del running_browsers[session_id]
    
    # Cleanup agent reference
    if session_id in running_agents:
        del running_agents[session_id]
        print(f"Agent removed for stopped session {session_id}")
    
    # Cleanup stop flag
    if session_id in stop_flags:
        del stop_flags[session_id]
    
    # Notify frontend
    await notify_session(session_id, "session_stopped", {
        "sessionId": session_id,
        "message": "Session stopped by user"
    })
