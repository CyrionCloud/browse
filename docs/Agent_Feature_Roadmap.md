# Agent Feature Roadmap: OpenManus + HyperAgent

This document consolidates architectural insights from **OpenManus** (Logic/Planning) and **HyperAgent** (Speed/Performance) to define the next generation of our Agent capabilities.

## 🎯 Executive Summary

We will combine the **Stateful Planning** of OpenManus with the **Raw Performance** of HyperAgent.

| Feature | Source | Benefit | Implementation Path |
| :--- | :--- | :--- | :--- |
| **Multi-Engine Search** | OpenManus | Higher accuracy, fallback redundancy | `tools/search.py` |
| **Stateful Planning** | OpenManus | Solves complex, multi-step goals | `agent/flow/planning.py` |
| **CDP Actions** | HyperAgent | **10x Faster** interactions (~50ms vs 500ms) | `cdp/interactions.ts` |
| **A11y Tree Context** | HyperAgent | **90% Less Tokens** than HTML | `context/a11y_provider.py` |
| **Action Caching** | HyperAgent | Instant replay for repeated tasks | `agent/cache/action_cache.py` |

---

## 🧠 Part 1: Intelligence (The Brain) - Adapted from OpenManus

### 1. Robust Web Search & Content Fetching
Instead of relying on a single search API or just links, we will implement a "Search & Read" pattern.
*   **Pattern**: `Search(Query) -> List[Results] -> Fetch(Url) -> Summarize`
*   **Hyper-Optimization**: Fetch content in parallel using `asyncio.gather` (OpenManus does this).
*   **Result**: The LLM gets *answers*, not just *links*.

### 2. The Planning Flow
Move beyond a single "Agent Loop" to a "Flow Architecture".
*   **Structure**:
    ```python
    Plan = {
      "id": "uuid",
      "steps": [
        {"status": "completed", "task": "Search for X"},
        {"status": "in_progress", "task": "Analyze Y"},
        {"status": "pending", "task": "Compile Report"}
      ]
    }
    ```
*   **Benefit**: If the agent fails or hallucinates, the *Plan* remains the source of truth. We can "rewind" to the last valid step.

---

## ⚡ Part 2: Performance (The Body) - Adapted from HyperAgent

### 3. CDP-Native Actions (Critical Speedup)
Move away from Playwright's high-level API (`page.click`) for the "Hot Path" of execution.
Use the **Chrome DevTools Protocol (CDP)** command `Runtime.callFunctionOn` directly.

*   **Why?** Playwright performs dozens of checks (visibility, stability, reachability) which adds latency (500ms+). CDP is instant (~50ms).
*   **HyperAgent Trick**: Use a custom `dispatchCDPAction` registry that maps high-level intents ("fill", "click") to raw JavaScript injection.
    ```typescript
    // Too Slow
    await page.locator('...').click();
    
    // Fast (HyperAgent Style)
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ... });
    ```

### 4. Accessibility Tree (A11y) Context
Stop sending raw HTML to the LLM. It's expensive and noisy.
*   **Strategy**: Query the Chrome Accessibility Tree (`Accessibility.getFullAXTree`).
*   **Benefit**:
    *   **Tokens**: Reduces context size by ~90% (only functional elements remain).
    *   **Speed**: Faster for the LLM to parse.
    *   **Robustness**: A11y trees are stable even heavily styled React apps changing classes.

### 5. Action Caching (The Fast Lane)
Implement a "Task Hash" to replay known successful paths.
*   **Mechanism**: If `Goal="Login to Gmail"` has been solved before, check the `ActionCache`.
*   **Replay**: Execute the cached list of CDP actions (click x, type y) *without* querying the LLM.
*   **Result**: Instant execution for recurrent tasks.

---

## 🚀 Implementation Plan

### Phase 1: Logic Core (OpenManus) ✅
1.  [x] Refactor `SearchTool` to support multi-engine fallback.
2.  [x] Implement `WebContentFetcher` (requests/bs4) for "Reading" pages.
3.  [x] Create `PlanningService` to manage stateful plans (`Plan`, `Step`).

### Phase 2: Performance Core (HyperAgent) ✅
4.  [x] Implement `CDPClient` wrapper around our existing `CDPStreamerService`.
5.  [x] Create `CDPActionDispatcher` for fast clicks/typing.
6.  [x] Implement `A11yProvider` to fetch and serialize the Accessibility Tree.

### Phase 3: Integration ✅
7.  [x] Update Agent Loop to use `A11yTree` for observation (via Tools).
8.  [x] Update Agent Loop to use `CDPActionDispatcher` for execution (via Tools).
9.  [ ] (Optional) Implement `ActionCache` database.

## 📝 Conclusion
By merging **OpenManus's Planning** with **HyperAgent's CDP Optimization**, we will build an agent that is both **smarter** (better reasoning) and **significantly faster** (human-level latency).
