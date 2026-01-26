# OpenManus Architecture & Integration Guide

This document provides a comprehensive analysis of the [OpenManus](https://github.com/FoundationAgents/OpenManus) project and outlines how we can leverage its patterns to enhance our current application.

## 1. Architecture Overview

OpenManus is built on a modular architecture separating **Agents**, **Tools**, and **Flows**.

-   **Agents** (`app/agent/`): Autonomous entities that use tools. The core is `ToolCallAgent`, an enhanced ReAct agent.
-   **Flows** (`app/flow/`): Orchestration logic that manages complex, multi-step tasks (e.g., `PlanningFlow`).
-   **Tools** (`app/tool/`): atomic capabilities (Search, Browser Use, File Edit, etc.).
-   **Prompting**: Dynamic prompt injection based on context (e.g., Browser state).

## 2. Key Capabilities & Patterns

### A. Robust Web Search (`app/tool/web_search.py`)
OpenManus implements a highly robust search tool that goes beyond simple API calls.

**Key Features:**
1.  **Multi-Engine Fallback**: It attempts to search using Google, then falls back to Baidu, DuckDuckGo, and Bing if the primary fails. `_try_all_engines` pattern.
2.  **Content Fetching**: It includes a `WebContentFetcher` that automatically visits the result URLs, strips HTML (scripts/styles), and returns the clean text. This provides the LLM with *answers*, not just links.
3.  **Structured Output**: Results are consistently formatted with Position, Title, URL, and Content Preview.

**Code Pattern:**
```python
# Fallback Logic
for engine_name in engine_order:
    try:
        results = await engine.perform_search(...)
        if results: return results
    except Exception:
        continue
```

### B. Stateful Planning Flow (`app/flow/planning.py`)
Instead of a simple "Planner Agent" that outputs text, OpenManus uses a stateful **Planning Flow**.

**Key Features:**
1.  **Persistent Plan Objects**: Plans are Python dictionaries stored in memory, capable of being updated, queried, and modified.
2.  **Step Definition**: `steps`, `step_statuses` (`not_started`, `in_progress`, `completed`), and `step_notes`.
3.  **Execution Loop**:
    -   **Identify**: Find first non-completed step.
    -   **Contextualize**: Create a prompt containing the *Current Plan Status* and *Current Step Task*.
    -   **Execute**: Delegate the step to an `executor` agent (e.g., Manus).
    -   **Update**: Mark step as complete.
    -   **Repeat**: Loop until all steps are done.

**Prompt Pattern:**
```text
CURRENT PLAN STATUS:
[✓] Step 1: Analyze Request
[→] Step 2: Execute Task
[ ] Step 3: Verify

YOUR CURRENT TASK:
You are now working on step 2: "Execute Task"
```

### C. Context-Aware Agents (`app/agent/manus.py`)
The `Manus` agent injects context dynamically before making decisions.

**Key Features:**
1.  **Browser Context Helper**: Before `think()`ing, it checks if the browser tool was recently used.
2.  **Dynamic Prompting**: If browser is active, it injects the current URL, Title, Tab Count, and a **Base64 Screenshot** into the system prompt.
3.  **Tool Call Abstraction**: `ToolCallAgent` handles the complexities of parsing LLM tool calls, executing them, and feeding the output back to history.

## 3. Integration Strategy

We can leverage these patterns to enhance our app without rewriting everything.

### Phase 1: Enhanced Search Tool
**Goal**: Improve our Agent's ability to answer complex questions.
**Action**: Port `WebSearch` and `WebContentFetcher`.
-   Implement the Multi-Engine fallback (Google -> DDG).
-   Add the `fetch_content=True` capability to read top results automatically.

### Phase 2: Planning Mode
**Goal**: Handle complex, multi-step requests reliably.
**Action**: Implement `PlanningFlow`.
-   Create a `Plan` data structure.
-   Implement the "Plan -> Execute Step -> Update Plan" loop.
-   Use a dedicated `PlanningTool` for the agent to self-manage its plan.

### Phase 3: Browser Context Injection
**Goal**: Make the agent "see" the browser state.
**Action**: Adopt `BrowserContextHelper`.
-   When the agent is in "Browser Mode", automatically append the current DOM snippet or Screenshot to the user message history before querying the LLM.

## 4. Example: Enhanced Search Implementation

Here is how we can implement the OpenManus search pattern:

```python
class EnhancedSearchTool(BaseTool):
    async def execute(self, query: str):
        # 1. Search
        results = await self.search_engine.search(query)
        
        # 2. Fetch Content (The "OpenManus" secret sauce)
        tasks = [self.fetch_url_text(r.url) for r in results[:3]]
        contents = await asyncio.gather(*tasks)
        
        # 3. Format
        output = f"Results for '{query}':\n"
        for i, (res, content) in enumerate(zip(results, contents)):
            output += f"{i+1}. {res.title} ({res.url})\n"
            output += f"   Content: {content[:500]}...\n\n"
        return output
```

## 5. Summary

OpenManus succeeds because it doesn't treat LLMs as magic. It provides them with:
1.  **Structure** (Plans).
2.  **visual/Textual Context** (Browser State, Web Content).
3.  **Robustness** (Fallbacks, Loops).

Adopting these patterns will significantly increase our agent's reliability.
