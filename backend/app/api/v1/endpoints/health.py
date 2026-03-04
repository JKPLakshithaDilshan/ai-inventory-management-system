"""Health check endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.
    
    Returns:
        dict: Service status and version
    """
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }


@router.get("/health/db")
async def database_health_check(db: AsyncSession = Depends(get_db)):
    """
    Database health check endpoint.
    
    Tests the database connection by executing a simple query.
    
    Args:
        db: Database session dependency
        
    Returns:
        dict: Database connection status
        
    Raises:
        HTTPException: If database connection fails
    """
    try:
        # Execute a simple query to verify database connectivity
        result = await db.execute(text("SELECT 1 as health_check"))
        row = result.fetchone()
        
        if row and row[0] == 1:
            return {
                "db": "ok",
                "message": "Database connection successful",
                "database": settings.POSTGRES_DB,
                "host": settings.POSTGRES_SERVER,
                "port": settings.POSTGRES_PORT
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "db": "fail",
                    "error": "Database query returned unexpected result"
                }
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "db": "fail",
                "error": str(e),
                "message": "Database connection failed"
            }
        )


@router.get("/health/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    """
    Detailed health check with database statistics.
    
    Returns comprehensive system health information including
    database connectivity and basic statistics.
    
    Args:
        db: Database session dependency
        
    Returns:
        dict: Detailed health status
    """
    health_status = {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": "unknown",
            "host": settings.POSTGRES_SERVER,
            "port": settings.POSTGRES_PORT,
            "database": settings.POSTGRES_DB
        }
    }
    
    try:
        # Test basic connectivity
        await db.execute(text("SELECT 1"))
        health_status["database"]["status"] = "ok"
        
        # Get database version
        result = await db.execute(text("SELECT version()"))
        version = result.scalar()
        if version:
            health_status["database"]["version"] = version.split()[0:2]  # e.g., ['PostgreSQL', '16.0']
        
        # Get active connections count
        result = await db.execute(text("""
            SELECT count(*) 
            FROM pg_stat_activity 
            WHERE datname = :dbname
        """), {"dbname": settings.POSTGRES_DB})
        connections = result.scalar()
        health_status["database"]["active_connections"] = connections
        
    except Exception as e:
        health_status["database"]["status"] = "error"
        health_status["database"]["error"] = str(e)
        health_status["status"] = "degraded"
    
    return health_status
