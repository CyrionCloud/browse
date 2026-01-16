#!/bin/bash
# Test AI/Chat Integration

BASE_URL="http://localhost:4000"

echo "=== AI/Chat Integration Tests ==="
echo ""

results=()

log_test() {
    name=$1
    passed=$2
    message=$3

    if [ "$passed" = "true" ]; then
        status="✅ PASS"
        results+=("$name:true")
    else
        status="❌ FAIL"
        results+=("$name:false")
    fi

    echo "$status: $name"
    if [ -n "$message" ]; then
        echo "    $message"
    fi
}

# Test 1: Send chat message (no auth - expect 401)
echo "Test 1: Send Chat Message (no auth - expect 401)"
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"message": "Hello AI", "sessionId": "test-123"}' \
    "$BASE_URL/api/chat")

http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
    log_test "Send chat auth check" true "Correctly returns 401 without auth"
else
    log_test "Send chat auth check" false "Expected 401, got $http_code"
fi

# Test 2: Get chat messages (no auth - expect 401)
echo ""
echo "Test 2: Get Chat Messages (no auth - expect 401)"
response=$(curl -s -w "\n%{http_code}" \
    "$BASE_URL/api/sessions/test-123/messages")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
    log_test "Get messages auth check" true "Correctly returns 401 without auth"
else
    log_test "Get messages auth check" false "Expected 401, got $http_code"
fi

# Test 3: Get skills (no auth - may work)
echo ""
echo "Test 3: Get Skills (no auth)"
response=$(curl -s -w "\n%{http_code}" \
    "$BASE_URL/api/skills")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "200" ]; then
    skills_count=$(echo "$response" | jq '.data | length' 2>/dev/null || echo "0")
    log_test "Get skills endpoint" true "HTTP 200, $skills_count skills"
else
    log_test "Get skills endpoint" false "HTTP $http_code"
fi

# Test 4: Get user skills (no auth - expect 401)
echo ""
echo "Test 4: Get User Skills (no auth - expect 401)"
response=$(curl -s -w "\n%{http_code}" \
    "$BASE_URL/api/users/test-user/skills")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
    log_test "Get user skills auth check" true "Correctly returns 401 without auth"
else
    log_test "Get user skills auth check" false "Expected 401, got $http_code"
fi

# Test 5: Toggle skill (no auth - expect 401)
echo ""
echo "Test 5: Toggle Skill (no auth - expect 401)"
response=$(curl -s -w "\n%{http_code}" -X PUT \
    -H "Content-Type: application/json" \
    -d '{"enabled": true}' \
    "$BASE_URL/api/skills/test-skill/toggle")
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
    log_test "Toggle skill auth check" true "Correctly returns 401 without auth"
else
    log_test "Toggle skill auth check" false "Expected 401, got $http_code"
fi

# Test 6: Chat endpoint accepts JSON
echo ""
echo "Test 6: Chat endpoint accepts JSON"
response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"message": "", "sessionId": "test"}' \
    "$BASE_URL/api/chat" 2>&1 | head -1)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
    log_test "Chat endpoint JSON handling" true "Accepts JSON, returns 401"
else
    log_test "Chat endpoint JSON handling" false "Expected 401, got $http_code"
fi

# Test 7: Skills endpoint returns valid JSON
echo ""
echo "Test 7: Skills endpoint returns valid JSON"
response=$(curl -s -w "\n%{http_code}" \
    "$BASE_URL/api/skills" 2>&1 | head -1)

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" = "200" ]; then
    is_valid=$(echo "$body" | jq 'type == "object"' 2>/dev/null && echo "true" || echo "false")
    if [ "$is_valid" = "true" ]; then
        log_test "Skills endpoint JSON validation" true "Returns valid JSON object"
    else
        log_test "Skills endpoint JSON validation" false "Invalid JSON"
    fi
else
    log_test "Skills endpoint JSON validation" false "HTTP $http_code"
fi

# Summary
echo ""
echo "=" | head -c 60
echo "Summary"
echo "=" | head -c 60

passed=0
for result in "${results[@]}"; do
    if [[ $result == *":true" ]]; then
        ((passed++))
    fi
done

total=${#results[@]}
echo "Passed: $passed/$total ($((passed * 100 / total))%)"

exit 0
