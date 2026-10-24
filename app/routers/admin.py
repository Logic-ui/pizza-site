from fastapi import APIRouter, Depends, HTTPException, Request, Form, UploadFile, File, status
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func
from pathlib import Path
from datetime import datetime, timedelta
import shutil
import os
from typing import Optional

from ..core.database import get_db
from ..core.dependencies import require_role
from ..models.user import User
from ..models.menu import Category, MenuItem, Crust, Topping
from ..models.order import Order, OrderItem
from ..models.coupon import Coupon
from ..models.setting import RestaurantSetting

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])
BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")
UPLOAD_DIR = BASE_DIR / "static" / "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ----------------- ADMIN DASHBOARD & ANALYTICS -----------------

@router.get("", response_class=HTMLResponse)
def admin_dashboard(
    request: Request,
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    today = datetime.utcnow().date()
    start_of_today = datetime.combine(today, datetime.min.time())
    start_of_month = datetime(today.year, today.month, 1)

    # Key Metrics
    total_orders_today = db.query(Order).filter(Order.created_at >= start_of_today).count()
    revenue_today = db.query(func.sum(Order.total)).filter(Order.created_at >= start_of_today).scalar() or 0.0
    revenue_month = db.query(func.sum(Order.total)).filter(Order.created_at >= start_of_month).scalar() or 0.0
    active_customers = db.query(User).filter_by(role="customer").count()

    # Recent Orders
    recent_orders = db.query(Order).order_by(Order.created_at.desc()).limit(8).all()

    # Best-selling items calculation
    best_sellers = (
        db.query(
            MenuItem.name,
            func.sum(OrderItem.quantity).label("total_sold"),
            func.sum(OrderItem.line_total).label("total_revenue")
        )
        .join(OrderItem, MenuItem.id == OrderItem.menu_item_id)
        .group_by(MenuItem.id)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
        .all()
    )

    return templates.TemplateResponse(
        "admin/dashboard.html",
        {
            "request": request,
            "user": current_user,
            "total_orders_today": total_orders_today,
            "revenue_today": revenue_today,
            "revenue_month": revenue_month,
            "active_customers": active_customers,
            "recent_orders": recent_orders,
            "best_sellers": best_sellers
        }
    )


# ----------------- ORDERS MANAGEMENT -----------------

@router.get("/orders", response_class=HTMLResponse)
def admin_orders(
    request: Request,
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    query = db.query(Order)
    if status_filter and status_filter != "all":
        query = query.filter(Order.status == status_filter)
    orders = query.order_by(Order.created_at.desc()).all()

    return templates.TemplateResponse(
        "admin/orders.html",
        {
            "request": request,
            "user": current_user,
            "orders": orders,
            "current_filter": status_filter or "all"
        }
    )


@router.post("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status: str = Form(...),
    payment_status: Optional[str] = Form(None),
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status
    if payment_status:
        order.payment_status = payment_status
    db.commit()
    return RedirectResponse(url="/admin/orders", status_code=303)


# ----------------- MENU MANAGEMENT -----------------

@router.get("/menu", response_class=HTMLResponse)
@router.get("/pizzas", response_class=HTMLResponse)  # Backward compatible alias
def admin_menu(
    request: Request,
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    items = db.query(MenuItem).order_by(MenuItem.category_id, MenuItem.name).all()
    categories = db.query(Category).all()
    toppings = db.query(Topping).all()
    crusts = db.query(Crust).all()

    return templates.TemplateResponse(
        "admin/menu_items.html",
        {
            "request": request,
            "user": current_user,
            "items": items,
            "pizzas": items,  # alias for backward compatibility
            "categories": categories,
            "toppings": toppings,
            "crusts": crusts
        }
    )


@router.get("/menu/new", response_class=HTMLResponse)
@router.get("/pizzas/new", response_class=HTMLResponse)
def new_menu_item_form(
    request: Request,
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    categories = db.query(Category).all()
    return templates.TemplateResponse(
        "admin/menu_form.html",
        {"request": request, "user": current_user, "item": None, "pizza": None, "categories": categories}
    )


@router.post("/menu/new")
@router.post("/pizzas/new")
def create_menu_item(
    request: Request,
    name: str = Form(...),
    description: str = Form(""),
    base_price: float = Form(None),
    price: Optional[float] = Form(None),  # backward compatibility alias
    category_id: int = Form(1),
    is_vegetarian: bool = Form(False),
    is_spicy: bool = Form(False),
    image: UploadFile = File(None),
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    actual_price = base_price if base_price is not None else (price or 9.99)
    filename = "default_pizza.jpeg"
    if image and image.filename:
        filename = os.path.basename(image.filename)
        filepath = UPLOAD_DIR / filename
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

    slug = name.lower().replace(" ", "-").replace("'", "")
    item = MenuItem(
        name=name.strip(),
        slug=slug,
        description=description.strip(),
        base_price=actual_price,
        category_id=category_id,
        image_filename=filename,
        is_vegetarian=is_vegetarian,
        is_spicy=is_spicy,
        is_available=True
    )
    db.add(item)
    db.commit()
    return RedirectResponse(url="/admin/menu", status_code=303)


@router.get("/menu/edit/{item_id}", response_class=HTMLResponse)
@router.get("/pizzas/edit/{item_id}", response_class=HTMLResponse)
def edit_menu_item_form(
    item_id: int,
    request: Request,
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    item = db.query(MenuItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    categories = db.query(Category).all()
    return templates.TemplateResponse(
        "admin/menu_form.html",
        {"request": request, "user": current_user, "item": item, "pizza": item, "categories": categories}
    )


@router.post("/menu/edit/{item_id}")
@router.post("/pizzas/edit/{item_id}")
def update_menu_item(
    item_id: int,
    request: Request,
    name: str = Form(...),
    description: str = Form(""),
    base_price: float = Form(None),
    price: Optional[float] = Form(None),
    category_id: int = Form(1),
    is_vegetarian: bool = Form(False),
    is_spicy: bool = Form(False),
    image: UploadFile = File(None),
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    item = db.query(MenuItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    actual_price = base_price if base_price is not None else (price or item.base_price)
    item.name = name.strip()
    item.description = description.strip()
    item.base_price = actual_price
    item.category_id = category_id
    item.is_vegetarian = is_vegetarian
    item.is_spicy = is_spicy

    if image and image.filename:
        filename = os.path.basename(image.filename)
        filepath = UPLOAD_DIR / filename
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        item.image_filename = filename

    db.commit()
    return RedirectResponse(url="/admin/menu", status_code=303)


@router.post("/menu/toggle/{item_id}")
def toggle_menu_item_availability(
    item_id: int,
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    item = db.query(MenuItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_available = not item.is_available
    db.commit()
    return RedirectResponse(url="/admin/menu", status_code=303)


@router.post("/menu/delete/{item_id}")
@router.post("/pizzas/delete/{item_id}")
def delete_menu_item(
    item_id: int,
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    item = db.query(MenuItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return RedirectResponse(url="/admin/menu", status_code=303)


# ----------------- COUPONS & SETTINGS -----------------

@router.get("/coupons", response_class=HTMLResponse)
def admin_coupons(
    request: Request,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    coupons = db.query(Coupon).all()
    settings_list = db.query(RestaurantSetting).all()
    return templates.TemplateResponse(
        "admin/coupons.html",
        {"request": request, "user": current_user, "coupons": coupons, "settings": settings_list}
    )


@router.post("/coupons/new")
def create_coupon(
    code: str = Form(...),
    description: str = Form(""),
    discount_type: str = Form("percent"),
    discount_value: float = Form(...),
    min_order_amount: float = Form(0.0),
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    code_clean = code.strip().upper()
    existing = db.query(Coupon).filter_by(code=code_clean).first()
    if not existing:
        coupon = Coupon(
            code=code_clean,
            description=description.strip(),
            discount_type=discount_type,
            discount_value=discount_value,
            min_order_amount=min_order_amount,
            is_active=True
        )
        db.add(coupon)
        db.commit()
    return RedirectResponse(url="/admin/coupons", status_code=303)


@router.post("/coupons/toggle/{coupon_id}")
def toggle_coupon(
    coupon_id: int,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    coupon = db.query(Coupon).filter_by(id=coupon_id).first()
    if coupon:
        coupon.is_active = not coupon.is_active
        db.commit()
    return RedirectResponse(url="/admin/coupons", status_code=303)


# ----------------- CUSTOMER MANAGEMENT -----------------

@router.get("/customers", response_class=HTMLResponse)
def admin_customers(
    request: Request,
    current_user: User = Depends(require_role(["admin", "staff"])),
    db: Session = Depends(get_db)
):
    customers = db.query(User).order_by(User.created_at.desc()).all()
    return templates.TemplateResponse(
        "admin/customers.html",
        {"request": request, "user": current_user, "customers": customers}
    )
