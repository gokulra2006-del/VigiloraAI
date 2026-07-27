import pytest

@pytest.mark.asyncio
async def test_login_success(client, test_user):
    resp = await client.post("/api/v1/auth/login", data={"username": "test_operator", "password": "password123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()

@pytest.mark.asyncio
async def test_login_failure(client, test_user):
    resp = await client.post("/api/v1/auth/login", data={"username": "test_operator", "password": "wrong"})
    assert resp.status_code == 401

@pytest.mark.asyncio
async def test_read_me(client, operator_token):
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {operator_token}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "test_operator"

@pytest.mark.asyncio
async def test_register_user_as_admin(client, admin_token):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"username": "new_user", "password": "123", "role": "operator"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 201
    assert resp.json()["username"] == "new_user"

@pytest.mark.asyncio
async def test_register_user_as_operator_fails(client, operator_token):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"username": "new_user", "password": "123", "role": "operator"},
        headers={"Authorization": f"Bearer {operator_token}"}
    )
    assert resp.status_code == 403
