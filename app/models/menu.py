from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    slug = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(200), default="")
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    items = relationship("MenuItem", back_populates="category", cascade="all, delete-orphan")


class Crust(Base):
    __tablename__ = "crusts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(150), default="")
    price_modifier = Column(Float, default=0.0)  # e.g., +2.00 for Stuffed Crust
    is_available = Column(Boolean, default=True)


class Topping(Base):
    __tablename__ = "toppings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    category = Column(String(30), default="Veggie")  # Cheese, Meat, Veggie, Sauce
    price = Column(Float, default=1.50)
    is_available = Column(Boolean, default=True)


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, default="")
    base_price = Column(Float, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    image_filename = Column(String(255), default="default_pizza.jpeg")
    is_vegetarian = Column(Boolean, default=False)
    is_spicy = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    category = relationship("Category", back_populates="items")
    order_items = relationship("OrderItem", back_populates="menu_item")
    reviews = relationship("Review", back_populates="menu_item", cascade="all, delete-orphan")

    @property
    def price(self) -> float:
        """Alias for base_price to preserve backward compatibility."""
        return self.base_price

    def image_url(self) -> str:
        """Return proper static URL for template display."""
        if not self.image_filename or self.image_filename == "default_pizza.jpeg":
            return "/static/uploads/default_pizza.jpeg"
        return f"/static/uploads/{self.image_filename}"

    def average_rating(self) -> float:
        if not self.reviews:
            return 5.0
        approved = [r.rating for r in self.reviews if r.is_approved]
        return round(sum(approved) / len(approved), 1) if approved else 5.0


# Backward compatibility for existing code targeting models.Pizza
Pizza = MenuItem
