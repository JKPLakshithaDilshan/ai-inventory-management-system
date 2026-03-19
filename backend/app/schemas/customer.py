"""Customer schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class CustomerBase(BaseModel):
    """Base customer schema."""

    customer_code: str = Field(..., min_length=1, max_length=50)
    full_name: str = Field(..., min_length=1, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    customer_type: str = Field(..., pattern="^(individual|business)$")
    credit_limit: float = Field(default=0.0, ge=0)
    is_active: bool = True
    notes: Optional[str] = None

    @field_validator("customer_code", mode="before")
    @classmethod
    def normalize_customer_code(cls, value: str) -> str:
        if isinstance(value, str):
            return value.strip().upper()
        return value


class CustomerCreate(CustomerBase):
    """Schema for creating a customer."""


class CustomerUpdate(BaseModel):
    """Schema for partially updating a customer."""

    customer_code: Optional[str] = Field(None, min_length=1, max_length=50)
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    customer_type: Optional[str] = Field(
        None, pattern="^(individual|business)$"
    )
    credit_limit: Optional[float] = Field(default=None, ge=0)
    is_active: Optional[bool] = None
    notes: Optional[str] = None

    @field_validator("customer_code", mode="before")
    @classmethod
    def normalize_customer_code(cls, value: Optional[str]) -> Optional[str]:
        if isinstance(value, str):
            return value.strip().upper()
        return value


class CustomerResponse(CustomerBase):
    """Customer response schema."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerSummaryResponse(BaseModel):
    """Customer detail summary schema."""

    customer: CustomerResponse
    total_orders: int
    total_purchase_value: float
    recent_sales: list[dict]
