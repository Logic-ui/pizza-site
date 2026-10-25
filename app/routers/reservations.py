from fastapi import APIRouter, Depends, HTTPException, Request, Form, status
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime, date
from typing import Optional

from ..core.database import get_db
from ..core.dependencies import get_current_user_optional, require_role
from ..models.reservation import Reservation
from ..models.user import User

router = APIRouter(tags=["Table Reservations"])
BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")


@router.get("/reserve", response_class=HTMLResponse)
def reservation_page(request: Request, db: Session = Depends(get_db)):
    """Render the table reservation booking page."""
    user = get_current_user_optional(request, db)
    today_str = date.today().isoformat()
    return templates.TemplateResponse(
        "reserve.html",
        {
            "request": request,
            "user": user,
            "today_str": today_str
        }
    )


@router.post("/reserve", response_class=HTMLResponse)
def submit_reservation(
    request: Request,
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    customer_phone: str = Form(...),
    reservation_date: str = Form(...),
    reservation_time: str = Form(...),
    party_size: int = Form(2),
    seating_area: str = Form("Main Dining Room"),
    occasion: str = Form("Casual Dining"),
    special_requests: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Handle reservation submission."""
    user = get_current_user_optional(request, db)

    reservation = Reservation(
        user_id=user.id if user else None,
        customer_name=customer_name.strip(),
        customer_email=customer_email.strip(),
        customer_phone=customer_phone.strip(),
        reservation_date=reservation_date.strip(),
        reservation_time=reservation_time.strip(),
        party_size=max(1, party_size),
        seating_area=seating_area.strip(),
        occasion=occasion.strip() if occasion else "Casual Dining",
        special_requests=special_requests.strip() if special_requests else None,
        status="Confirmed"
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    return templates.TemplateResponse(
        "reserve_success.html",
        {
            "request": request,
            "user": user,
            "reservation": reservation
        }
    )


# Admin Reservation Routes
@router.get("/admin/reservations", response_class=HTMLResponse)
def admin_reservations(
    request: Request,
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    """Admin table reservations dashboard."""
    query = db.query(Reservation)
    if status_filter and status_filter != "all":
        query = query.filter(Reservation.status == status_filter)
    
    reservations = query.order_by(Reservation.reservation_date.asc(), Reservation.reservation_time.asc()).all()
    
    return templates.TemplateResponse(
        "admin/reservations.html",
        {
            "request": request,
            "user": current_user,
            "reservations": reservations,
            "current_filter": status_filter or "all"
        }
    )


@router.post("/admin/reservations/{reservation_id}/status")
def update_reservation_status(
    reservation_id: int,
    status: str = Form(...),
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    """Update status of a reservation (Confirmed, Seated, Completed, Cancelled)."""
    res = db.query(Reservation).filter_by(id=reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    valid_statuses = ["Confirmed", "Seated", "Completed", "Cancelled"]
    if status in valid_statuses:
        res.status = status
        db.commit()
    
    return RedirectResponse(url="/admin/reservations", status_code=status.HTTP_302_FOUND)
