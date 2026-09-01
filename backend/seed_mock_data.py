import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.abspath("."))
from config.database import AsyncSessionLocal
from models.assets import Zone, Incident, SecurityEvent, Case, Watchlist, Playbook
from sqlalchemy.future import select

async def seed_mock_data():
    async with AsyncSessionLocal() as session:
        # 1. Zones
        print("Seeding Zones...")
        zones = [
            Zone(id="zone-1", name="Perimeter Alpha", polygon_coords=[[25.2, 51.5], [25.21, 51.5]], rule="no_intrusion", color="#ff0000"),
            Zone(id="zone-2", name="Lobby Area", polygon_coords=[[25.2, 51.5], [25.21, 51.5]], rule="loitering", color="#00ff00"),
        ]
        for z in zones:
            existing = await session.execute(select(Zone).where(Zone.id == z.id))
            if not existing.scalar_one_or_none():
                session.add(z)
        
        # 2. Watchlists
        print("Seeding Watchlists...")
        watchlists = [
            Watchlist(id="wl-1", name="Suspicious Vehicle", category="Suspect", plate_number="ABC-123", vehicle_description="Black SUV", approval_status="approved"),
            Watchlist(id="wl-2", name="Known Trespasser", category="POI", notes="Do not engage.", approval_status="approved"),
        ]
        for w in watchlists:
            existing = await session.execute(select(Watchlist).where(Watchlist.id == w.id))
            if not existing.scalar_one_or_none():
                session.add(w)
                
        # 3. Cases
        print("Seeding Cases...")
        cases = [
            Case(id="case-1", title="Perimeter Breach - Sector 4", status="open", severity="critical", summary="Multiple intrusions detected overnight.", bundle_confidence=92.5, correlated_alert_count=5, affected_zones="Perimeter Alpha"),
            Case(id="case-2", title="Repeated Loitering", status="investigating", severity="medium", summary="Subject loitering near main lobby.", bundle_confidence=75.0, correlated_alert_count=2, affected_zones="Lobby Area"),
        ]
        for c in cases:
            existing = await session.execute(select(Case).where(Case.id == c.id))
            if not existing.scalar_one_or_none():
                session.add(c)
                
        # 4. Incidents
        print("Seeding Incidents...")
        incidents = [
            Incident(id="inc-1", camera_id="cam-1", type="intrusion", severity="high", status="detected", description="Person scaled the east wall.", zone="Perimeter Alpha", model_confidence=0.95, case_id="case-1"),
            Incident(id="inc-2", camera_id="cam-4", type="unattended_bag", severity="medium", status="in_progress", description="Bag left in lobby.", zone="Lobby Area", model_confidence=0.88, case_id="case-2"),
            Incident(id="inc-3", camera_id="cam-6", type="illegal_parking", severity="low", status="resolved", description="Vehicle parked in fire lane.", zone="Parking Lot", model_confidence=0.99),
        ]
        for inc in incidents:
            existing = await session.execute(select(Incident).where(Incident.id == inc.id))
            if not existing.scalar_one_or_none():
                session.add(inc)
                
        # 5. Security Events
        print("Seeding Security Events...")
        events = [
            SecurityEvent(event_type="brute_force", source_ip="192.168.1.100", target_username="admin", description="5 failed login attempts.", severity="high", is_resolved=False, mitre_technique_id="T1110"),
            SecurityEvent(event_type="unauthorized_access", source_ip="10.0.0.5", target_username="operator", description="Access attempt from outside geo-fence.", severity="medium", is_resolved=True),
        ]
        # Just add them (they use auto-increment integer IDs)
        session.add_all(events)
        
        # 6. Playbooks
        print("Seeding Playbooks...")
        playbooks = [
            Playbook(id="pb-1", name="Lockdown Protocol", trigger_type="critical_alert", actions_json=[{"action": "lock_doors"}, {"action": "notify_police"}], status="active"),
            Playbook(id="pb-2", name="Warning Announcement", trigger_type="intrusion", actions_json=[{"action": "play_audio_warning"}], status="active"),
        ]
        for p in playbooks:
            existing = await session.execute(select(Playbook).where(Playbook.id == p.id))
            if not existing.scalar_one_or_none():
                session.add(p)
                
        await session.commit()
        print("Mock data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_mock_data())
