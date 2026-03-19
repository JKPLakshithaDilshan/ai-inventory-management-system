from datetime import datetime
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import stock_adjustments
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.audit_service import AuditService
from app.services.stock_adjustment_service import StockAdjustmentService


class _DummyUser:
    id = 1
    is_superuser = True
    roles = []
    permissions = []


def _test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(
        stock_adjustments.router,
        prefix="/api/v1/stock-adjustments",
        tags=["Stock Adjustments"],
    )

    async def override_get_current_user():
        return _DummyUser()

    async def override_get_db():
        yield None

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    return app


def test_list_stock_adjustments_contract(monkeypatch):
    async def mock_get_multi(
        self,
        skip=0,
        limit=100,
        product_id=None,
        warehouse_id=None,
        adjustment_type=None,
        date_from=None,
        date_to=None,
    ):
        assert skip == 0
        assert limit == 10
        assert product_id == 5
        assert warehouse_id == 2
        assert adjustment_type == "increase"
        return [
            SimpleNamespace(
                id=1,
                product_id=5,
                warehouse_id=2,
                adjustment_type="increase",
                quantity=3,
                reason="Cycle count",
                note="bin mismatch",
                adjustment_reference="ADJ-001",
                created_by=1,
                created_at="2026-03-07T00:00:00Z",
            )
        ], 1

    monkeypatch.setattr(StockAdjustmentService, "get_multi", mock_get_multi)

    app = _test_app()
    client = TestClient(app)

    response = client.get(
        "/api/v1/stock-adjustments?skip=0&limit=10"
        "&product_id=5&warehouse_id=2&adjustment_type=increase"
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["total"] == 1
    assert payload["page_size"] == 10
    assert payload["items"][0]["adjustment_reference"] == "ADJ-001"


def test_get_current_stock(monkeypatch):
    async def mock_get_current_stock(self, product_id, warehouse_id):
        assert product_id == 3
        assert warehouse_id == 9
        return 44

    monkeypatch.setattr(
        StockAdjustmentService,
        "get_current_stock",
        mock_get_current_stock,
    )

    app = _test_app()
    client = TestClient(app)

    response = client.get(
        "/api/v1/stock-adjustments/current-stock?product_id=3&warehouse_id=9"
    )
    assert response.status_code == 200
    assert response.json()["quantity"] == 44


def test_create_stock_adjustment_duplicate_reference(monkeypatch):
    async def mock_has_reference_conflict(self, adjustment_reference):
        return True

    monkeypatch.setattr(
        StockAdjustmentService,
        "has_reference_conflict",
        mock_has_reference_conflict,
    )

    app = _test_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/stock-adjustments",
        json={
            "product_id": 1,
            "warehouse_id": 1,
            "adjustment_type": "increase",
            "quantity": 2,
            "reason": "Fix",
            "adjustment_reference": "ADJ-001",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Adjustment reference already exists"


def test_create_stock_adjustment_success(monkeypatch):
    async def mock_has_reference_conflict(self, adjustment_reference):
        return False

    async def mock_create_adjustment(self, payload, actor_id):
        return SimpleNamespace(
            id=9,
            product_id=payload.product_id,
            warehouse_id=payload.warehouse_id,
            adjustment_type=payload.adjustment_type,
            quantity=payload.quantity,
            reason=payload.reason,
            note=payload.note,
            adjustment_reference=payload.adjustment_reference,
            created_by=actor_id,
            created_at=datetime.utcnow(),
        )

    async def mock_create_log(self, **kwargs):
        return None

    monkeypatch.setattr(
        StockAdjustmentService,
        "has_reference_conflict",
        mock_has_reference_conflict,
    )
    monkeypatch.setattr(
        StockAdjustmentService,
        "create_adjustment",
        mock_create_adjustment,
    )
    monkeypatch.setattr(AuditService, "create_log", mock_create_log)

    app = _test_app()
    client = TestClient(app)

    response = client.post(
        "/api/v1/stock-adjustments",
        json={
            "product_id": 1,
            "warehouse_id": 1,
            "adjustment_type": "decrease",
            "quantity": 5,
            "reason": "Damaged",
            "note": "Broken in transit",
            "adjustment_reference": "ADJ-009",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["adjustment_type"] == "decrease"
    assert payload["quantity"] == 5
