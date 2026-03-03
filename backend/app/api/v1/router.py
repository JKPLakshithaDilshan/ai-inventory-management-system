"""Main API v1 router."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    products,
    suppliers,
    purchases,
    sales,
    audit_logs,
    dashboard,
)

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["Suppliers"])
api_router.include_router(purchases.router, prefix="/purchases", tags=["Purchases"])
api_router.include_router(sales.router, prefix="/sales", tags=["Sales"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
