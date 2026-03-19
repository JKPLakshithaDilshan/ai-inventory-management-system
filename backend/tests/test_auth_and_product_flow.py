import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_login_and_protected_me(client: AsyncClient, seeded_user: dict[str, str | int]) -> None:
    login_response = await client.post(
        "/api/v1/auth/login",
        data={"username": seeded_user["username"], "password": seeded_user["password"]},
    )

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    no_auth_me = await client.get("/api/v1/auth/me")
    assert no_auth_me.status_code == 401

    me_response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    body = me_response.json()
    assert body["username"] == "admin"
    assert body["email"] == "admin@test.example.com"


@pytest.mark.asyncio
async def test_product_creation_persists_correct_business_fields(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    payload = {
        "sku": "PRD-TEST-001",
        "name": "Integration Test Product",
        "description": "Created by automated test",
        "cost_price": 10.5,
        "selling_price": 20,
        "quantity": 3,
        "reorder_level": 5,
        "reorder_quantity": 12,
        "unit": "unit",
    }

    create_response = await client.post(
        "/api/v1/products",
        json=payload,
        headers=auth_headers,
    )

    assert create_response.status_code == 201
    created = create_response.json()

    assert created["sku"] == payload["sku"]
    assert created["name"] == payload["name"]
    assert created["quantity"] == payload["quantity"]
    assert created["reorder_level"] == payload["reorder_level"]
    assert created["stock_status"].lower() == "low_stock"

    duplicate_response = await client.post(
        "/api/v1/products",
        json=payload,
        headers=auth_headers,
    )
    assert duplicate_response.status_code == 400
