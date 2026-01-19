"""
Task Decomposer Service

Analyzes complex automation tasks and breaks them into logical sub-tasks
using AI-powered analysis. Provides intelligent task breakdown with
dependencies, validation, and progress tracking.
"""

import logging
import re
from typing import List, Dict, Optional, Any
from datetime import datetime
import asyncio
from anthropic import Anthropic

logger = logging.getLogger(__name__)


class Subtask:
    """Represents a single sub-task in a decomposition"""
    
    def __init__(
        self,
        index: int,
        description: str,
        expected_outcome: str,
        success_criteria: str,
        dependencies: List[int],
        estimated_duration_seconds: int
    ):
        self.index = index
        self.description = description
        self.expected_outcome = expected_outcome
        self.success_criteria = success_criteria
        self.dependencies = dependencies
        self.estimated_duration_seconds = estimated_duration_seconds
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "description": self.description,
            "expected_outcome": self.expected_outcome,
            "success_criteria": self.success_criteria,
            "dependencies": self.dependencies,
            "estimated_duration_seconds": self.estimated_duration_seconds
        }


class TaskDecomposition:
    """Complete task decomposition with all sub-tasks"""
    
    def __init__(self, subtasks: List[Subtask], total_estimated_duration: int):
        self.subtasks = subtasks
        self.total_estimated_duration = total_estimated_duration
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "subtasks": [st.to_dict() for st in self.subtasks],
            "total_estimated_duration": self.total_estimated_duration
        }


class TaskDecomposer:
    """
    Intelligent task decomposition service
    
    Uses Claude AI to analyze complex tasks and break them into
    manageable, executable sub-tasks with clear success criteria.
    """
    
    def __init__(self, anthropic_client: Optional[Anthropic] = None):
        self.client = anthropic_client or Anthropic()
        
    def should_decompose(self, task_description: str) -> bool:
        """
        Determine if a task is complex enough to warrant decomposition
        
        Decompose if task contains:
        - Multiple distinct actions ("and", "then", "after")
        - Iteration indicators ("all", "each", "multiple", "every")
        - Multi-step processes ("first...then...finally")
        - Data workflows (collect → process → output)
        """
        task_lower = task_description.lower()
        
        # Check for multiple actions
        multi_action_indicators = [
            r'\band\b.*\band\b',  # Multiple "and"
            r'then',
            r'after that',
            r'next',
            r'followed by',
            r'finally'
        ]
        
        for pattern in multi_action_indicators:
            if re.search(pattern, task_lower):
                return True
        
        # Check for iteration
        iteration_indicators = ['all', 'each', 'every', 'multiple', 'several']
        if any(word in task_lower for word in iteration_indicators):
            return True
        
        # Check for data workflows
        workflow_indicators = [
            r'extract.*and.*(save|create|send|email)',
            r'find.*and.*(analyze|compare|filter)',
            r'collect.*and.*(organize|sort|categorize)'
        ]
        
        for pattern in workflow_indicators:
            if re.search(pattern, task_lower):
                return True
        
        # Task is simple
        return False
    
    async def decompose_task(self, task_description: str) -> TaskDecomposition:
        """
        Break down a complex task into sub-tasks using AI
        
        Args:
            task_description: The user's original task request
            
        Returns:
            TaskDecomposition with ordered sub-tasks and metadata
        """
        logger.info(f"Decomposing task: {task_description}")
        
        prompt = self._build_decomposition_prompt(task_description)
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Parse response
            content = response.content[0].text
            decomposition_data = self._parse_decomposition_response(content)
            
            # Convert to objects
            subtasks = [
                Subtask(
                    index=st['index'],
                    description=st['description'],
                    expected_outcome=st['expected_outcome'],
                    success_criteria=st['success_criteria'],
                    dependencies=st.get('dependencies', []),
                    estimated_duration_seconds=st.get('estimated_duration_seconds', 30)
                )
                for st in decomposition_data['subtasks']
            ]
            
            total_duration = decomposition_data.get('total_estimated_duration', 
                                                   sum(st.estimated_duration_seconds for st in subtasks))
            
            logger.info(f"Created decomposition with {len(subtasks)} subtasks")
            return TaskDecomposition(subtasks, total_duration)
            
        except Exception as e:
            logger.error(f"Failed to decompose task: {e}")
            # Return simple single-task decomposition as fallback
            return TaskDecomposition(
                subtasks=[
                    Subtask(
                        index=0,
                        description=task_description,
                        expected_outcome="Task completed",
                        success_criteria="Action executed successfully",
                        dependencies=[],
                        estimated_duration_seconds=60
                    )
                ],
                total_estimated_duration=60
            )
    
    def _build_decomposition_prompt(self, task_description: str) -> str:
        """Build the AI prompt for task decomposition"""
        return f"""Analyze this web automation task and break it into 3-10 logical sub-tasks.

Task: {task_description}

For each sub-task, provide:
1. A clear, actionable description (1 sentence)
2. Expected outcome (what should result)
3. Success criteria (how to verify completion)
4. Dependencies (indices of sub-tasks that must complete first)
5. Estimated duration in seconds

Guidelines:
- Keep sub-tasks focused and atomic
- Order sub-tasks logically (dependencies)
- Be specific about actions and outcomes
- Include validation/verification steps if needed
- Estimate realistic durations

Return ONLY valid JSON in this exact format:
{{
  "subtasks": [
    {{
      "index": 0,
      "description": "Navigate to website homepage",
      "expected_outcome": "Homepage loaded successfully",
      "success_criteria": "Page title contains 'Home' and main navigation visible",
      "dependencies": [],
      "estimated_duration_seconds": 10
    }}
  ],
  "total_estimated_duration": 180
}}"""
    
    def _parse_decomposition_response(self, response: str) -> Dict[str, Any]:
        """Parse Claude's JSON response"""
        import json
        
        # Extract JSON from response (may have markdown code blocks)
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(1)
        else:
            # Try to find raw JSON
            json_str = response.strip()
        
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Response was: {response}")
            raise
    
    async def validate_subtask(
        self, 
        subtask: Subtask, 
        result: Dict[str, Any]
    ) -> bool:
        """
        Validate if a sub-task was completed successfully
        
        Args:
            subtask: The sub-task that was executed
            result: Execution result data
            
        Returns:
            True if subtask succeeded, False otherwise
        """
        # Check for explicit error
        if result.get('error'):
            return False
        
        # If success criteria is simple, check basic completion
        if not result.get('success'):
            return False
        
        # TODO: Add AI-powered validation using success_criteria
        # For now, rely on explicit success flag
        return True
    
    def get_next_subtask(
        self,
        decomposition: TaskDecomposition,
        completed_indices: List[int]
    ) -> Optional[Subtask]:
        """
        Get the next sub-task to execute based on dependencies
        
        Args:
            decomposition: The full task decomposition
            completed_indices: List of already-completed subtask indices
            
        Returns:
            Next subtask to execute, or None if all complete
        """
        for subtask in decomposition.subtasks:
            # Skip if already completed
            if subtask.index in completed_indices:
                continue
            
            # Check if all dependencies are satisfied
            deps_satisfied = all(
                dep_index in completed_indices 
                for dep_index in subtask.dependencies
            )
            
            if deps_satisfied:
                return subtask
        
        return None
