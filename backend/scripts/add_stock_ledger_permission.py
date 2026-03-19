"""Add stock_ledger:view permission."""
import asyncio
import asyncpg


async def add_permission():
    conn = await asyncpg.connect(
        host='localhost',
        database='ai_inventory_db',
        user='postgres',
        password='Lazi200423'
    )
    
    try:
        # Insert permission if not exists
        await conn.execute('''
            INSERT INTO permissions (name, resource, action, description)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (name) DO NOTHING
        ''', 'stock_ledger:view', 'stock_ledger', 'view', 'View stock ledger entries')
        
        print('✓ Permission stock_ledger:view added')
        
        # Grant to admin role
        admin_role = await conn.fetchrow('SELECT id FROM roles WHERE name = $1', 'Admin')
        if admin_role:
            await conn.execute('''
                INSERT INTO role_permissions (role_id, permission_id)
                SELECT $1, p.id
                FROM permissions p
                WHERE p.name = $2
                ON CONFLICT DO NOTHING
            ''', admin_role['id'], 'stock_ledger:view')
            print('✓ Permission granted to Admin role')
        
    finally:
        await conn.close()


if __name__ == '__main__':
    asyncio.run(add_permission())
