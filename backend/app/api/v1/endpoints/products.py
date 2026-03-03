"""Product management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.schemas.common import MessageResponse, PaginationResponse
from app.services.product_service import ProductService

router = APIRouter()


@router.get("", response_model=PaginationResponse[ProductResponse])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: str = Query(None),
    category_id: int = Query(None),
    stock_status: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Retrieve products with pagination and filters.
    """
    product_service = ProductService(db)
    products, total = await product_service.get_multi(
        skip=skip,
        limit=limit,
        search=search,
        category_id=category_id,
        stock_status=stock_status
    )
    
    total_pages = (total + limit - 1) // limit
    page = skip // limit + 1
    
    return PaginationResponse(
        items=products,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create new product.
    """
    product_service = ProductService(db)
    
    # Check if SKU already exists
    existing_product = await product_service.get_by_sku(product_in.sku)
    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this SKU already exists"
        )
    
    product = await product_service.create(product_in)
    return product


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get product by ID.
    """
    product_service = ProductService(db)
    product = await product_service.get_by_id(product_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update product.
    """
    product_service = ProductService(db)
    product = await product_service.get_by_id(product_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    product = await product_service.update(product, product_in)
    return product


@router.delete("/{product_id}", response_model=MessageResponse)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Delete product.
    """
    product_service = ProductService(db)
    product = await product_service.get_by_id(product_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    await product_service.delete(product)
    return MessageResponse(message="Product deleted successfully")


@router.get("/low-stock/alerts", response_model=list[ProductResponse])
async def get_low_stock_products(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get products with low stock or out of stock.
    """
    product_service = ProductService(db)
    products = await product_service.get_low_stock_products()
    return products
