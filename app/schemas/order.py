from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class CartItemToppingSchema(BaseModel):
    topping_id: int
    topping_name: str
    price: float

class CartItemSchema(BaseModel):
    pizza_id: int  # Menu item id
    name: str
    price: float
    quantity: int = Field(1, ge=1)
    size: str = "Regular"
    crust_id: Optional[int] = None
    crust_name: Optional[str] = None
    crust_price: float = 0.0
    toppings: List[CartItemToppingSchema] = []
    special_instructions: Optional[str] = None

class OrderCreateSchema(BaseModel):
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    address: str
    delivery_notes: Optional[str] = None
    payment_method: str = "cod"
    coupon_code: Optional[str] = None
    cart: List[CartItemSchema]

class OrderStatusUpdateSchema(BaseModel):
    status: str
    payment_status: Optional[str] = None

class OrderItemOut(BaseModel):
    id: int
    menu_item_id: int
    size: str
    quantity: int
    unit_price: float
    line_total: float
    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: int
    order_number: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str]
    address: str
    subtotal: float
    tax: float
    delivery_fee: float
    discount: float
    total: float
    status: str
    payment_method: str
    payment_status: str
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True
