from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid

class StepStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"

class Step(BaseModel):
    step_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    status: StepStatus = StepStatus.NOT_STARTED
    notes: Optional[str] = None
    action_type: Optional[str] = None # e.g. SEARCH, BROWSE, CODE

class Plan(BaseModel):
    plan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    steps: List[Step] = Field(default_factory=list)
    active_step_index: Optional[int] = 0
    created_at: str = Field(default_factory=lambda: str(uuid.uuid4())) # TODO: Use real timestamp
    status: str = "active" # active, completed, failed
