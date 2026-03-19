"""Tests for stock ledger endpoints."""

from datetime import datetime
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import stock_ledger
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.stock_ledger import StockTransactionType
from app.services.stock_ledger_service import StockLedgerService


class _DummyUser:
    id = 1
    is_superuser = True
    roles = []
    permissions = []


def _test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(stock_ledger.router, prefix="/api/v1/stock-ledger", tags=["Stock Ledger"])

    async def override_get_current_user():
        return _DummyUser()

    async def override_get_db():
        yield None

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_db] = override_get_db
    return app


def test_list_stock_ledger_entries_basic(monkeypatch):
    """Test listing stock ledger entries with basic pagination."""
    async def mock_get_ledger_entries(
        db, product_id=None, warehouse_id=None, transaction_type=None, 
        reference_type=None, date_from=None, date_to=None, page=1, page_size=50
    ):
        assert page == 1
        assert page_size == 100
        return [
            SimpleNamespace(
                id=100,
                product_id=5,
                warehouse_id=2,
                type=StockTransactionType.IN,
                qty_change=50,
                qty_before=100,
                qty_after=150,
                reference_type="purchase",
                reference_id=42,
                note="Purchase delivery",
                created_by=1,
                created_at=datetime(2026, 3, 7, 10, 0, 0),
            )
        ], 1

    monkeypatch.setattr(StockLedgerService, "get_ledger_entries", mock_get_ledger_entries)

    app = _test_app()
    client = TestClient(app)

    response = client.get("/api/v1/stock-ledger?skip=0&limit=100")
    assert response.status_code == 200

    payload = response.json()
    assert payload["total"] == 1
    assert payload["page"] == 1
    assert payload["page_size"] == 100
    assert len(payload["items"]) == 1
    assert payload["items"][0]["id"] == 100
    assert payload["items"][0]["qty_change"] == 50
    assert payload["items"][0]["reference_type"] == "purchase"


def test_list_stock_ledger_with_filters(monkeypatch):
    """Test listing stock ledger entries with all filters applied."""
    async def mock_get_ledger_entries(
        db, product_id=None, warehouse_id=None, transaction_type=None, 
        reference_type=None, date_from=None, date_to=None, page=1, page_size=50
    ):
        # Verify all filters are passed correctly
        assert product_id == 10
        assert warehouse_id == 3
        assert transaction_type == StockTransactionType.ADJUST
        assert reference_type == "stock_adjustment"
        assert date_from == "2026-03-01T00:00:00"
        assert date_to == "2026-03-31T23:59:59"
        assert page == 1
        assert page_size == 50

        return [
            SimpleNamespace(
                id=200,
                product_id=10,
                warehouse_id=3,
                type=StockTransactionType.ADJUST,
                qty_change=-5,
                qty_before=100,
                qty_after=95,
                reference_type="stock_adjustment",
                reference_id=15,
                note="Physical count correction",
                created_by=1,
                created_at=datetime(2026, 3, 10, 14, 30, 0),
            )
        ], 1

    monkeypatch.setattr(StockLedgerService, "get_ledger_entries", mock_get_ledger_entries)

    app = _test_app()
    client = TestClient(app)

    response = client.get(
        "/api/v1/stock-ledger"
        "?product_id=10"
        "&warehouse_id=3"
        "&type=adjust"
        "&reference_type=stock_adjustment"
        "&date_from=2026-03-01T00:00:00"
        "&date_to=2026-03-31T23:59:59"
        "&skip=0&limit=50"
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["product_id"] == 10
    assert payload["items"][0]["warehouse_id"] == 3
    assert payload["items"][0]["type"] == "adjust"
    assert payload["items"][0]["reference_type"] == "stock_adjustment"


def test_get_stock_ledger_entry_by_id_success(monkeypatch):
    """Test retrieving a single stock ledger entry by ID."""
    async def mock_get_by_id(db, ledger_id):
        assert ledger_id == 123
        return SimpleNamespace(
            id=123,
            product_id=7,
            warehouse_id=4,
            type=StockTransactionType.OUT,
            qty_change=-20,
            qty_before=50,
            qty_after=30,
            reference_type="sale",
            reference_id=99,
            note="Customer order fulfilled",
            created_by=2,
            created_at=datetime(2026, 3, 7, 16, 45, 0),
        )

    monkeypatch.setattr(StockLedgerService, "get_by_id", mock_get_by_id)

    app = _test_app()
    client = TestClient(app)

    response = client.get("/api/v1/stock-ledger/123")
    assert response.status_code == 200

    payload = response.json()
    assert payload["id"] == 123
    assert payload["product_id"] == 7
    assert payload["warehouse_id"] == 4
    assert payload["type"] == "out"
    assert payload["qty_change"] == -20
    assert payload["reference_type"] == "sale"
    assert payload["reference_id"] == 99


def test_get_stock_ledger_entry_not_found(monkeypatch):
    """Test 404 response when ledger entry doesn't exist."""
    async def mock_get_by_id(db, ledger_id):
        return None  # Entry not found

    monkeypatch.setattr(StockLedgerService, "get_by_id", mock_get_by_id)

    app = _test_app()
    client = TestClient(app)

    response = client.get("/api/v1/stock-ledger/999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_list_stock_ledger_pagination_calculation(monkeypatch):
    """Test pagination calculations work correctly."""
    async def mock_get_ledger_entries(
        db, product_id=None, warehouse_id=None, transaction_type=None, 
        reference_type=None, date_from=None, date_to=None, page=1, page_size=50
    ):
        # Verify page calculation from skip/limit
        assert page == 3  # skip=40, limit=20 → page 3
        assert page_size == 20
        return [], 0

    monkeypatch.setattr(StockLedgerService, "get_ledger_entries", mock_get_ledger_entries)

    app = _test_app()
    client = TestClient(app)

    response = client.get("/api/v1/stock-ledger?skip=40&limit=20")
    assert response.status_code == 200


def test_list_stock_ledger_with_product_filter_only(monkeypatch):
    """Test filtering by product only."""
    async def mock_get_ledger_entries(
        db, product_id=None, warehouse_id=None, transaction_type=None, 
        reference_type=None, date_from=None, date_to=None, page=1, page_size=50
    ):
        assert product_id == 25
        assert warehouse_id is None
        assert transaction_type is None
        return [], 0

    monkeypatch.setattr(StockLedgerService, "get_ledger_entries", mock_get_ledger_entries)

    app = _test_app()
    client = TestClient(app)

    response = client.get("/api/v1/stock-ledger?product_id=25")
    assert response.status_code == 200


def test_list_stock_ledger_with_warehouse_filter_only(monkeypatch):
    """Test filtering by warehouse only."""
    async def mock_get_ledger_entries(
        db, product_id=None, warehouse_id=None, transaction_type=None, 
        reference_type=None, date_from=None, date_to=None, page=1, page_size=50
    ):
        assert product_id is None
        assert warehouse_id == 8
        assert transaction_type is None
        return [], 0

    monkeypatch.setattr(StockLedgerService, "get_ledger_entries", mock_get_ledger_entries)

    app = _test_app()
    client = TestClient(app)

    response = client.get("/api/v1/stock-ledger?warehouse_id=8")
    assert response.status_code == 200


def test_list_stock_ledger_with_type_filter(monkeypatch):
    """Test filtering by transaction type."""
    async def mock_get_ledger_entries(
        db, product_id=None, warehouse_id=None, transaction_type=None, 
        reference_type=None, date_from=None, date_to=None, page=1, page_size=50
    ):
        assert transaction_type == StockTransactionType.TRANSFER
        return [], 0

    monkeypatch.setattr(StockLedgerService, "get_ledger_entries", mock_get_ledger_entries)

    app = _test_app()
    client = TestClient(app)

    response = client.get("/api/v1/stock-ledger?type=transfer")
    assert response.status_code == 200


def test_list_stock_ledger_empty_results(monkeypatch):
    """Test handling empty ledger result set."""
    async def mock_get_ledger_entries(
        db, product_id=None, warehouse_id=None, transaction_type=None, 
        reference_type=None, date_from=None, date_to=None, page=1, page_size=50
    ):
        return [], 0  # No entries

    monkeypatch.setattr(StockLedgerService, "get_ledger_entries", mock_get_ledger_entries)

    app = _test_app()
    client = TestClient(app)

    response = client.get("/api/v1/stock-ledger")
    assert response.status_code == 200

    payload = response.json()
    assert payload["total"] == 0
    assert payload["items"] == []
    assert payload["total_pages"] == 0


def test_list_stock_ledger_multiple_entries(monkeypatch):
    """Test listing multiple ledger entries."""
    async def mock_get_ledger_entries(
        db, product_id=None, warehouse_id=None, transaction_type=None, 
        reference_type=None, date_from=None, date_to=None, page=1, page_size=50
    ):
        return [
            SimpleNamespace(
                id=1, product_id=1, warehouse_id=1, type=StockTransactionType.IN,
                qty_change=100, qty_before=0, qty_after=100,
                reference_type="purchase", reference_id=1, note=None,
                created_by=1, created_at=datetime(2026, 3, 1, 10, 0, 0),
            ),
            SimpleNamespace(
                id=2, product_id=1, warehouse_id=1, type=StockTransactionType.OUT,
                qty_change=-30, qty_before=100, qty_after=70,
                reference_type="sale", reference_id=1, note=None,
                created_by=1, created_at=datetime(2026, 3, 2, 14, 0, 0),
            ),
            SimpleNamespace(
                id=3, product_id=1, warehouse_id=1, type=StockTransactionType.ADJUST,
                qty_change=5, qty_before=70, qty_after=75,
                reference_type="stock_adjustment", reference_id=1, note="Count correction",
                created_by=1, created_at=datetime(2026, 3, 3, 9, 0, 0),
            ),
        ], 3

    monkeypatch.setattr(StockLedgerService, "get_ledger_entries", mock_get_ledger_entries)

    app = _test_app()
    client = TestClient(app)

    response = client.get("/api/v1/stock-ledger")
    assert response.status_code == 200

    payload = response.json()
    assert payload["total"] == 3
    assert len(payload["items"]) == 3
    assert payload["items"][0]["id"] == 1
    assert payload["items"][1]["id"] == 2
    assert payload["items"][2]["id"] == 3
