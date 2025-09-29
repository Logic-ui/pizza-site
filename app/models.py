from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Pizza(Base):
    __tablename__ = "pizzas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, default="")
    price = Column(Float, nullable=False)
    image_filename = Column(String(255), default="default_pizza.jpeg")

    # relationship to OrderItem
    order_items = relationship("OrderItem", back_populates="pizza")

    def image_url(self):
        """Return the full static path for templates."""
        return f"/static/uploads/{self.image_filename}"


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(100), nullable=False)
    customer_email = Column(String(100), nullable=False)
    Contact_number = Column(String(15), nullable=False)
    address = Column(Text, nullable=False)
    total = Column(Float, default=0.0)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    # one-to-many relationship (Order → OrderItem)
    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"))
    pizza_id = Column(Integer, ForeignKey("pizzas.id"))   # link to Pizza table
    size = Column(String(20), default="Regular")
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=False)

    # relationships
    order = relationship("Order", back_populates="items")
    pizza = relationship("Pizza", back_populates="order_items")