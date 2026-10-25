from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..core.database import Base

class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    reservation_code = Column(
        String(20),
        unique=True,
        index=True,
        default=lambda: f"RES-{uuid.uuid4().hex[:6].upper()}"
    )
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    customer_name = Column(String(100), nullable=False)
    customer_email = Column(String(100), nullable=False)
    customer_phone = Column(String(30), nullable=False)

    reservation_date = Column(String(20), nullable=False)  # YYYY-MM-DD
    reservation_time = Column(String(20), nullable=False)  # HH:MM
    party_size = Column(Integer, default=2, nullable=False)
    seating_area = Column(String(50), default="Main Dining Room", nullable=False)
    occasion = Column(String(50), default="Casual Dining", nullable=True)
    special_requests = Column(Text, nullable=True)

    status = Column(String(30), default="Confirmed", nullable=False)  # Confirmed, Seated, Completed, Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="reservations")
