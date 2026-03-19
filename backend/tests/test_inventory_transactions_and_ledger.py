from datetime import date

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.product_location import ProductLocation
from app.models.purchase import Purchase, PurchaseStatus
from app.models.sale import Sale, SaleStatus
from app.models.stock_ledger import StockLedger
from app.models.supplier import Supplier
from app.models.warehouse import Warehouse


@pytest_asyncio.fixture
async def inventory_setup(db_session: AsyncSession, seeded_user: dict[str, str | int]) -> dict[str, int]:
    warehouse = Warehouse(code="WH-01", name="Main Warehouse", is_active=True)
    supplier = Supplier(name="Test Supplier", code="SUP-001", is_active=True)

    db_session.add_all([warehouse, supplier])
    await db_session.flush()

    product = Product(
        sku="INV-PROD-001",
        name="Inventory Product",
        cost_price=12,
        selling_price=25,
        quantity=10,
        reorder_level=4,
        reorder_quantity=10,
        unit="unit",
    )
    product.update_stock_status()
    db_session.add(product)
    await db_session.flush()

    # Keep location stock consistent with total stock for sale completion checks.
    location = ProductLocation(product_id=product.id, warehouse_id=warehouse.id, quantity=10)
    db_session.add(location)
    await db_session.flush()

    return {
        "warehouse_id": warehouse.id,
        "supplier_id": supplier.id,
        "product_id": product.id,
    }


@pytest.mark.asyncio
async def test_purchase_receive_updates_stock_and_creates_ledger_entry(
    client: AsyncClient,
    db_session: AsyncSession,
    auth_headers: dict[str, str],
    inventory_setup: dict[str, int],
) -> None:
    create_purchase_payload = {
        "supplier_id": inventory_setup["supplier_id"],
        "warehouse_id": inventory_setup["warehouse_id"],
        "purchase_date": date.today().isoformat(),
        "items": [
            {
                "product_id": inventory_setup["product_id"],
                "quantity": 7,
                "unit_price": 11,
            }
        ],
    }

    purchase_response = await client.post(
        "/api/v1/purchases",
        json=create_purchase_payload,
        headers=auth_headers,
    )
    assert purchase_response.status_code == 201, f"Status {purchase_response.status_code}: {purchase_response.text}"
    created_purchase = purchase_response.json()
    purchase_id = created_purchase["id"]
    purchase_item_id = created_purchase["items"][0]["id"]

    receive_response = await client.post(
        f"/api/v1/purchases/{purchase_id}/receive",
        json={
            "items": [{"purchase_item_id": purchase_item_id, "received_quantity": 7}],
            "received_date": date.today().isoformat(),
        },
        headers=auth_headers,
    )
    assert receive_response.status_code == 200
    received_purchase = receive_response.json()
    assert received_purchase["status"].lower() == PurchaseStatus.RECEIVED.value

    product = await db_session.get(Product, inventory_setup["product_id"])
    assert product is not None
    assert product.quantity == 17

    ledger_entries = (await db_session.execute(
        StockLedger.__table__.select().where(StockLedger.reference_type == "purchase", StockLedger.reference_id == purchase_id)
    )).all()
    assert len(ledger_entries) == 1
    assert ledger_entries[0].qty_change == 7


@pytest.mark.asyncio
async def test_sale_completion_deducts_stock_and_records_outbound_ledger(
    client: AsyncClient,
    db_session: AsyncSession,
    auth_headers: dict[str, str],
    inventory_setup: dict[str, int],
) -> None:
    create_sale_payload = {
        "warehouse_id": inventory_setup["warehouse_id"],
        "sale_date": date.today().isoformat(),
        "customer_name": "QA Customer",
        "items": [
            {
                "product_id": inventory_setup["product_id"],
                "quantity": 4,
                "unit_price": 25,
                "discount_percent": 0,
            }
        ],
    }

    sale_create_response = await client.post(
        "/api/v1/sales",
        json=create_sale_payload,
        headers=auth_headers,
    )
    assert sale_create_response.status_code == 201
    sale = sale_create_response.json()
    assert sale["status"].lower() == SaleStatus.DRAFT.value

    sale_id = sale["id"]
    complete_response = await client.post(
        f"/api/v1/sales/{sale_id}/complete",
        headers=auth_headers,
    )
    assert complete_response.status_code == 200
    completed = complete_response.json()
    assert completed["status"].lower() == SaleStatus.COMPLETED.value

    product = await db_session.get(Product, inventory_setup["product_id"])
    assert product is not None
    assert product.quantity == 6

    location = (await db_session.execute(
        ProductLocation.__table__.select().where(
            ProductLocation.product_id == inventory_setup["product_id"],
            ProductLocation.warehouse_id == inventory_setup["warehouse_id"],
        )
    )).first()
    assert location is not None
    assert location.quantity == 6

    ledger_entries = (await db_session.execute(
        StockLedger.__table__.select().where(StockLedger.reference_type == "sale", StockLedger.reference_id == sale_id)
    )).all()
    assert len(ledger_entries) == 1
    assert ledger_entries[0].qty_change == -4


@pytest.mark.asyncio
async def test_stock_ledger_list_and_detail_endpoints_return_transaction_history(
    client: AsyncClient,
    auth_headers: dict[str, str],
    inventory_setup: dict[str, int],
) -> None:
    # Seed one purchase-receive event to ensure at least one ledger row exists.
    create_purchase_payload = {
        "supplier_id": inventory_setup["supplier_id"],
        "warehouse_id": inventory_setup["warehouse_id"],
        "purchase_date": date.today().isoformat(),
        "items": [{"product_id": inventory_setup["product_id"], "quantity": 2, "unit_price": 8}],
    }
    purchase_response = await client.post("/api/v1/purchases", json=create_purchase_payload, headers=auth_headers)
    purchase = purchase_response.json()

    await client.post(
        f"/api/v1/purchases/{purchase['id']}/receive",
        json={
            "items": [{"purchase_item_id": purchase["items"][0]["id"], "received_quantity": 2}],
            "received_date": date.today().isoformat(),
        },
        headers=auth_headers,
    )

    list_response = await client.get(
        "/api/v1/stock-ledger?page=1&page_size=20",
        headers=auth_headers,
    )
    assert list_response.status_code == 200

    list_body = list_response.json()
    assert list_body["total"] >= 1
    assert len(list_body["items"]) >= 1

    entry_id = list_body["items"][0]["id"]
    detail_response = await client.get(f"/api/v1/stock-ledger/{entry_id}", headers=auth_headers)
    assert detail_response.status_code == 200

    detail = detail_response.json()
    assert detail["id"] == entry_id
    assert detail["product"]["id"] == inventory_setup["product_id"]


@pytest.mark.asyncio
async def test_warehouse_crud_endpoints(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    create_response = await client.post(
        "/api/v1/warehouses",
        json={"code": "WH-QA", "name": "QA Warehouse", "is_active": True},
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    warehouse = create_response.json()
    warehouse_id = warehouse["id"]

    list_response = await client.get("/api/v1/warehouses?skip=0&limit=20", headers=auth_headers)
    assert list_response.status_code == 200
    assert list_response.json()["total"] >= 1

    detail_response = await client.get(f"/api/v1/warehouses/{warehouse_id}", headers=auth_headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["code"] == "WH-QA"

    update_response = await client.patch(
        f"/api/v1/warehouses/{warehouse_id}",
        json={"name": "QA Warehouse Updated"},
        headers=auth_headers,
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "QA Warehouse Updated"

    delete_response = await client.delete(f"/api/v1/warehouses/{warehouse_id}", headers=auth_headers)
    assert delete_response.status_code == 200
    assert "deleted" in delete_response.json()["message"].lower()
