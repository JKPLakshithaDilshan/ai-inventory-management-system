"""
Local development seed script.
Creates first admin user if database is empty.

Usage:
    cd backend
    source .venv/bin/activate
    python -m scripts.seed_admin
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path so we can import app
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select  # noqa: E402
from app.core.database import AsyncSessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.services.user_service import UserService  # noqa: E402
from app.schemas.user import UserCreate  # noqa: E402


async def main():
    """Create admin user if no users exist."""
    async with AsyncSessionLocal() as db:
        # Check if any users exist
        result = await db.execute(select(User).limit(1))
        existing_user = result.scalars().first()

        if existing_user:
            print("⚠️  Users already exist in database. Seeding skipped.")
            print(
                "   Existing user:"
                f" {existing_user.username} ({existing_user.email})"
            )
            return

        # Create admin user using UserService (handles password hashing)
        try:
            service = UserService(db)

            user_in = UserCreate(
                email=settings.FIRST_SUPERUSER_EMAIL,
                username="admin",
                full_name="Admin User",
                password=settings.FIRST_SUPERUSER_PASSWORD,
                is_active=True,
                is_superuser=True,
            )

            user = await service.create(user_in)
            await db.commit()
            await db.refresh(user)

            print("✅ Admin user created successfully!")
            print(f"   Email:    {user.email}")
            print(f"   Username: {user.username}")
            print(f"   Password: {settings.FIRST_SUPERUSER_PASSWORD}")
            print("\n💾 Test login:")
            print(
                "   curl -X POST"
                " 'http://127.0.0.1:8000/api/v1/auth/login' \\"
            )
            print(
                "     -H"
                " 'Content-Type: application/x-www-form-urlencoded' \\"
            )
            print(
                "     -d 'username=admin&password="
                f"{settings.FIRST_SUPERUSER_PASSWORD}'"
            )

        except Exception as e:
            print(f"❌ Error creating admin user: {e}")
            import traceback

            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
