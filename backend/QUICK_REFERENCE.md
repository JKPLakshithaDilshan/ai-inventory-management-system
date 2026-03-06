# Quick Reference: Database Configuration

## 🔗 Health Check Endpoints

Test your database connection anytime:

```bash
# Basic health check
curl http://127.0.0.1:8000/api/v1/health

# Database connection test
curl http://127.0.0.1:8000/api/v1/health/db

# Detailed health with stats
curl http://127.0.0.1:8000/api/v1/health/detailed
```

## 🔍 Diagnose PostgreSQL Issues

If you encounter connection problems:

```bash
cd backend
./check_postgres.sh
```

This will show:
- Which PostgreSQL instances are installed
- Which processes are running
- Port availability
- Configuration file locations

## 📝 Configuration (.env file)

Required settings:
```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
POSTGRES_DB=ai_inventory_db
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
```

## 🚀 Starting the Server

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Watch for these startup messages:
- ✅ Configuration loaded
- ✅ Database Configuration (shows masked URL)
- ✅ Database tables created/verified
- ✅ Application startup complete

## 🔐 Security Checklist

### Development ✓
- [x] Password stored in .env (not hardcoded)
- [x] Logging shows masked URLs
- [x] Health endpoints available

### Production ⚠️
Before deploying to production:
- [ ] Change SECRET_KEY to strong random value
- [ ] Use strong POSTGRES_PASSWORD
- [ ] Set ENVIRONMENT=production
- [ ] Set DEBUG=False
- [ ] Use environment variables (not .env file)
- [ ] Use Alembic for migrations (disable init_db)

## 🆘 Common Issues

### "Password authentication failed"
1. Check .env file has correct password
2. Run `./check_postgres.sh` to verify instance
3. Test with health endpoint: `curl http://127.0.0.1:8000/api/v1/health/db`

### "Database does not exist"
```bash
# Connect to postgres database and create it
/Applications/PostgreSQL\ 16/bin/psql -U postgres -d postgres
CREATE DATABASE ai_inventory_db;
\q
```

### ".env not loaded"
- Check file is at: `backend/.env`
- Verify no typos in variable names
- Check file permissions (should be readable)

## 📊 Monitoring

Use health endpoints for:
- **Kubernetes/Docker**: Readiness/liveness probes
- **CI/CD**: Pre-deployment checks
- **Monitoring**: Automated health checks
- **Debugging**: Quick connection verification

## 📖 Full Documentation

See `DATABASE_CONFIGURATION_AUDIT.md` for complete details on:
- All configuration changes
- Security improvements
- Validation rules
- Production setup guide
