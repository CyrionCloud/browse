"""
Session Summarization Service

Uses LLM to analyze completed sessions and generate:
1. A concise, catchy title (3-5 words)
2. A brief 1-sentence summary of what was accomplished
"""

import logging
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.config import settings
from app.services.database import db

logger = logging.getLogger(__name__)

class SummaryService:
    def __init__(self):
        # Initialize LLM similar to Agent
        self.llm = ChatOpenAI(
            model=settings.MODEL_SELECTION or "gpt-4o",  # Use configured model
            api_key=settings.OPENAI_API_KEY,
            temperature=0.7
        )

    async def generate_and_save_summary(self, session_id: str, task_description: str, actions: list = None):
        """
        Generate title and summary for a session and save to DB.
        """
        try:
            logger.info(f"Generating summary for session {session_id}")
            
            # Fetch actions if not provided
            if not actions:
                actions = await db.get_session_actions(session_id)
            
            # Construct context
            action_log = "\n".join([
                f"- {a.get('type', 'action')}: {a.get('description', '')}" 
                for a in actions[-20:] # Limit to last 20 for brevity
            ])
            
            prompt = f"""
            Analyze this browser automation session:
            
            Task: "{task_description}"
            
            Recent Actions:
            {action_log}
            
            Generate a JSON response with:
            1. "title": A short, catchy 3-6 word title (e.g. "Flight Booking to NYC", "Amazon Price Check")
            2. "summary": A single sentence summarizing the outcome.
            
            Return ONLY raw valid JSON.
            """
            
            # Call LLM
            response = await self.llm.ainvoke([
                SystemMessage(content="You are a helpful assistant that summarizes automation tasks."),
                HumanMessage(content=prompt)
            ])
            
            # Parse response
            import json
            import re
            
            content = response.content
            # Extract JSON if markdown code blocks exist
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
            if json_match:
                content = json_match.group(1)
                
            result = json.loads(content.strip())
            
            title = result.get("title", "Untitled Session")
            summary = result.get("summary", "Session completed.")
            
            # Update DB
            logger.info(f"Saving summary: '{title}'")
            await db.update_session_status(
                session_id=session_id,
                status="completed", # Re-confirm status or just update fields
                update_data={
                    "title": title,
                    "summary": summary
                }
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
            return None

# Global instance
summary_service = SummaryService()
