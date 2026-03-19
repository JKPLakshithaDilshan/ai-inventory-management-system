"""Seed sample audit logs for testing."""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timedelta
import random

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal  # noqa: E402
from app.services.audit_service import AuditService  # noqa: E402
from app.models.user import User  # noqa: E402
from sqlalchemy import select  # noqa: E402


async def seed_audit_logs():
    """Seed sample audit logs."""
    async with AsyncSessionLocal() as db:
        print("🔍 Finding users...")

        # Get some users
        result = await db.execute(select(User).limit(3))
        users = list(result.scalars().all())

        if not users:
            print("⚠️  No users found. Please seed users first.")
            return

        print(f"✓ Found {len(users)} users")

        audit_service = AuditService(db)

        # Sample data
        actions = [
            ("create", "Created"),
            ("update", "Updated"),
            ("delete", "Deleted"),
            ("login", "Login"),
            ("logout", "Logout"),
        ]

        resource_types = [
            "product",
            "supplier",
            "purchase",
            "sale",
            "warehouse",
            "user",
            "stock_ledger",
        ]

        ip_addresses = [
            "192.168.1.100",
            "10.0.0.45",
            "172.16.0.23",
            "192.168.0.150",
        ]

        user_agents = [
            (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
                " AppleWebKit/537.36"
            ),
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        ]

        print("\n📝 Creating audit logs...")

        # Create logs for the past 7 days
        logs_created = 0
        now = datetime.utcnow()

        for day_offset in range(7):
            log_date = now - timedelta(days=day_offset)
            # 3-6 logs per day
            logs_per_day = random.randint(3, 6)

            for _ in range(logs_per_day):
                user = random.choice(users)
                action, action_verb = random.choice(actions)
                resource_type = random.choice(resource_types)
                resource_id = random.randint(1, 100)

                # Create description based on action
                description = (
                    f"{action_verb}"
                    f" {resource_type.replace('_', ' ')}"
                    f" #{resource_id}"
                )

                # Create old/new values for updates
                old_values = None
                new_values = None

                if action == "create":
                    new_values = {
                        "name": f"Sample {resource_type} {resource_id}",
                        "status": "active",
                        "created_at": log_date.isoformat(),
                    }
                elif action == "update":
                    old_values = {
                        "status": "pending",
                        "quantity": 100,
                    }
                    new_values = {
                        "status": "active",
                        "quantity": 150,
                    }
                elif action == "delete":
                    old_values = {
                        "name": f"Sample {resource_type} {resource_id}",
                        "status": "active",
                    }

                # Random time within the day
                log_time = log_date.replace(
                    hour=random.randint(8, 18),
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59),
                )

                # Create audit log
                log = await audit_service.create_log(
                    user_id=user.id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=(
                        resource_id
                        if action != "login" and action != "logout"
                        else None
                    ),
                    description=description,
                    old_values=old_values,
                    new_values=new_values,
                    ip_address=random.choice(ip_addresses),
                    user_agent=random.choice(user_agents),
                )

                # Manually set the created_at to the past date
                log.created_at = log_time

                logs_created += 1

        await db.commit()

        print(f"✓ Created {logs_created} audit logs")
        print("\n✅ Audit logs seeded successfully!")


async def main():
    """Main entry point."""
    print("=" * 50)
    print("Seeding Audit Logs")
    print("=" * 50)

    try:
        await seed_audit_logs()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
