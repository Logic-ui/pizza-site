"""
Backward compatibility layer for app.models.
Re-exports all modern modular models from app.models package.
"""
from .models import (
    Base,
    User,
    Category,
    Crust,
    Topping,
    MenuItem,
    Pizza,
    Order,
    OrderItem,
    OrderItemTopping,
    Coupon,
    Review,
    RestaurantSetting,
)

__all__ = [
    "Base",
    "User",
    "Category",
    "Crust",
    "Topping",
    "MenuItem",
    "Pizza",
    "Order",
    "OrderItem",
    "OrderItemTopping",
    "Coupon",
    "Review",
    "RestaurantSetting",
]