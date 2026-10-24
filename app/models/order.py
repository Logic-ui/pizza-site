from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..core.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4())[:8].upper())
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Customer details
    customer_name = Column(String(100), nullable=False)
    customer_email = Column(String(100), nullable=False)
    customer_phone = Column(String(30), nullable=True)
    address = Column(Text, nullable=False)
    delivery_notes = Column(Text, nullable=True)
    
    # Financials
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    tip_amount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    coupon_code = Column(String(50), nullable=True)
    
    # Loyalty & Rewards
    points_earned = Column(Integer, default=0)
    points_redeemed = Column(Integer, default=0)
    
    # Order & Payment States
    order_type = Column(String(20), default="delivery")  # 'delivery' or 'pickup'
    payment_method = Column(String(30), default="cod")  # 'cod', 'card', 'online'
    payment_status = Column(String(30), default="pending")  # 'pending', 'paid', 'refunded'
    status = Column(String(50), default="Received")  # 'Received', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=True)
    pizza_id = Column(Integer, nullable=True)  # legacy column support
    crust_id = Column(Integer, ForeignKey("crusts.id"), nullable=True)
    
    size = Column(String(20), default="Regular")  # Small, Medium, Large, Regular
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=False, default=0.0)  # legacy column & price
    unit_price = Column(Float, nullable=True, default=0.0)
    line_total = Column(Float, default=0.0)
    special_instructions = Column(String(200), nullable=True)

    # Relationships
    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem", foreign_keys=[menu_item_id], back_populates="order_items")
    crust = relationship("Crust")
    toppings = relationship("OrderItemTopping", back_populates="order_item", cascade="all, delete-orphan")

    @property
    def pizza(self):
        return self.menu_item


class OrderItemTopping(Base):
    __tablename__ = "order_item_toppings"

    id = Column(Integer, primary_key=True, index=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    topping_id = Column(Integer, ForeignKey("toppings.id"), nullable=True)
    topping_name = Column(String(50), nullable=False)
    price = Column(Float, default=0.0)

    order_item = relationship("OrderItem", back_populates="toppings")
    topping = relationship("Topping")
