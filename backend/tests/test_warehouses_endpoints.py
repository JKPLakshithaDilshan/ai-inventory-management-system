from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import warehouses
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.audit_service import AuditService
from app.services.warehouse_service import WarehouseService


class _DummyUser:
    id = 1
    is_superuser = True
    roles = []
    permissions = []


def _test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(
        warehouses.router,
        prefix="/api/v1/warehouses",
        tags=["Warehouses"],
    )

    async def override_get_current_user():
        return _DummyUser()

    async def override_get_db():
        yield None

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    return app


def test_list_warehouses_pagination_contract(monkeypatch):
    async def mock_get_multi(
        self,
        skip=0,
        limit=100,
        search=None,
        is_active=None,
    ):
        assert skip == 0
        assert limit == 10
        assert search == "main"
        assert is_active is True
        items = [
            SimpleNamespace(
                id=1,
                name="Main Warehouse",
                code="WH-MAIN",
                address="123 Main",
                city="Colombo",
                contact_person="Manager",
                state=None,
                country=None,
                postal_code=None,
                phone=None,
                email=None,
                is_active=True,
                created_at="2026-03-07T00:00:00Z",
                updated_at="2026-03-07T00:00:00Z",
            )
        ]
        return items, 1

    monkeypatch.setattr(WarehouseService, "get_multi", mock_get_multi)

    app = _test_app()
    client = TestClient(app)

    response = client.get(
        "/api/v1/warehouses?skip=0&limit=10&search=main&is_active=true"
    )
    assert response.status_code == 200

    payload = response.json()
    assert "items" in payload
    assert payload["total"] == 1
    assert payload["page"] == 1
    assert payload["page_size"] == 10
    assert payload["total_pages"] == 1


def test_create_warehouse_duplicate_code(monkeypatch):
    async def mock_has_code_conflict(self, code, exclude_id=None):
        assert code == "WH-MAIN"
        return True

    monkeypatch.setattr(
        WarehouseService,
        "has_code_conflict",
        mock_has_code_conflict,
    )

    app = _test_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/warehouses",
        json={"name": "Main Warehouse", "code": "WH-MAIN", "is_active": True},
    )

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "Warehouse with this code already exists"
    )


def test_create_warehouse_success(monkeypatch):
    async def mock_has_code_conflict(self, code, exclude_id=None):
        return False

    async def mock_create(self, obj_in):
        return SimpleNamespace(
            id=7,
            name=obj_in.name,
            code=obj_in.code,
            address=obj_in.address,
            city=obj_in.city,
            contact_person=obj_in.contact_person,
            state=None,
            country=None,
            postal_code=None,
            phone=obj_in.phone,
            email=obj_in.email,
            is_active=obj_in.is_active,
            created_at="2026-03-07T00:00:00Z",
            updated_at="2026-03-07T00:00:00Z",
        )

    async def mock_create_log(self, **kwargs):
        return None

    monkeypatch.setattr(
        WarehouseService,
        "has_code_conflict",
        mock_has_code_conflict,
    )
    monkeypatch.setattr(WarehouseService, "create", mock_create)
    monkeypatch.setattr(AuditService, "create_log", mock_create_log)

    app = _test_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/warehouses",
        json={
            "name": "Branch Warehouse",
            "code": "WH-BRANCH",
            "is_active": True,
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["code"] == "WH-BRANCH"
    assert payload["name"] == "Branch Warehouse"


def test_update_warehouse_not_found(monkeypatch):
    async def mock_get_by_id(self, warehouse_id):
        return None

    monkeypatch.setattr(WarehouseService, "get_by_id", mock_get_by_id)

    app = _test_app()
    client = TestClient(app)

    response = client.patch(
        "/api/v1/warehouses/999",
        json={"name": "Updated Name"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Warehouse not found"


def test_delete_warehouse_success(monkeypatch):
    warehouse_obj = SimpleNamespace(
        id=2,
        name="Warehouse 2",
        code="WH-2",
        address=None,
        city=None,
        contact_person=None,
        phone=None,
        email=None,
        is_active=True,
    )

    async def mock_get_by_id(self, warehouse_id):
        return warehouse_obj

    async def mock_has_dependencies(self, warehouse_id):
        return False

    async def mock_delete(self, warehouse):
        return None

    async def mock_create_log(self, **kwargs):
        return None

    monkeypatch.setattr(WarehouseService, "get_by_id", mock_get_by_id)
    monkeypatch.setattr(
        WarehouseService,
        "has_dependencies",
        mock_has_dependencies,
    )
    monkeypatch.setattr(WarehouseService, "delete", mock_delete)
    monkeypatch.setattr(AuditService, "create_log", mock_create_log)

    app = _test_app()
    client = TestClient(app)

    response = client.delete("/api/v1/warehouses/2")
    assert response.status_code == 200
    assert response.json()["message"] == "Warehouse deleted successfully"


def test_create_warehouse_validation_error():
    app = _test_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/warehouses",
        json={"name": "", "code": "", "is_active": True},
    )

    assert response.status_code == 422
