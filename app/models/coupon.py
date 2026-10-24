from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime
from ..core.database import Base

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(200), default="")
    discount_type = Column(String(20), default="percent")  # 'percent' or 'fixed'
    discount_value = Column(Float, nullable=False)  # e.g., 15 for 15% or 5.0 for $5 off
    min_order_amount = Column(Float, default=0.0)
    max_discount = Column(Float, nullable=True)  # cap for percent discounts
    usage_limit = Column(Integer, default=1000)
    times_used = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    valid_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def is_valid_for(self, subtotal: float) -> tuple[bool, str]:
        if not self.is_active:
            return False, "This coupon is currently inactive."
        if self.valid_until and datetime.utcnow() > self.valid_until:
            return False, "This coupon has expired."
        if self.times_used >= self.usage_limit:
            return False, "This coupon usage limit has been reached."
        if subtotal < self.min_order_amount:
            return False, f"Minimum order amount of ${self.min_order_amount:.2f} required."
        return True, "Coupon valid"

    def calculate_discount(self, subtotal: float) -> float:
        if self.discount_type == "percent":
            amt = (self.discount_value / 100.0) * subtotal
            if self.max_discount and amt > self.max_discount:
                amt = self.max_discount
            return round(amt, 2)
        elif self.discount_type == "fixed":
            return round(min(self.discount_value, subtotal), 2)
        return 0.0
