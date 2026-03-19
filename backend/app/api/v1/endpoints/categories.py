"""Category management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.common import MessageResponse, PaginationResponse
from app.schemas.product import CategoryCreate, CategoryResponse, CategoryUpdate
from app.services.category_service import CategoryService

router = APIRouter()


@router.get("", response_model=PaginationResponse[CategoryResponse])
async def list_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    search: str = Query(None),
    parent_id: int = Query(None, ge=1),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retrieve categories with pagination and optional filters."""
    category_service = CategoryService(db)
    categories, total = await category_service.get_multi(
        skip=skip,
        limit=limit,
        search=search,
        parent_id=parent_id,
    )

    total_pages = (total + limit - 1) // limit
    page = skip // limit + 1

    return PaginationResponse(
        items=categories,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a category."""
    category_service = CategoryService(db)

    existing = await category_service.get_by_name(category_in.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name already exists",
        )

    if category_in.parent_id is not None:
        parent = await category_service.get_by_id(category_in.parent_id)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent category not found",
            )

    category = await category_service.create(category_in)
    return category


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get category by ID."""
    category_service = CategoryService(db)
    category = await category_service.get_by_id(category_id)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    return category


@router.put("/{category_id}", response_model=CategoryResponse)
@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_in: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update category."""
    category_service = CategoryService(db)
    category = await category_service.get_by_id(category_id)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    if category_in.name and category_in.name.strip().lower() != category.name.strip().lower():
        existing = await category_service.get_by_name(category_in.name)
        if existing and existing.id != category.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category with this name already exists",
            )

    if category_in.parent_id is not None:
        if category_in.parent_id == category.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category cannot be its own parent",
            )

        parent = await category_service.get_by_id(category_in.parent_id)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent category not found",
            )

    updated = await category_service.update(category, category_in)
    return updated


@router.delete("/{category_id}", response_model=MessageResponse)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete category when there are no dependent products or subcategories."""
    category_service = CategoryService(db)
    category = await category_service.get_by_id(category_id)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    blockers = await category_service.get_delete_blockers(category_id)
    blocking_items = {k: v for k, v in blockers.items() if v > 0}
    if blocking_items:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Category cannot be deleted because related records exist",
                "blockers": blocking_items,
            },
        )

    await category_service.delete(category)
    return MessageResponse(message="Category deleted successfully")
