"""Backfill stock ledger with baseline entries for existing products.

This script creates ADJUST ledger entries for all products that:
1. Have quantity > 0
2. Don't already have ledger entries

This establishes the initial baseline for stock ledger tracking.
For multi-warehouse setups, it creates ProductLocation entries for each product
at the main warehouse.

Usage:
    cd backend
    source .venv/bin/activate
    python scripts/backfill_stock_ledger.py
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.product_location import ProductLocation
from app.models.stock_ledger import StockLedger, StockTransactionType
from app.models.user import User


async def backfill_stock_ledger():
    """Create baseline ADJUST ledger entries for all existing products."""
    async with AsyncSessionLocal() as db:
        try:
            # Get default warehouse (or first active warehouse)
            warehouse_result = await db.execute(
                select(Warehouse).where(Warehouse.is_active == True).limit(1)
            )
            warehouse = warehouse_result.scalar_one_or_none()
            
            if not warehouse:
                print("❌ No active warehouse found. Run seed_warehouse.py first.")
                return
            
            print(f"📦 Using warehouse: {warehouse.name} (ID: {warehouse.id})")
            
            # Get admin user (or first user) for created_by
            user_result = await db.execute(select(User).limit(1))
            admin_user = user_result.scalar_one_or_none()
            
            if not admin_user:
                print("⚠️  No users found. Ledger entries will have NULL created_by.")
                admin_id = None
            else:
                admin_id = admin_user.id
                print(f"👤 Using user: {admin_user.username} (ID: {admin_id})")
            
            # Get all products
            products_result = await db.execute(select(Product))
            products = products_result.scalars().all()
            
            if not products:
                print("ℹ️  No products found. Nothing to backfill.")
                return
            
            print(f"\n📊 Found {len(products)} products")
            
            # Check if any ledger entries already exist
            ledger_count_result = await db.execute(select(func.count(StockLedger.id)))
            existing_ledger_count = ledger_count_result.scalar_one()
            
            if existing_ledger_count > 0:
                print(f"⚠️  WARNING: {existing_ledger_count} ledger entries already exist.")
                response = input("Continue anyway? (y/n): ")
                if response.lower() != 'y':
                    print("❌ Aborted.")
                    return
            
            # Process each product
            created_count = 0
            skipped_count = 0
            
            for product in products:
                # Check if product already has location at this warehouse
                location_result = await db.execute(
                    select(ProductLocation).where(
                        ProductLocation.product_id == product.id,
                        ProductLocation.warehouse_id == warehouse.id
                    )
                )
                location = location_result.scalar_one_or_none()
                
                if location:
                    # Location exists, check if it matches product quantity
                    if location.quantity != product.quantity:
                        print(f"⚠️  Product {product.sku}: location qty ({location.quantity}) != product qty ({product.quantity})")
                        # Update location to match product
                        old_qty = location.quantity
                        location.quantity = product.quantity
                        
                        # Create ledger entry for the adjustment
                        ledger = StockLedger(
                            product_id=product.id,
                            warehouse_id=warehouse.id,
                            type=StockTransactionType.ADJUST,
                            qty_change=product.quantity - old_qty,
                            qty_before=old_qty,
                            qty_after=product.quantity,
                            reference_type="backfill",
                            reference_id=None,
                            note=f"Baseline adjustment: corrected location qty from {old_qty} to {product.quantity}",
                            created_by=admin_id
                        )
                        db.add(ledger)
                        created_count += 1
                    else:
                        # Location matches, check if ledger exists
                        ledger_result = await db.execute(
                            select(StockLedger).where(
                                StockLedger.product_id == product.id,
                                StockLedger.warehouse_id == warehouse.id
                            ).limit(1)
                        )
                        existing_ledger = ledger_result.scalar_one_or_none()
                        
                        if not existing_ledger and product.quantity > 0:
                            # Create baseline ledger entry
                            ledger = StockLedger(
                                product_id=product.id,
                                warehouse_id=warehouse.id,
                                type=StockTransactionType.ADJUST,
                                qty_change=product.quantity,
                                qty_before=0,
                                qty_after=product.quantity,
                                reference_type="backfill",
                                reference_id=None,
                                note=f"Baseline stock: {product.quantity} units",
                                created_by=admin_id
                            )
                            db.add(ledger)
                            created_count += 1
                        else:
                            skipped_count += 1
                else:
                    # Create new location and ledger entry
                    location = ProductLocation(
                        product_id=product.id,
                        warehouse_id=warehouse.id,
                        quantity=product.quantity
                    )
                    db.add(location)
                    await db.flush()  # Get location ID
                    
                    if product.quantity > 0:
                        # Create baseline ledger entry
                        ledger = StockLedger(
                            product_id=product.id,
                            warehouse_id=warehouse.id,
                            type=StockTransactionType.ADJUST,
                            qty_change=product.quantity,
                            qty_before=0,
                            qty_after=product.quantity,
                            reference_type="backfill",
                            reference_id=None,
                            note=f"Baseline stock: {product.quantity} units",
                            created_by=admin_id
                        )
                        db.add(ledger)
                        created_count += 1
                    else:
                        skipped_count += 1
            
            # Commit all changes
            await db.commit()
            
            print(f"\n✅ Backfill complete!")
            print(f"   Created: {created_count} ledger entries")
            print(f"   Skipped: {skipped_count} products (zero quantity or already exists)")
            
        except Exception as e:
            print(f"\n❌ Error during backfill: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    print("=" * 60)
    print("STOCK LEDGER BACKFILL SCRIPT")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Create ProductLocation entries for all products at main warehouse")
    print("2. Create baseline ADJUST ledger entries for products with quantity > 0")
    print("3. Establish the initial stock ledger baseline\n")
    
    asyncio.run(backfill_stock_ledger())
