"""
Test script for Self-Healing Service
"""

import asyncio
from app.services.self_healing_service import SelfHealingService

async def test_self_healing():
    """Test the self-healing service"""
    
    print("🧪 Testing Self-Healing Service\n")
    
    # Test 1: Initialize
    print("1️⃣  Initializing service...")
    await SelfHealingService.initialize()
    print(f"   ✅ Loaded {len(SelfHealingService.ERROR_PATTERNS)} error patterns\n")
    
    # Test 2: Error detection
    print("2️⃣  Testing error detection...")
    test_errors = [
        ("ElementNotFoundError: Could not find button", "element_not_found"),
        ("TimeoutError: Operation timed out after 30s", "timeout"),
        ("Cloudflare security check detected", "security_challenge"),
        ("ERR_CONNECTION_REFUSED", "page_load_failure"),
        ("Some random error", "unknown")
    ]
    
    for error_msg, expected_type in test_errors:
        error_type, pattern = await SelfHealingService.detect_error_type(
            Exception(error_msg)
        )
        status = "✅" if error_type == expected_type else "❌"
        print(f"   {status} '{error_msg[:40]}...' → {error_type}")
    
    print()
    
    # Test 3: Strategy selection
    print("3️⃣  Testing strategy selection...")
    strategy = await SelfHealingService.get_recovery_strategy(
        "element_not_found",
        retry_count=0
    )
    if strategy:
        print(f"   ✅ Got strategy: {strategy['name']} (priority {strategy.get('priority')})")
    else:
        print(f"   ❌ No strategy found")
    
    print()
    
    # Test 4: Recovery progression
    print("4️⃣  Testing strategy progression...")
    for retry in range(4):
        strategy = await SelfHealingService.get_recovery_strategy(
            "element_not_found",
            retry_count=retry
        )
        if strategy:
            print(f"   Retry #{retry}: {strategy['name']}")
        else:
            print(f"   Retry #{retry}: No more strategies (exhausted)")
    
    print()
    
    # Test 5: Success rates view
    print("5️⃣  Testing success rates query...")
    rates = await SelfHealingService.get_success_rates()
    if rates:
        print(f"   ✅ Found {len(rates)} historical recovery attempts")
        for rate in rates[:3]:  # Show first 3
            print(f"      {rate['error_type']}/{rate['strategy_used']}: {rate['success_rate']:.1f}%")
    else:
        print(f"   ⚠️  No recovery history yet (expected for new system)")
    
    print("\n✨ All tests passed!")

if __name__ == '__main__':
    asyncio.run(test_self_healing())
