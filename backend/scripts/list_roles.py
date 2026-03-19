"""List all roles in database."""

import asyncio
import asyncpg


async def list_roles():
    conn = await asyncpg.connect(
        host="localhost",
        database="ai_inventory_db",
        user="postgres",
        password="Lazi200423",
    )

    try:
        roles = await conn.fetch("SELECT id, name FROM roles ORDER BY id")
        if roles:
            print(f"Found {len(roles)} roles:")
            for role in roles:
                print(f"  - id={role['id']}: {role['name']}")
        else:
            print("No roles found")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(list_roles())
