# AI Inventory Management System - Backend

Production-ready FastAPI backend for an AI-powered inventory management system with clean architecture.

## Features

- ✅ **FastAPI** - Modern, fast web framework
- ✅ **Async/Await** - Asynchronous database operations
- ✅ **SQLAlchemy 2.0** - Modern ORM with async support
- ✅ **Pydantic v2** - Data validation and settings management
- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **RBAC** - Role-based access control
- ✅ **Clean Architecture** - Separation of concerns (models, schemas, services, API)
- ✅ **Audit Logs** - Track all user actions
- ✅ **PostgreSQL** - Production-ready database
- ✅ **CORS** - Cross-origin resource sharing
- ✅ **Auto-generated API docs** - OpenAPI/Swagger

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── core/                   # Core functionality
│   │   ├── config.py          # Configuration management
│   │   ├── database.py        # Database connection
│   │   └── security.py        # Authentication & authorization
│   ├── models/                 # SQLAlchemy models
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── supplier.py
│   │   ├── purchase.py
│   │   ├── sale.py
│   │   └── audit_log.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── supplier.py
│   │   ├── purchase.py
│   │   ├── sale.py
│   │   ├── audit_log.py
│   │   └── common.py
│   ├── api/                    # API routes
│   │   └── v1/
│   │       ├── router.py      # Main router
│   │       └── endpoints/     # Endpoint modules
│   │           ├── auth.py
│   │           ├── users.py
│   │           ├── products.py
│   │           ├── suppliers.py
│   │           ├── purchases.py
│   │           ├── sales.py
│   │           ├── audit_logs.py
│   │           └── dashboard.py
│   └── services/               # Business logic
│       ├── base_service.py
│       ├── user_service.py
│       ├── product_service.py
│       ├── supplier_service.py
│       ├── purchase_service.py
│       ├── sale_service.py
│       ├── audit_service.py
│       └── dashboard_service.py
├── requirements.txt
├── .env.example
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis (optional, for caching)

### 1. Clone and Navigate

```bash
cd backend
```

### 2. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

**Important environment variables:**
- `SECRET_KEY`: Generate with `openssl rand -hex 32`
- `DATABASE_URI`: PostgreSQL connection string
- `POSTGRES_*`: Database credentials

### 5. Setup Database

Create a PostgreSQL database:

```bash
createdb inventory_db
```

Or using psql:

```sql
CREATE DATABASE inventory_db;
```

### 6. Run Database Migrations

For development (creates tables automatically):

```bash
python -m app.main
```

For production, use Alembic migrations:

```bash
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### 7. Create Super Admin (Optional)

The application will create a super admin user on first startup using the credentials in `.env`:

```
FIRST_SUPERUSER_EMAIL=admin@inventory.com
FIRST_SUPERUSER_PASSWORD=admin123
```

### 8. Run the Application

Development mode with auto-reload:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or use the main file:

```bash
python -m app.main
```

Production mode:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 9. Access API Documentation

- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc
- OpenAPI JSON: http://localhost:8000/api/v1/openapi.json

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login and get tokens
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/refresh` - Refresh access token

### Users
- `GET /api/v1/users` - List users (paginated)
- `POST /api/v1/users` - Create user (admin only)
- `GET /api/v1/users/{id}` - Get user by ID
- `PUT /api/v1/users/{id}` - Update user (admin only)
- `DELETE /api/v1/users/{id}` - Delete user (admin only)

### Products
- `GET /api/v1/products` - List products with filters
- `POST /api/v1/products` - Create product
- `GET /api/v1/products/{id}` - Get product by ID
- `PUT /api/v1/products/{id}` - Update product
- `DELETE /api/v1/products/{id}` - Delete product
- `GET /api/v1/products/low-stock/alerts` - Get low stock products

### Suppliers
- `GET /api/v1/suppliers` - List suppliers
- `POST /api/v1/suppliers` - Create supplier
- `GET /api/v1/suppliers/{id}` - Get supplier by ID
- `PUT /api/v1/suppliers/{id}` - Update supplier
- `DELETE /api/v1/suppliers/{id}` - Delete supplier

### Purchases
- `GET /api/v1/purchases` - List purchases
- `POST /api/v1/purchases` - Create purchase order
- `GET /api/v1/purchases/{id}` - Get purchase by ID
- `PUT /api/v1/purchases/{id}` - Update purchase
- `DELETE /api/v1/purchases/{id}` - Delete purchase (drafts only)
- `POST /api/v1/purchases/{id}/receive` - Receive purchase and update inventory

### Sales
- `GET /api/v1/sales` - List sales
- `POST /api/v1/sales` - Create sale/invoice
- `GET /api/v1/sales/{id}` - Get sale by ID
- `PUT /api/v1/sales/{id}` - Update sale
- `DELETE /api/v1/sales/{id}` - Delete sale (drafts only)

### Dashboard
- `GET /api/v1/dashboard/stats` - Get dashboard statistics
- `GET /api/v1/dashboard/recent-activities` - Get recent activities

### Audit Logs
- `GET /api/v1/audit-logs` - List audit logs with filters
- `GET /api/v1/audit-logs/{id}` - Get audit log by ID

## Testing

Run tests:

```bash
pytest
```

With coverage:

```bash
pytest --cov=app --cov-report=html
```

## Development

### Code Formatting

```bash
black app/
```

### Linting

```bash
flake8 app/
```

### Type Checking

```bash
mypy app/
```

## Production Deployment

### Using Docker

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t inventory-backend .
docker run -p 8000:8000 --env-file .env inventory-backend
```

### Using Docker Compose

See `docker-compose.yml` for full stack deployment with PostgreSQL and Redis.

### Environment Variables for Production

- Set `ENVIRONMENT=production`
- Set `DEBUG=False`
- Use a strong `SECRET_KEY`
- Configure proper CORS origins
- Use a production database
- Enable HTTPS
- Set up proper logging
- Configure rate limiting

## Security Considerations

1. **Change default credentials** - Update `FIRST_SUPERUSER_PASSWORD`
2. **Use strong SECRET_KEY** - Generate with `openssl rand -hex 32`
3. **Enable HTTPS** - Use reverse proxy (nginx/traefik)
4. **Configure CORS** - Restrict allowed origins
5. **Database security** - Use strong passwords, enable SSL
6. **Rate limiting** - Implement rate limiting middleware
7. **Input validation** - Pydantic handles this automatically
8. **SQL injection** - SQLAlchemy ORM prevents this

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.
