import asyncio
import sys
import os

# Add backend to path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.assets import Incident
from services.nova_agent import handle_incident

async def main():
    print("Testing Nova Agent handle_incident with a fake incident...")
    
    # Create a mock incident
    incident = Incident(
        id="INC-MOCK-9999",
        type="person_detected",
        zone="Restricted Server Room",
        severity="high",
        description="A person was detected lingering near the main server rack after hours.",
        model_confidence=0.92
    )
    
    # Call handle_incident directly
    assessment = await handle_incident(incident)
    
    if assessment:
        print("\n=== Nova Assessment Result ===")
        import json
        print(json.dumps(assessment, indent=2))
    else:
        print("Assessment failed or returned None.")

if __name__ == "__main__":
    asyncio.run(main())
