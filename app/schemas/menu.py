from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = ""
    display_order: int = 0
    is_active: bool = True

class CategoryOut(CategoryBase):
    id: int
    class Config:
        from_attributes = True

class CrustBase(BaseModel):
    name: str
    description: Optional[str] = ""
    price_modifier: float = 0.0
    is_available: bool = True

class CrustOut(CrustBase):
    id: int
    class Config:
        from_attributes = True

class ToppingBase(BaseModel):
    name: str
    category: str = "Veggie"
    price: float = 1.50
    is_available: bool = True

class ToppingOut(ToppingBase):
    id: int
    class Config:
        from_attributes = True

class MenuItemBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = ""
    base_price: float = Field(..., gt=0)
    category_id: int
    image_filename: Optional[str] = "default_pizza.jpeg"
    is_vegetarian: bool = False
    is_spicy: bool = False
    is_featured: bool = False
    is_available: bool = True

class MenuItemCreate(MenuItemBase):
    pass

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    category_id: Optional[int] = None
    image_filename: Optional[str] = None
    is_vegetarian: Optional[bool] = None
    is_spicy: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_available: Optional[bool] = None

class MenuItemOut(MenuItemBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True
