from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import customers
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.audit_service import AuditService
from app.services.customer_service import CustomerService


class _DummyUser:
    id = 1
    is_superuser = True
    roles = []
    permissions = []


def _test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(
        customers.router,
        prefix="/api/v1/customers",
        tags=["Customers"],
    )

    async def override_get_current_user():
        return _DummyUser()

    async def override_get_db():
        yield None

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    return app


def test_list_customers_pagination_contract(monkeypatch):
    async def mock_get_multi(
        self,
        skip=0,
        limit=100,
        search=None,
        is_active=None,
        customer_type=None,
    ):
        assert skip == 0
        assert limit == 10
        assert search == "cus"
        assert is_active is True
        assert customer_type == "business"
        return [
            SimpleNamespace(
                id=1,
                customer_code="CUS-001",
                full_name="Acme Procurement",
                company_name="Acme Inc",
                email="acme@example.com",
                phone="123456789",
                address="Main Street",
                city="Colombo",
                customer_type="business",
                credit_limit=10000,
                is_active=True,
                notes=None,
                created_at="2026-03-07T00:00:00Z",
                updated_at="2026-03-07T00:00:00Z",
            )
        ], 1

    monkeypatch.setattr(CustomerService, "get_multi", mock_get_multi)

    app = _test_app()
    client = TestClient(app)

    url = (
        "/api/v1/customers?skip=0&limit=10&search=cus"
        "&is_active=true&customer_type=business"
    )
    response = client.get(url)
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["page_size"] == 10


def test_create_customer_duplicate_code(monkeypatch):
    async def mock_has_code_conflict(self, customer_code, exclude_id=None):
        return True

    monkeypatch.setattr(
        CustomerService, "has_code_conflict", mock_has_code_conflict
    )

    app = _test_app()
    client = TestClient(app)
    response = client.post(
        "/api/v1/customers",
        json={
            "customer_code": "CUS-001",
            "full_name": "John Doe",
            "customer_type": "individual",
            "credit_limit": 0,
            "is_active": True,
        },
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    expected = "Customer with this code already exists"
    assert detail == expected


def test_create_customer_success(monkeypatch):
    async def mock_has_code_conflict(self, customer_code, exclude_id=None):
        return False

    async def mock_create(self, obj_in):
        return SimpleNamespace(
            id=3,
            customer_code=obj_in.customer_code,
            full_name=obj_in.full_name,
            company_name=obj_in.company_name,
            email=obj_in.email,
            phone=obj_in.phone,
            address=obj_in.address,
            city=obj_in.city,
            customer_type=obj_in.customer_type,
            credit_limit=obj_in.credit_limit,
            is_active=obj_in.is_active,
            notes=obj_in.notes,
            created_at="2026-03-07T00:00:00Z",
            updated_at="2026-03-07T00:00:00Z",
        )

    async def mock_create_log(self, **kwargs):
        return None

    monkeypatch.setattr(
        CustomerService, "has_code_conflict", mock_has_code_conflict
    )
    monkeypatch.setattr(CustomerService, "create", mock_create)
    monkeypatch.setattr(AuditService, "create_log", mock_create_log)

    app = _test_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/customers",
        json={
            "customer_code": "CUS-NEW",
            "full_name": "New Customer",
            "customer_type": "business",
            "credit_limit": 500,
            "is_active": True,
        },
    )
    assert response.status_code == 201
    assert response.json()["customer_code"] == "CUS-NEW"


def test_update_customer_not_found(monkeypatch):
    async def mock_get_by_id(self, customer_id):
        return None

    monkeypatch.setattr(CustomerService, "get_by_id", mock_get_by_id)

    app = _test_app()
    client = TestClient(app)

    response = client.patch(
        "/api/v1/customers/999", json={"full_name": "Updated"}
    )
    assert response.status_code == 404


def test_delete_customer_conflict_when_linked_to_sales(monkeypatch):
    customer = SimpleNamespace(
        id=11,
        customer_code="CUS-011",
        full_name="Customer 11",
        company_name=None,
        email=None,
        phone=None,
        address=None,
        city=None,
        customer_type="individual",
        credit_limit=0,
        is_active=True,
        notes=None,
    )

    async def mock_get_by_id(self, customer_id):
        return customer

    async def mock_has_sales(self, customer_id):
        return True

    monkeypatch.setattr(CustomerService, "get_by_id", mock_get_by_id)
    monkeypatch.setattr(CustomerService, "has_sales", mock_has_sales)

    app = _test_app()
    client = TestClient(app)

    response = client.delete("/api/v1/customers/11")
    assert response.status_code == 409


def test_credit_limit_validation_error():
    app = _test_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/customers",
        json={
            "customer_code": "CUS-VAL",
            "full_name": "Bad Credit",
            "customer_type": "individual",
            "credit_limit": -1,
            "is_active": True,
        },
    )
    assert response.status_code == 422
