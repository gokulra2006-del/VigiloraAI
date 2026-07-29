import asyncio
import httpx
from datetime import datetime, timezone
import json

from config.database import AsyncSessionLocal
from services.daily_digest import generate_daily_briefing
from models.assets import Incident, Camera
from models.enums import IncidentStatusEnum

async def test_daily_briefing():
    print("=== Testing Daily Briefing Flow ===")
    try:
        await generate_daily_briefing()
        print("Daily Briefing generated successfully. Check terminal logs of uvicorn for the output.")
    except Exception as e:
        print(f"Daily briefing failed: {e}")

async def test_incident_response_webhook():
    print("\n=== Testing Sentinel Bridge Webhook (Incident Response Flow) ===")
    
    payload = {
        "type": "Perimeter Breach Detected",
        "severity": "critical",
        "description": "Unauthorized access attempt at North Gate.",
        "camera_id": None, 
        "zone": "Sector 4",
        "source": "camera",
        "model_confidence": 0.95
    }

    async with httpx.AsyncClient() as client:
        try:
            # Login first
            auth_data = {"username": "admin", "password": "password123"}
            token_resp = await client.post("http://127.0.0.1:8000/api/v1/auth/login", data=auth_data)
            
            if token_resp.status_code != 200:
                print(f"Failed to get token: {token_resp.text}")
                return
            
            token = token_resp.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            response = await client.post("http://127.0.0.1:8000/api/v1/incidents/", json=payload, headers=headers)
            if response.status_code == 201:
                print(f"Webhook Success! Incident created: {response.json()['id']}")
            else:
                print(f"Webhook Failed! Code: {response.status_code}, Msg: {response.text}")
        except Exception as e:
            print(f"Request failed: {e}")

async def main():
    await test_daily_briefing()
    await test_incident_response_webhook()

if __name__ == "__main__":
    asyncio.run(main())
