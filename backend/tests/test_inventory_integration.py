"""Integration tests for inventory stock correctness and ledger behavior.

These tests execute against a real async database and real service-layer logic.

Setup strategy:
- Uses TEST_DATABASE_URI environment variable (must point to a dedicated test DB)
- Creates schema once per test session from SQLAlchemy models
- Truncates all tables before each test for isolation

Run example:
    TEST_DATABASE_URI=postgresql+asyncpg://user:pass@localhost:5432/ai_inventory_test \
    pytest backend/tests/test_inventory_integration.py -q
"""

from __future__ import annotations

import asyncio
import os
from datetime import date
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure model metadata is fully loaded for create_all.
import app.models  # noqa: F401
from app.core.database import Base
from app.core.security import get_password_hash
from app.models.product import Product
from app.models.product_location import ProductLocation
from app.models.purchase import PurchaseStatus
from app.models.sale import Sale, SaleStatus
from app.models.stock_ledger import StockLedger, StockTransactionType
from app.models.supplier import Supplier
from app.models.user import Role, User
from app.models.warehouse import Warehouse
from app.schemas.purchase import PurchaseCreate, PurchaseItemCreate
from app.schemas.sale import SaleCreate, SaleItemCreate
from app.schemas.stock_adjustment import StockAdjustmentCreate
from app.services.purchase_service import PurchaseService
from app.services.sale_service import SaleService
from app.services.stock_adjustment_service import StockAdjustmentService
from app.services.stock_ledger_service import StockLedgerService


@pytest.fixture(scope="session")
def test_db_url() -> str:
    """Return test database URL or skip the module.

    Safety guard: URL must include the string "test".
    """
    db_url = os.getenv("TEST_DATABASE_URI")
    if not db_url:
        pytest.skip("TEST_DATABASE_URI is not set; skipping integration tests", allow_module_level=True)

    if "test" not in db_url.lower():
        pytest.skip(
            "Refusing to run destructive integration tests on non-test database URL",
            allow_module_level=True,
        )

    return db_url


@pytest_asyncio.fixture(scope="session")
async def engine(test_db_url: str):
    engine = create_async_engine(test_db_url, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="session")
async def session_factory(engine):
    return async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def clean_tables(session_factory):
    """Truncate every table for deterministic integration tests."""
    table_names = [f'"{table.name}"' for table in Base.metadata.sorted_tables]
    truncate_sql = f"TRUNCATE TABLE {', '.join(table_names)} RESTART IDENTITY CASCADE"

    async with session_factory() as session:
        await session.execute(text(truncate_sql))
        await session.commit()

    yield


@pytest_asyncio.fixture
async def db_session(session_factory) -> AsyncGenerator[AsyncSession, None]:
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def seed_core_entities(db_session: AsyncSession):
    """Create realistic baseline entities for inventory tests."""
    role = Role(name="ADMIN", description="Admin role")
    user = User(
        email="admin@test.local",
        username="admin",
        full_name="Integration Admin",
        hashed_password=get_password_hash("Admin1234"),
        is_active=True,
        is_superuser=True,
    )
    user.roles = [role]

    supplier = Supplier(name="Test Supplier", code="SUP-INT-001", is_active=True)
    warehouse = Warehouse(code="WH-INT-001", name="Integration Warehouse", is_active=True)
    product = Product(
        sku="PRD-INT-001",
        name="Integration Product",
        cost_price=10.0,
        selling_price=20.0,
        quantity=0,
        reorder_level=5,
        reorder_quantity=10,
        unit="pcs",
    )

    db_session.add_all([role, user, supplier, warehouse, product])
    await db_session.flush()

    # Baseline stock through ledger so history starts from source of truth.
    await StockLedgerService.apply_stock_change(
        db=db_session,
        product_id=product.id,
        warehouse_id=warehouse.id,
        qty_delta=10,
        transaction_type=StockTransactionType.ADJUST,
        reference_type="baseline",
        reference_id=1,
        note="Initial integration baseline",
        actor_id=user.id,
    )
    await db_session.commit()

    return {
        "user": user,
        "supplier": supplier,
        "warehouse": warehouse,
        "product": product,
    }


async def _get_location_qty(session: AsyncSession, product_id: int, warehouse_id: int) -> int:
    result = await session.execute(
        select(ProductLocation.quantity).where(
            ProductLocation.product_id == product_id,
            ProductLocation.warehouse_id == warehouse_id,
        )
    )
    qty = result.scalar_one_or_none()
    return qty or 0


async def _ledger_entries_for_reference(session: AsyncSession, ref_type: str, ref_id: int) -> list[StockLedger]:
    result = await session.execute(
        select(StockLedger)
        .where(StockLedger.reference_type == ref_type, StockLedger.reference_id == ref_id)
        .order_by(StockLedger.id.asc())
    )
    return list(result.scalars().all())


@pytest.mark.asyncio
async def test_purchase_receive_increases_stock_and_writes_ledger(db_session: AsyncSession, seed_core_entities):
    user = seed_core_entities["user"]
    supplier = seed_core_entities["supplier"]
    warehouse = seed_core_entities["warehouse"]
    product = seed_core_entities["product"]

    purchase_service = PurchaseService(db_session)

    purchase = await purchase_service.create(
        PurchaseCreate(
            supplier_id=supplier.id,
            warehouse_id=warehouse.id,
            purchase_date=date.today(),
            items=[
                PurchaseItemCreate(
                    product_id=product.id,
                    quantity=5,
                    unit_price=12.0,
                )
            ],
        ),
        user_id=user.id,
    )
    await db_session.flush()

    qty_before = await _get_location_qty(db_session, product.id, warehouse.id)

    received = await purchase_service.receive_purchase(
        purchase_id=purchase.id,
        items=[{"purchase_item_id": purchase.items[0].id, "received_quantity": 5}],
        received_date=date.today(),
    )
    await db_session.commit()

    assert received is not None
    assert received.status == PurchaseStatus.RECEIVED

    qty_after = await _get_location_qty(db_session, product.id, warehouse.id)
    assert qty_after == qty_before + 5

    entries = await _ledger_entries_for_reference(db_session, "purchase", purchase.id)
    assert len(entries) == 1
    assert entries[0].type == StockTransactionType.IN
    assert entries[0].qty_change == 5
    assert entries[0].qty_before == qty_before
    assert entries[0].qty_after == qty_after


@pytest.mark.asyncio
async def test_sale_complete_decreases_stock_only_on_completion(db_session: AsyncSession, seed_core_entities):
    user = seed_core_entities["user"]
    warehouse = seed_core_entities["warehouse"]
    product = seed_core_entities["product"]

    sale_service = SaleService(db_session)

    qty_before = await _get_location_qty(db_session, product.id, warehouse.id)

    sale = await sale_service.create(
        SaleCreate(
            warehouse_id=warehouse.id,
            sale_date=date.today(),
            items=[SaleItemCreate(product_id=product.id, quantity=4, unit_price=20.0)],
        ),
        user_id=user.id,
    )
    await db_session.flush()

    # Draft creation must not mutate stock.
    qty_after_create = await _get_location_qty(db_session, product.id, warehouse.id)
    assert qty_after_create == qty_before

    no_entries = await _ledger_entries_for_reference(db_session, "sale", sale.id)
    assert len(no_entries) == 0

    completed = await sale_service.complete_sale(sale.id, actor_id=user.id)
    await db_session.commit()

    assert completed.status == SaleStatus.COMPLETED

    qty_after_complete = await _get_location_qty(db_session, product.id, warehouse.id)
    assert qty_after_complete == qty_before - 4

    entries = await _ledger_entries_for_reference(db_session, "sale", sale.id)
    assert len(entries) == 1
    assert entries[0].type == StockTransactionType.OUT
    assert entries[0].qty_change == -4


@pytest.mark.asyncio
async def test_stock_adjustments_modify_stock_correctly(db_session: AsyncSession, seed_core_entities):
    user = seed_core_entities["user"]
    warehouse = seed_core_entities["warehouse"]
    product = seed_core_entities["product"]

    adjustment_service = StockAdjustmentService(db_session)

    start_qty = await _get_location_qty(db_session, product.id, warehouse.id)

    inc = await adjustment_service.create_adjustment(
        StockAdjustmentCreate(
            product_id=product.id,
            warehouse_id=warehouse.id,
            adjustment_type="increase",
            quantity=3,
            reason="Cycle count correction",
            adjustment_reference="ADJ-INT-001",
        ),
        actor_id=user.id,
    )

    dec = await adjustment_service.create_adjustment(
        StockAdjustmentCreate(
            product_id=product.id,
            warehouse_id=warehouse.id,
            adjustment_type="decrease",
            quantity=2,
            reason="Damage write-off",
            adjustment_reference="ADJ-INT-002",
        ),
        actor_id=user.id,
    )
    await db_session.commit()

    assert inc.id is not None
    assert dec.id is not None

    final_qty = await _get_location_qty(db_session, product.id, warehouse.id)
    assert final_qty == start_qty + 3 - 2

    inc_entries = await _ledger_entries_for_reference(db_session, "stock_adjustment", inc.id)
    dec_entries = await _ledger_entries_for_reference(db_session, "stock_adjustment", dec.id)

    assert len(inc_entries) == 1
    assert inc_entries[0].qty_change == 3
    assert inc_entries[0].type == StockTransactionType.ADJUST

    assert len(dec_entries) == 1
    assert dec_entries[0].qty_change == -2
    assert dec_entries[0].type == StockTransactionType.ADJUST


@pytest.mark.asyncio
async def test_stock_ledger_history_is_append_only(db_session: AsyncSession, seed_core_entities):
    user = seed_core_entities["user"]
    warehouse = seed_core_entities["warehouse"]
    product = seed_core_entities["product"]

    # Existing baseline entry
    first_entry = (
        await db_session.execute(select(StockLedger).order_by(StockLedger.id.asc()))
    ).scalars().first()
    assert first_entry is not None

    first_snapshot = {
        "id": first_entry.id,
        "qty_before": first_entry.qty_before,
        "qty_after": first_entry.qty_after,
        "qty_change": first_entry.qty_change,
        "reference_type": first_entry.reference_type,
        "reference_id": first_entry.reference_id,
    }

    # Apply another stock mutation.
    await StockLedgerService.apply_stock_change(
        db=db_session,
        product_id=product.id,
        warehouse_id=warehouse.id,
        qty_delta=2,
        transaction_type=StockTransactionType.ADJUST,
        reference_type="manual_adjust",
        reference_id=999,
        note="append-only verification",
        actor_id=user.id,
    )
    await db_session.commit()

    refreshed_first = await db_session.get(StockLedger, first_snapshot["id"])
    assert refreshed_first is not None
    assert refreshed_first.qty_before == first_snapshot["qty_before"]
    assert refreshed_first.qty_after == first_snapshot["qty_after"]
    assert refreshed_first.qty_change == first_snapshot["qty_change"]
    assert refreshed_first.reference_type == first_snapshot["reference_type"]
    assert refreshed_first.reference_id == first_snapshot["reference_id"]

    total_entries = await db_session.scalar(select(func.count(StockLedger.id)))
    assert total_entries == 2


@pytest.mark.asyncio
async def test_sale_completion_fails_when_stock_insufficient(db_session: AsyncSession, seed_core_entities):
    user = seed_core_entities["user"]
    warehouse = seed_core_entities["warehouse"]
    product = seed_core_entities["product"]

    sale_service = SaleService(db_session)

    sale = await sale_service.create(
        SaleCreate(
            warehouse_id=warehouse.id,
            sale_date=date.today(),
            items=[SaleItemCreate(product_id=product.id, quantity=999, unit_price=20.0)],
        ),
        user_id=user.id,
    )
    await db_session.flush()

    with pytest.raises(HTTPException) as exc:
        await sale_service.complete_sale(sale.id, actor_id=user.id)

    assert exc.value.status_code == 400

    # Ensure no sale ledger entry was created for failed completion.
    entries = await _ledger_entries_for_reference(db_session, "sale", sale.id)
    assert len(entries) == 0

    current_qty = await _get_location_qty(db_session, product.id, warehouse.id)
    assert current_qty == 10


@pytest.mark.asyncio
async def test_adjustment_decrease_fails_without_allow_negative(db_session: AsyncSession, seed_core_entities):
    user = seed_core_entities["user"]
    warehouse = seed_core_entities["warehouse"]
    product = seed_core_entities["product"]

    adjustment_service = StockAdjustmentService(db_session)

    with pytest.raises(HTTPException) as exc:
        await adjustment_service.create_adjustment(
            StockAdjustmentCreate(
                product_id=product.id,
                warehouse_id=warehouse.id,
                adjustment_type="decrease",
                quantity=999,
                reason="invalid overshoot",
                adjustment_reference="ADJ-NEG-001",
                allow_negative=False,
            ),
            actor_id=user.id,
        )

    assert exc.value.status_code == 400

    # Failed transaction should be rolled back for subsequent assertions.
    await db_session.rollback()

    qty = await _get_location_qty(db_session, product.id, warehouse.id)
    assert qty == 10

    no_entries = await _ledger_entries_for_reference(db_session, "stock_adjustment", 1)
    assert len(no_entries) == 0


@pytest.mark.asyncio
async def test_concurrent_sale_completion_only_one_succeeds(session_factory, seed_core_entities):
    """Concurrent edge case:
    two draft sales consume the same stock; only one completion should succeed.
    """
    user = seed_core_entities["user"]
    warehouse = seed_core_entities["warehouse"]
    product = seed_core_entities["product"]

    # Create two draft sales in one setup session.
    async with session_factory() as setup_session:
        sale_service = SaleService(setup_session)

        sale_a = await sale_service.create(
            SaleCreate(
                warehouse_id=warehouse.id,
                sale_date=date.today(),
                items=[SaleItemCreate(product_id=product.id, quantity=7, unit_price=20.0)],
            ),
            user_id=user.id,
        )
        sale_b = await sale_service.create(
            SaleCreate(
                warehouse_id=warehouse.id,
                sale_date=date.today(),
                items=[SaleItemCreate(product_id=product.id, quantity=7, unit_price=20.0)],
            ),
            user_id=user.id,
        )
        await setup_session.commit()

    async def complete_sale_in_isolated_session(sale_id: int):
        async with session_factory() as isolated:
            service = SaleService(isolated)
            try:
                await service.complete_sale(sale_id, actor_id=user.id)
                await isolated.commit()
                return "success"
            except Exception as error:  # noqa: BLE001
                await isolated.rollback()
                return error

    result_a, result_b = await asyncio.gather(
        complete_sale_in_isolated_session(sale_a.id),
        complete_sale_in_isolated_session(sale_b.id),
    )

    outcomes = [result_a, result_b]
    assert outcomes.count("success") == 1

    failures = [outcome for outcome in outcomes if outcome != "success"]
    assert len(failures) == 1
    assert isinstance(failures[0], HTTPException)
    assert failures[0].status_code == 400

    # Verify final stock and statuses.
    async with session_factory() as verify_session:
        qty = await _get_location_qty(verify_session, product.id, warehouse.id)
        assert qty == 3  # 10 baseline - 7 from exactly one successful completion

        completed_count = await verify_session.scalar(
            select(func.count(Sale.id)).where(Sale.status == SaleStatus.COMPLETED)
        )
        draft_count = await verify_session.scalar(
            select(func.count(Sale.id)).where(Sale.status == SaleStatus.DRAFT)
        )

        assert completed_count == 1
        assert draft_count == 1

        sale_ledger_count = await verify_session.scalar(
            select(func.count(StockLedger.id)).where(StockLedger.reference_type == "sale")
        )
        assert sale_ledger_count == 1
