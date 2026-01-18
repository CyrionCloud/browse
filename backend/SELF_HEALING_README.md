# Self-Healing Agent System

**Status:** ✅ Implemented (Phase 1)  
**Version:** 1.0.0  
**Date:** 2026-01-18

---

## Overview

The Self-Healing Agent System enables our browser automation agents to **detect errors**, **classify them**, and **automatically apply recovery strategies** based on historical success rates.

### Key Features

- ✅ **Error Pattern Detection** - Regex-based matching of error messages
- ✅ **Recovery Strategy Selection** - Prioritized strategies with success tracking
- ✅ **Learning from History** - Database-backed success rate calculation
- ✅ **Automatic Retry Logic** - Progressive escalation through strategies
- ✅ **Analytics** - View for tracking recovery success rates

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Execution Loop                     │
│                                                              │
│  Try Action → Error Occurs                                  │
│       ↓                                                      │
│  ┌────────────────────────────────────────────────────┐     │
│  │         SelfHealingService.detect_error_type()     │     │
│  └────────────────────────────────────────────────────┘     │
│       ↓                                                      │
│  ┌────────────────────────────────────────────────────┐     │
│  │    SelfHealingService.get_recovery_strategy()      │     │
│  └────────────────────────────────────────────────────┘     │
│       ↓                                                      │
│  Apply Strategy → Success?                                  │
│       ├─ Yes → Log success → Continue                       │
│       └─ No  → Try next strategy → Repeat                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │    SelfHealingService.log_recovery_attempt()        │     │
│  └────────────────────────────────────────────────────┘     │
│       ↓                                                      │
│  Database triggers update success rates automatically       │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

#### `error_patterns` Table
Stores known error patterns and recovery strategies.

```sql
CREATE TABLE error_patterns (
    id UUID PRIMARY KEY,
    pattern_name TEXT UNIQUE,
    error_signature TEXT,  -- Regex pattern
    description TEXT,
    recovery_strategies JSONB,  -- Array of strategies
    success_rate DECIMAL(5,2),
    total_attempts INTEGER,
    successful_attempts INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### `error_recovery_history` Table
Tracks each error occurrence and recovery attempt.

```sql
CREATE TABLE error_recovery_history (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES browser_sessions(id),
    error_pattern_id UUID REFERENCES error_patterns(id),
    error_type TEXT,
    error_message TEXT,
    strategy_used TEXT,
    success BOOLEAN,
    retry_count INTEGER,
    context JSONB,
    created_at TIMESTAMPTZ
);
```

#### `recovery_success_rates` View
Real-time aggregation of success rates.

```sql
CREATE VIEW recovery_success_rates AS
SELECT 
    error_type,
    strategy_used,
    COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*) as success_rate,
    COUNT(*) as total_attempts
FROM error_recovery_history
GROUP BY error_type, strategy_used;
```

---

## Usage

### Basic Integration

```python
from app.services.self_healing_service import SelfHealingService

# In your agent execution loop
try:
    # Attempt action
    await page.click(selector)
except Exception as error:
    # Detect error type
    error_type, pattern = await SelfHealingService.detect_error_type(
        error, 
        context={"url": page.url, "action": "click"}
    )
    
    # Get recovery strategy
    strategy = await SelfHealingService.get_recovery_strategy(
        error_type, 
        retry_count=0,
        session_id=session_id
    )
    
    if strategy:
        # Apply strategy
        if strategy['name'] == 'wait_longer':
            await asyncio.sleep(strategy.get('timeout_ms', 5000) / 1000)
            await page.click(selector)  # Retry
        
        # Log the attempt
        await SelfHealingService.log_recovery_attempt(
            session_id=session_id,
            error_type=error_type,
            error_message=str(error),
            strategy_used=strategy['name'],
            success=True,  # Or False if it failed
            retry_count=0
        )
```

### Complete Error Handling Example

```python
async def execute_action_with_healing(session_id, action, max_retries=3):
    """Execute action with automatic error recovery"""
    
    for retry in range(max_retries):
        try:
            # Execute the action
            result = await perform_action(action)
            return result
            
        except Exception as error:
            # Detect error type
            error_type, pattern = await SelfHealingService.detect_error_type(error)
            
            # Get recovery strategy
            strategy = await SelfHealingService.get_recovery_strategy(
                error_type,
                retry_count=retry,
                session_id=session_id
            )
            
            if not strategy:
                # No more strategies available
                await SelfHealingService.log_recovery_attempt(
                    session_id, error_type, str(error),
                    None, False, retry
                )
                raise  # Re-raise original error
            
            # Apply the recovery strategy
            success = await apply_strategy(strategy, action)
            
            # Log the attempt
            await SelfHealingService.log_recovery_attempt(
                session_id, error_type, str(error),
                strategy['name'], success, retry
            )
            
            if success:
                return await perform_action(action)  # Retry after recovery
            
            # If not successful, loop continues to next retry
    
    raise Exception(f"All recovery strategies exhausted after {max_retries} attempts")
```

---

## Default Error Patterns

### 1. `element_not_found`
**Signature:** `ElementNotFoundError|NoSuchElementException|Element .* not found`

**Strategies:**
1. `wait_longer` (5s timeout)
2. `scroll_into_view`
3. `use_vision_fallback` (Owl ML detection)

**Expected Success Rate:** 85%

---

### 2. `timeout`
**Signature:** `TimeoutError|Timeout.*exceeded`

**Strategies:**
1. `retry_with_longer_timeout` (2x multiplier)
2. `check_network_idle`
3. `reload_page`

**Expected Success Rate:** 70%

---

### 3. `security_challenge`
**Signature:** `Cloudflare|CAPTCHA|reCAPTCHA|Security check`

**Strategies:**
1. `wait_for_manual_intervention` (60s)
2. `use_different_approach`

**Expected Success Rate:** 30%

---

### 4. `page_load_failure`
**Signature:** `ERR_CONNECTION_REFUSED|ERR_NAME_NOT_RESOLVED`

**Strategies:**
1. `retry_navigation` (max 3 retries)
2. `check_dns`
3. `use_cached_version`

**Expected Success Rate:** 60%

---

### 5. `action_execution_failure`
**Signature:** `Click failed|Type failed|Action .* failed`

**Strategies:**
1. `wait_and_retry` (1s delay)
2. `use_alternative_selector`
3. `refresh_dom_state`

**Expected Success Rate:** 75%

---

### 6. `network_error`
**Signature:** `ERR_INTERNET_DISCONNECTED|Network error`

**Strategies:**
1. `wait_for_reconnection` (30s)
2. `retry_request` (exponential backoff)

**Expected Success Rate:** 50%

---

## Analytics & Monitoring

### View Success Rates

```sql
SELECT * FROM recovery_success_rates
ORDER BY success_rate DESC, total_attempts DESC;
```

**Example Output:**
```
error_type           | strategy_used       | success_rate | total_attempts
---------------------|---------------------|--------------|---------------
element_not_found    | wait_longer         | 92.50        | 120
timeout              | retry_with_longer   | 78.30        | 60
action_execution     | wait_and_retry      | 71.40        | 87
```

### Query Error History

```sql
SELECT 
    error_type,
    COUNT(*) as occurrences,
    COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*) as recovery_rate
FROM error_recovery_history
WHERE session_id = 'your-session-id'
GROUP BY error_type;
```

---

## Deployment

### Step 1: Run SQL Migration

```bash
# Connect to Supabase and run:
psql $DATABASE_URL < backend/migrations/error_patterns.sql
```

This creates:
- `error_patterns` table
- `error_recovery_history` table
- `recovery_success_rates` view
- Automatic triggers for updating success rates
- Default error patterns (6 patterns)

### Step 2: Verify Tables

```sql
-- Check error patterns
SELECT pattern_name, success_rate FROM error_patterns;

-- Should show 6 default patterns
```

### Step 3: Test Integration

```python
# In Python shell
from app.services.self_healing_service import SelfHealingService
import asyncio

# Initialize
asyncio.run(SelfHealingService.initialize())

# Should print: "✓ Loaded 6 error patterns"
```

---

## Performance

### Database Indexes
```sql
-- Optimized for common queries
CREATE INDEX idx_error_recovery_session ON error_recovery_history(session_id);
CREATE INDEX idx_error_recovery_pattern ON error_recovery_history(error_pattern_id);
CREATE INDEX idx_error_recovery_created ON error_recovery_history(created_at DESC);
```

### Automatic Triggers
Success rates update automatically via database trigger - **no application code needed**!

```sql
-- Trigger fires after every insert to error_recovery_history
CREATE TRIGGER update_pattern_stats_trigger
AFTER INSERT ON error_recovery_history
FOR EACH ROW
EXECUTE FUNCTION update_error_pattern_stats();
```

---

## Future Enhancements

### Phase 2 (Weeks 4-6)
- [ ] **Machine Learning Model** - Predict best strategy before trying
- [ ] **Context-Aware Selection** - Consider page type, user agent, etc.
- [ ] **Dynamic Strategy Creation** - AI generates new recovery strategies
- [ ] **Success Prediction** - Estimate recovery likelihood before attempting

### Phase 3 (Weeks 7-9)
- [ ] **Cross-Session Learning** - Learn from all users (anonymized)
- [ ] **Real-Time Strategy Tuning** - Adjust parameters based on results
- [ ] **Multi-Strategy Chains** - Combine strategies for complex errors
- [ ] **A/B Testing** - Test new strategies in production safely

---

## Monitoring Checklist

- [ ] Success rates > 80% for `element_not_found`
- [ ] Success rates > 70% for `timeout`
- [ ] Recovery attempts logged for all errors
- [ ] Database triggers updating stats correctly
- [ ] View `recovery_success_rates` returning expected data

---

## License

Internal use only - Part of AutoBrowse SaaS platform.

**Maintained by:** AutoBrowse Engineering Team  
**Last Updated:** 2026-01-18
