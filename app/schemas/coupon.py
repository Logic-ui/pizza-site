from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CouponValidateRequest(BaseModel):
    code: str
    subtotal: float = Field(..., ge=0)

class CouponValidateResponse(BaseModel):
    valid: bool
    code: str
    discount_amount: float
    message: str

class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = ""
    discount_type: str = "percent"  # 'percent' or 'fixed'
    discount_value: float = Field(..., gt=0)
    min_order_amount: float = 0.0
    max_discount: Optional[float] = None
    usage_limit: int = 1000
    is_active: bool = True
    valid_until: Optional[datetime] = None

class CouponOut(CouponCreate):
    id: int
    times_used: int
    created_at: datetime
    class Config:
        from_attributes = True
