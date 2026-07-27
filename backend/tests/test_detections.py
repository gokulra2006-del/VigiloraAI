import pytest

@pytest.mark.asyncio
async def test_create_detection(client, operator_token, test_camera):
    resp = await client.post(
        "/api/v1/detections/",
        json={
            "camera_id": "test-cam-1",
            "class_name": "car",
            "confidence": 0.95,
            "bbox_json": "[10, 10, 50, 50]"
        },
        headers={"Authorization": f"Bearer {operator_token}"}
    )
    assert resp.status_code == 201
    assert resp.json()["class_name"] == "car"

@pytest.mark.asyncio
async def test_list_detections(client, operator_token, test_camera):
    await client.post(
        "/api/v1/detections/",
        json={
            "camera_id": "test-cam-1",
            "class_name": "person",
            "confidence": 0.88,
            "bbox_json": "[0, 0, 10, 10]"
        },
        headers={"Authorization": f"Bearer {operator_token}"}
    )
    
    resp = await client.get("/api/v1/detections/", headers={"Authorization": f"Bearer {operator_token}"})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
    assert resp.json()[0]["class_name"] == "person"
