#!/bin/bash
# Manual test for Python bridge with venv

echo "=== Manual Bridge Test ==="
echo ""

# Start bridge in background
./venv/bin/python3 bridge.py > /tmp/bridge_out.log 2> /tmp/bridge_err.log &
BRIDGE_PID=$!
echo "✅ Bridge started with PID: $BRIDGE_PID"

# Wait for initialization
sleep 2

# Check if process is running
if ps -p $BRIDGE_PID > /dev/null 2>&1; then
    echo "✅ Bridge process is running"
    
    # Send a test message
    TEST_MSG='{"id":"test-001","type":"browser_use","method":"navigate","params":{"url":"https://example.com"}}'
    echo "$TEST_MSG" | nc localhost 4000 2>&1 > /dev/null || echo "⚠️  Could not send message to localhost:4000 (not running)"
    
    echo ""
    echo "=== Bridge Errors (last 20 lines) ==="
    tail -20 /tmp/bridge_err.log
    
    echo ""
    echo "=== Bridge Output (last 10 lines) ==="
    tail -10 /tmp/bridge_out.log
    
    # Cleanup
    kill $BRIDGE_PID 2>/dev/null
    wait $BRIDGE_PID 2>/dev/null
    echo ""
    echo "✅ Bridge test complete"
else
    echo "❌ Bridge process exited"
    echo "=== Errors ==="
    cat /tmp/bridge_err.log
fi
