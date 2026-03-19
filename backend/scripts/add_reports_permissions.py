"""Add reports permissions."""
import asyncio
import asyncpg


async def add_permissions():
    conn = await asyncpg.connect(
        host='localhost',
        database='ai_inventory_db',
        user='postgres',
        password='Lazi200423'
    )
    
    try:
        # Add reports permissions
        permissions = [
            ('reports:view', 'reports', 'view', 'View reports'),
            ('reports:export', 'reports', 'export', 'Export reports to CSV'),
        ]
        
        for name, resource, action, description in permissions:
            await conn.execute('''
                INSERT INTO permissions (name, resource, action, description)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (name) DO NOTHING
            ''', name, resource, action, description)
            print(f'✓ Permission {name} added')
        
        # Grant to ADMIN role
        admin_role = await conn.fetchrow('SELECT id FROM roles WHERE name = $1', 'ADMIN')
        if admin_role:
            for name, _, _, _ in permissions:
                await conn.execute('''
                    INSERT INTO role_permissions (role_id, permission_id)
                    SELECT $1, p.id
                    FROM permissions p
                    WHERE p.name = $2
                    ON CONFLICT DO NOTHING
                ''', admin_role['id'], name)
            print('✓ Permissions granted to ADMIN role')
        
    finally:
        await conn.close()


if __name__ == '__main__':
    asyncio.run(add_permissions())
