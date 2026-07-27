import pytest

@pytest.mark.asyncio
async def test_create_incident_and_transition(client, operator_token, test_camera):
    # 1. Create incident
    resp = await client.post(
        "/api/v1/incidents/",
        json={
            "camera_id": "test-cam-1",
            "type": "illegal_parking",
            "severity": "high",
            "description": "Test incident"
        },
        headers={"Authorization": f"Bearer {operator_token}"}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "detected"
    incident_id = data["id"]
    
    # 2. Transition to acknowledged (Valid)
    resp2 = await client.patch(
        f"/api/v1/incidents/{incident_id}/transition",
        json={"status": "acknowledged"},
        headers={"Authorization": f"Bearer {operator_token}"}
    )
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "acknowledged"
    assert resp2.json()["acknowledged_at"] is not None

    # 3. Transition to closed (Invalid, must go through in_progress/resolved first)
    resp3 = await client.patch(
        f"/api/v1/incidents/{incident_id}/transition",
        json={"status": "closed"},
        headers={"Authorization": f"Bearer {operator_token}"}
    )
    assert resp3.status_code == 400
