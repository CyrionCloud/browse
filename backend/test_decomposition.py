"""
Test script for Task Decomposition system

Tests the AI-powered task breakdown and decomposition API
"""

import asyncio
from app.services.task_decomposer import TaskDecomposer
from app.services.database import db

async def test_complexity_detection():
    """Test if tasks are correctly identified as complex or simple"""
    decomposer = TaskDecomposer()
    
    print("\n=== Testing Complexity Detection ===")
    
    test_cases = [
        ("Go to google.com and take a screenshot", False),
        ("Extract all LinkedIn profiles and create a spreadsheet", True),
        ("Find all products on Amazon and compare prices", True),
        ("Click the login button", False),
        ("Search for engineers, extract their data, and email me the results", True)
    ]
    
    for task, expected_complex in test_cases:
        is_complex = decomposer.should_decompose(task)
        status = "✅" if is_complex == expected_complex else "❌"
        print(f"{status} '{task[:50]}...' → {'Complex' if is_complex else 'Simple'}")

async def test_task_decomposition():
    """Test AI-powered task breakdown"""
    decomposer = TaskDecomposer()
    
    print("\n=== Testing AI Task Decomposition ===")
    
    task = "Search LinkedIn for software engineers in San Francisco and create a spreadsheet with their profiles"
    print(f"\nTask: {task}\n")
    
    try:
        decomposition = await decomposer.decompose_task(task)
        
        print(f"✅ Generated {len(decomposition.subtasks)} subtasks")
        print(f"📊 Estimated duration: {decomposition.total_estimated_duration}s\n")
        
        for subtask in decomposition.subtasks:
            print(f"Step {subtask.index + 1}: {subtask.description}")
            print(f"  Expected: {subtask.expected_outcome}")
            print(f"  Duration: {subtask.estimated_duration_seconds}s")
            print(f"  Dependencies: {subtask.dependencies}")
            print()
            
    except Exception as e:
        print(f"❌ Decomposition failed: {e}")

async def test_database_integration():
    """Test saving decomposition to database"""
    print("\n=== Testing Database Integration ===")
    
    client = db.get_client()
    
    # Create a test decomposition
    decomp_data = {
        "user_id": "00000000-0000-0000-0000-000000000000",
        "original_task": "Test task for decomposition",
        "subtasks": [
            {
                "index": 0,
                "description": "Test step 1",
                "expected_outcome": "Step 1 complete",
                "success_criteria": "Data collected",
                "dependencies": [],
                "estimated_duration_seconds": 10
            }
        ],
        "total_estimated_duration": 10,
        "current_subtask_index": 0,
        "completed_subtasks": [],
        "failed_subtasks": []
    }
    
    try:
        # Insert decomposition
        res = client.table("task_decompositions").insert(decomp_data).execute()
        decomp_id = res.data[0]["id"]
        print(f"✅ Created decomposition: {decomp_id}")
        
        # Insert subtask execution
        exec_data = {
            "decomposition_id": decomp_id,
            "subtask_index": 0,
            "subtask_description": "Test step 1",
            "expected_outcome": "Step 1 complete",
            "success_criteria": "Data collected",
            "status": "completed"
        }
        
        client.table("subtask_executions").insert(exec_data).execute()
        print("✅ Created subtask execution")
        
        # Cleanup
        client.table("task_decompositions").delete().eq("id", decomp_id).execute()
        print("✅ Cleanup successful")
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")

async def main():
    print("🧪 Task Decomposition System Tests\n")
    print("=" * 50)
    
    await test_complexity_detection()
    await test_task_decomposition()
    await test_database_integration()
    
    print("\n" + "=" * 50)
    print("✅ All tests complete!")

if __name__ == "__main__":
    asyncio.run(main())
