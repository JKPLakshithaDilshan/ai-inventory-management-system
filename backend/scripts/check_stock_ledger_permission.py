"""Check and grant stock_ledger permission to Admin role."""
import asyncio
import asyncpg


async def check_and_grant():
    conn = await asyncpg.connect(
        host='localhost',
        database='ai_inventory_db',
        user='postgres',
        password='Lazi200423'
    )
    
    try:
        # Check if AdminADMIN role exists
        admin_role = await conn.fetchrow('SELECT id, name FROM roles WHERE name = $1', 'ADMIN')
        if not admin_role:
            print('✗ ADMIN role not found')
            return
        
        print(f"✓ ADMIN role found: id={admin_role['id']}")
        
        # Check if permission exists
        permission = await conn.fetchrow('SELECT id, name FROM permissions WHERE name = $1', 'stock_ledger:view')
        if not permission:
            print('✗ stock_ledger:view permission not found')
            return
        
        print(f"✓ Permission found: id={permission['id']}")
        
        # Check if already granted
        existing = await conn.fetchrow('''
            SELECT * FROM role_permissions 
            WHERE role_id = $1 AND permission_id = $2
        ''', admin_role['id'], permission['id'])
        
        if existing:
            print('✓ Permission already granted to ADMIN role')
        else:
            # Grant permission
            await conn.execute('''
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES ($1, $2)
            ''', admin_role['id'], permission['id'])
            print('✓ Permission granted to ADMIN role')
        
    finally:
        await conn.close()


if __name__ == '__main__':
    asyncio.run(check_and_grant())
