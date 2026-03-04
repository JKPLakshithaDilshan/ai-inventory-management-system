#!/bin/bash
# PostgreSQL Instance Detection Script for macOS
# This script helps identify which PostgreSQL instance FastAPI is connecting to

echo "=" 
echo "PostgreSQL Instance Detection (macOS)"
echo "=================================================================="
echo ""

# 1. Check for running PostgreSQL processes
echo "1️⃣  RUNNING POSTGRESQL PROCESSES:"
echo "----------------------------------"
ps aux | grep -i postgres | grep -v grep || echo "No PostgreSQL processes found"
echo ""

# 2. Check PostgreSQL installation locations
echo "2️⃣  POSTGRESQL INSTALLATIONS:"
echo "-----------------------------"

# Homebrew Postgres
if [ -d "/opt/homebrew/opt/postgresql@14" ] || [ -d "/opt/homebrew/opt/postgresql@15" ] || [ -d "/opt/homebrew/opt/postgresql@16" ] || [ -d "/usr/local/opt/postgresql" ]; then
    echo "✅ Homebrew PostgreSQL detected:"
    for version in 14 15 16; do
        if [ -d "/opt/homebrew/opt/postgresql@$version" ]; then
            echo "   - PostgreSQL $version: /opt/homebrew/opt/postgresql@$version"
        fi
    done
    if [ -d "/usr/local/opt/postgresql" ]; then
        echo "   - PostgreSQL (latest): /usr/local/opt/postgresql"
    fi
else
    echo "❌ No Homebrew PostgreSQL found"
fi
echo ""

# Postgres.app
if [ -d "/Applications/Postgres.app" ]; then
    echo "✅ Postgres.app detected: /Applications/Postgres.app"
else
    echo "❌ Postgres.app not found"
fi
echo ""

# EnterpriseDB PostgreSQL
if [ -d "/Library/PostgreSQL" ]; then
    echo "✅ EnterpriseDB PostgreSQL detected:"
    ls -d /Library/PostgreSQL/* 2>/dev/null | while read dir; do
        echo "   - $(basename $dir)"
    done
else
    echo "❌ EnterpriseDB PostgreSQL not found"
fi
echo ""

# PostgreSQL from Applications folder
if [ -d "/Applications/PostgreSQL"* ]; then
    echo "✅ PostgreSQL in Applications:"
    ls -d /Applications/PostgreSQL* 2>/dev/null | while read dir; do
        echo "   - $(basename "$dir")"
    done
else
    echo "❌ No PostgreSQL in Applications folder"
fi
echo ""

# 3. Check command availability
echo "3️⃣  POSTGRESQL COMMAND AVAILABILITY:"
echo "------------------------------------"

if command -v psql &> /dev/null; then
    echo "✅ psql: $(which psql)"
    psql --version
else
    echo "❌ psql not found in PATH"
fi
echo ""

if command -v postgres &> /dev/null; then
    echo "✅ postgres: $(which postgres)"
else
    echo "❌ postgres not found in PATH"
fi
echo ""

if command -v createdb &> /dev/null; then
    echo "✅ createdb: $(which createdb)"
else
    echo "❌ createdb not found in PATH"
fi
echo ""

# 4. Check for PostgreSQL listening ports
echo "4️⃣  POSTGRESQL LISTENING ON PORTS:"
echo "-----------------------------------"
lsof -i :5432 2>/dev/null | grep LISTEN || echo "No PostgreSQL listening on default port 5432"
echo ""

# 5. Test connection to localhost:5432
echo "5️⃣  CONNECTION TEST TO localhost:5432:"
echo "---------------------------------------"
if command -v nc &> /dev/null; then
    if nc -z localhost 5432 2>/dev/null; then
        echo "✅ Port 5432 is open and accepting connections"
    else
        echo "❌ Cannot connect to port 5432"
    fi
else
    echo "⚠️  netcat (nc) not available for port testing"
fi
echo ""

# 6. Check pg_hba.conf locations
echo "6️⃣  POSTGRESQL CONFIGURATION FILES:"
echo "------------------------------------"
find /Library/PostgreSQL -name "pg_hba.conf" 2>/dev/null | while read file; do
    echo "   - $file"
done
find /opt/homebrew/var/postgres* -name "pg_hba.conf" 2>/dev/null | while read file; do
    echo "   - $file"
done
find /usr/local/var/postgres* -name "pg_hba.conf" 2>/dev/null | while read file; do
    echo "   - $file"
done
find ~/Library/Application\ Support/Postgres -name "pg_hba.conf" 2>/dev/null | while read file; do
    echo "   - $file"
done
echo ""

# 7. Read from .env file
echo "7️⃣  CURRENT FASTAPI CONFIGURATION (.env):"
echo "------------------------------------------"
if [ -f ".env" ]; then
    echo "POSTGRES_SERVER: $(grep '^POSTGRES_SERVER=' .env | cut -d'=' -f2-)"
    echo "POSTGRES_PORT: $(grep '^POSTGRES_PORT=' .env | cut -d'=' -f2-)"
    echo "POSTGRES_USER: $(grep '^POSTGRES_USER=' .env | cut -d'=' -f2-)"
    echo "POSTGRES_DB: $(grep '^POSTGRES_DB=' .env | cut -d'=' -f2-)"
    echo "POSTGRES_PASSWORD: ******* (hidden)"
else
    echo "❌ .env file not found"
fi
echo ""

# 8. Recommendations
echo "8️⃣  CONNECTION GUIDE:"
echo "---------------------"
echo "To connect to the SAME instance as pgAdmin:"
echo ""
echo "1. Open pgAdmin and check your server connection properties:"
echo "   - Right-click your server → Properties → Connection"
echo "   - Note the Host, Port, Username, and Database"
echo ""
echo "2. Match those settings in your .env file:"
echo "   POSTGRES_SERVER=<host from pgAdmin>"
echo "   POSTGRES_PORT=<port from pgAdmin>"
echo "   POSTGRES_USER=<username from pgAdmin>"
echo "   POSTGRES_DB=ai_inventory_db"
echo "   POSTGRES_PASSWORD=<your password>"
echo ""
echo "3. If using EnterpriseDB PostgreSQL 16 (detected):"
echo "   - Default host: localhost"
echo "   - Default port: 5432"
echo "   - Default user: postgres"
echo "   - Password: Set during installation"
echo ""
echo "4. Test connection with psql:"
if [ -f "/Applications/PostgreSQL 16/bin/psql" ]; then
    echo "   /Applications/PostgreSQL\\ 16/bin/psql -U postgres -d ai_inventory_db"
fi
echo ""
echo "=================================================================="
