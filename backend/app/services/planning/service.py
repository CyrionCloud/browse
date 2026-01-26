from typing import Dict, List, Optional
from .models import Plan, Step, StepStatus
import logging

logger = logging.getLogger(__name__)

class PlanningService:
    """Manages Plans and Steps (Stateful)."""
    
    def __init__(self):
        self.plans: Dict[str, Plan] = {}
        self.active_plan_id: Optional[str] = None
        
    def create_plan(self, title: str, steps: List[str]) -> Plan:
        """Creates a new plan from a list of step descriptions."""
        new_steps = [Step(description=s) for s in steps]
        plan = Plan(title=title, steps=new_steps)
        self.plans[plan.plan_id] = plan
        self.active_plan_id = plan.plan_id
        logger.info(f"Created Plan: {title} ({plan.plan_id})")
        return plan
        
    def get_plan(self, plan_id: str) -> Optional[Plan]:
        return self.plans.get(plan_id)
        
    def get_active_plan(self) -> Optional[Plan]:
        if not self.active_plan_id: return None
        return self.plans.get(self.active_plan_id)
        
    def update_step_status(self, plan_id: str, step_index: int, status: StepStatus, notes: str = None) -> Optional[Plan]:
        plan = self.plans.get(plan_id)
        if not plan: return None
        
        if 0 <= step_index < len(plan.steps):
            plan.steps[step_index].status = status
            if notes:
                plan.steps[step_index].notes = notes
            
            # Auto-advance active step logic could go here
            if status == StepStatus.COMPLETED:
                # simple logic: move to next
                if step_index + 1 < len(plan.steps):
                    plan.active_step_index = step_index + 1
                else:
                    plan.status = "completed"
                    
            return plan
        return None

# Global Instance
planning_service = PlanningService()
