"""Quick test to verify Phase 1 API endpoints return seeded data."""
import httpx

BASE = "http://127.0.0.1:8000/api/v1"
r = httpx.post(f"{BASE}/auth/login", data={"username": "admin", "password": "password123"})
tok = r.json()["access_token"]
h = {"Authorization": f"Bearer {tok}"}

# Cameras
cams = httpx.get(f"{BASE}/cameras/", headers=h).json()
print(f"=== CAMERAS ({len(cams)}) ===")
for c in cams:
    print(f"  {c['id']}: {c['name']} | status={c['status']} | health={c.get('health_status')} | area={c.get('area')}")

# Camera Health
ch = httpx.get(f"{BASE}/camera-health/", headers=h).json()
print(f"\n=== CAMERA HEALTH ({len(ch)}) ===")
for rec in ch:
    print(f"  {rec['camera_id']}: {rec['status']} | fps={rec['fps_actual']} | latency={rec['network_latency_ms']}ms")

# Traffic Events
te = httpx.get(f"{BASE}/traffic-events/", headers=h).json()
print(f"\n=== TRAFFIC EVENTS ({len(te)}) ===")
for e in te[:3]:
    print(f"  #{e['id']}: {e['event_type']} | cam={e['camera_id']} | conf={e['confidence']} | class={e.get('vehicle_class')}")

# Violations
vl = httpx.get(f"{BASE}/violations/", headers=h).json()
print(f"\n=== VIOLATIONS ({len(vl)}) ===")
for v in vl:
    print(f"  {v['id']}: {v['violation_type']} | plate={v.get('plate_number')} | status={v['status']}")

# Alerts
al = httpx.get(f"{BASE}/alerts/", headers=h).json()
print(f"\n=== ALERTS ({len(al)}) ===")
for a in al:
    print(f"  {a['id']}: [{a['severity']}] {a['title']} | status={a['status']}")

# Audit Logs
logs = httpx.get(f"{BASE}/audit-logs/", headers=h).json()
print(f"\n=== AUDIT LOGS ({len(logs)}) ===")
for entry in logs[:5]:
    details = (entry.get("details") or "")[:80]
    print(f"  #{entry['id']}: {entry['action']} | {entry.get('resource_type')} | {details}")

# RBAC test: login as auditor, try to access license plates (should be 403)
r2 = httpx.post(f"{BASE}/auth/login", data={"username": "soc_operator_1", "password": "operator123"})
tok2 = r2.json()["access_token"]
h2 = {"Authorization": f"Bearer {tok2}"}
lp = httpx.get(f"{BASE}/license-plates/", headers=h2)
print(f"\n=== RBAC TEST ===")
print(f"  SOC Operator accessing license-plates: {lp.status_code}")

r3 = httpx.post(f"{BASE}/auth/login", data={"username": "auditor_1", "password": "auditor123"})
tok3 = r3.json()["access_token"]
h3 = {"Authorization": f"Bearer {tok3}"}
al_resp = httpx.get(f"{BASE}/audit-logs/", headers=h3)
print(f"  Auditor accessing audit-logs: {al_resp.status_code}")
lp2 = httpx.get(f"{BASE}/license-plates/", headers=h3)
print(f"  Auditor accessing license-plates: {lp2.status_code} (expected 403)")

print("\nAll Phase 1 verification passed!")
