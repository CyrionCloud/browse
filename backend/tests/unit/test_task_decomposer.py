"""
Unit tests for Task Decomposer service
"""

import pytest
from app.services.task_decomposer import TaskDecomposer, Subtask, TaskDecomposition


class TestComplexityDetection:
    """Test task complexity detection"""
    
    def setup_method(self):
        self.decomposer = TaskDecomposer()
    
    def test_simple_task_no_decomposition(self):
        """Simple tasks should not be decomposed"""
        simple_tasks = [
            "Go to google.com",
            "Click the login button",
            "Take a screenshot",
            "Navigate to homepage"
        ]
        
        for task in simple_tasks:
            assert not self.decomposer.should_decompose(task), f"Task '{task}' should be simple"
    
    def test_complex_task_with_multiple_actions(self):
        """Tasks with multiple actions should be decomposed"""
        complex_tasks = [
            "Go to LinkedIn and extract profiles",
            "Search for products and compare prices",
            "Extract data and create a spreadsheet",
            "Navigate to page and then click submit"
        ]
        
        for task in complex_tasks:
            assert self.decomposer.should_decompose(task), f"Task '{task}' should be complex"
    
    def test_complex_task_with_iteration(self):
        """Tasks with iteration should be decomposed"""
        iteration_tasks = [
            "Extract all profiles from the page",
            "Find each product and get its price",
            "Click on every link",
            "Process multiple items"
        ]
        
        for task in iteration_tasks:
            assert self.decomposer.should_decompose(task), f"Task '{task}' should be complex"
    
    def test_complex_task_with_workflow(self):
        """Tasks with data workflows should be decomposed"""
        workflow_tasks = [
            "Extract data and save to CSV",
            "Find products and analyze pricing",
            "Collect emails and organize them"
        ]
        
        for task in workflow_tasks:
            assert self.decomposer.should_decompose(task), f"Task '{task}' should be complex"


class TestTaskDecomposition:
    """Test task decomposition logic"""
    
    def test_subtask_creation(self):
        """Test Subtask object creation"""
        subtask = Subtask(
            index=0,
            description="Test step",
            expected_outcome="Success",
            success_criteria="Data collected",
            dependencies=[],
            estimated_duration_seconds=30
        )
        
        assert subtask.index == 0
        assert subtask.description == "Test step"
        assert subtask.estimated_duration_seconds == 30
        assert subtask.dependencies == []
    
    def test_subtask_to_dict(self):
        """Test Subtask serialization"""
        subtask = Subtask(
            index=1,
            description="Test",
            expected_outcome="Done",
            success_criteria="Valid",
            dependencies=[0],
            estimated_duration_seconds=60
        )
        
        data = subtask.to_dict()
        assert data["index"] == 1
        assert data["description"] == "Test"
        assert data["dependencies"] == [0]
    
    def test_decomposition_creation(self):
        """Test TaskDecomposition object creation"""
        subtasks = [
            Subtask(0, "Step 1", "Done 1", "Valid 1", [], 10),
            Subtask(1, "Step 2", "Done 2", "Valid 2", [0], 20)
        ]
        
        decomp = TaskDecomposition(subtasks, 30)
        
        assert len(decomp.subtasks) == 2
        assert decomp.total_estimated_duration == 30
    
    def test_get_next_subtask_no_dependencies(self):
        """Test getting next subtask with no dependencies"""
        decomposer = TaskDecomposer()
        
        subtasks = [
            Subtask(0, "Step 1", "Done", "Valid", [], 10),
            Subtask(1, "Step 2", "Done", "Valid", [], 20)
        ]
        decomp = TaskDecomposition(subtasks, 30)
        
        # First subtask should be index 0
        next_subtask = decomposer.get_next_subtask(decomp, [])
        assert next_subtask.index == 0
        
        # After completing 0, next should be 1
        next_subtask = decomposer.get_next_subtask(decomp, [0])
        assert next_subtask.index == 1
    
    def test_get_next_subtask_with_dependencies(self):
        """Test dependency resolution"""
        decomposer = TaskDecomposer()
        
        subtasks = [
            Subtask(0, "Step 1", "Done", "Valid", [], 10),
            Subtask(1, "Step 2", "Done", "Valid", [0], 20),
            Subtask(2, "Step 3", "Done", "Valid", [0, 1], 30)
        ]
        decomp = TaskDecomposition(subtasks, 60)
        
        # Can't get step 1 or 2 until 0 is done
        next_subtask = decomposer.get_next_subtask(decomp, [])
        assert next_subtask.index == 0
        
        # Can get step 1 after 0 is done
        next_subtask = decomposer.get_next_subtask(decomp, [0])
        assert next_subtask.index == 1
        
        # Can't get step 2 until both 0 and 1 are done
        next_subtask = decomposer.get_next_subtask(decomp, [0, 1])
        assert next_subtask.index == 2
    
    def test_get_next_subtask_all_complete(self):
        """Test when all subtasks are complete"""
        decomposer = TaskDecomposer()
        
        subtasks = [
            Subtask(0, "Step 1", "Done", "Valid", [], 10),
            Subtask(1, "Step 2", "Done", "Valid", [0], 20)
        ]
        decomp = TaskDecomposition(subtasks, 30)
        
        # All complete, should return None
        next_subtask = decomposer.get_next_subtask(decomp, [0, 1])
        assert next_subtask is None


class TestValidation:
    """Test subtask validation"""
    
    def setup_method(self):
        self.decomposer = TaskDecomposer()
    
    @pytest.mark.asyncio
    async def test_validate_successful_subtask(self):
        """Test validation of successful subtask"""
        subtask = Subtask(0, "Test", "Success", "Valid", [], 10)
        result = {"success": True, "data": "test"}
        
        is_valid = await self.decomposer.validate_subtask(subtask, result)
        assert is_valid is True
    
    @pytest.mark.asyncio
    async def test_validate_failed_subtask(self):
        """Test validation of failed subtask"""
        subtask = Subtask(0, "Test", "Success", "Valid", [], 10)
        result = {"success": False, "error": "Failed"}
        
        is_valid = await self.decomposer.validate_subtask(subtask, result)
        assert is_valid is False
    
    @pytest.mark.asyncio
    async def test_validate_subtask_with_error(self):
        """Test validation with error present"""
        subtask = Subtask(0, "Test", "Success", "Valid", [], 10)
        result = {"error": "Something went wrong"}
        
        is_valid = await self.decomposer.validate_subtask(subtask, result)
        assert is_valid is False
