from fastapi import APIRouter, Depends, HTTPException, Request, Form, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from pathlib import Path
import json
from typing import Optional

from ..core.database import get_db
from ..core.config import settings
from ..core.dependencies import get_current_user_optional, get_current_user
from ..models.order import Order, OrderItem, OrderItemTopping
from ..models.menu import MenuItem, Crust, Topping
from ..models.coupon import Coupon
from ..models.user import User

router = APIRouter(tags=["Orders & Tracking"])
BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")

# ----------------- COUPON VALIDATION API -----------------

@router.post("/api/coupons/validate")
def validate_coupon_api(
    code: str = Form(...),
    subtotal: float = Form(...),
    db: Session = Depends(get_db)
):
    code_clean = code.strip().upper()
    coupon = db.query(Coupon).filter_by(code=code_clean).first()
    if not coupon:
        return JSONResponse(
            status_code=400,
            content={"valid": False, "message": "Invalid coupon code."}
        )

    is_valid, msg = coupon.is_valid_for(subtotal)
    if not is_valid:
        return JSONResponse(
            status_code=400,
            content={"valid": False, "message": msg}
        )

    discount = coupon.calculate_discount(subtotal)
    return {
        "valid": True,
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "discount_amount": discount,
        "description": coupon.description,
        "message": f"Coupon applied: ${discount:.2f} savings!"
    }


# ----------------- ORDER SUBMISSION (CHECKOUT) -----------------

@router.post("/order", response_class=HTMLResponse)
async def create_order(
    request: Request,
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    address: str = Form(""),
    customer_phone: Optional[str] = Form(None),
    delivery_notes: Optional[str] = Form(None),
    order_type: str = Form("delivery"),
    tip_amount: float = Form(0.0),
    redeem_points: bool = Form(False),
    payment_method: str = Form("cod"),
    coupon_code: Optional[str] = Form(None),
    cart: str = Form(...),
    db: Session = Depends(get_db),
):
    user = get_current_user_optional(request, db)

    try:
        items = json.loads(cart)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid cart data format")

    if not items or len(items) == 0:
        return templates.TemplateResponse(
            "order_success.html",
            {"request": request, "error": "Your cart is empty. Please add items before placing an order.", "user": user}
        )

    # Calculate item totals & validate items
    subtotal = 0.0
    validated_order_items = []

    for it in items:
        pid = int(it.get("pizza_id") or it.get("id", 0))
        qty = max(1, int(it.get("quantity", 1)))
        size = it.get("size", "Regular")
        crust_id = it.get("crust_id")
        instructions = it.get("special_instructions")
        toppings_data = it.get("toppings", [])

        menu_item = db.query(MenuItem).filter_by(id=pid).first()
        if menu_item is None:
            continue

        # Base price calculation with size multipliers
        unit_price = menu_item.base_price
        if size == "Small":
            unit_price = round(menu_item.base_price * 0.85, 2)
        elif size == "Large":
            unit_price = round(menu_item.base_price * 1.35, 2)

        # Crust price modifier
        crust_obj = None
        if crust_id:
            crust_obj = db.query(Crust).filter_by(id=int(crust_id)).first()
            if crust_obj:
                unit_price += crust_obj.price_modifier

        # Toppings price modifier
        validated_toppings = []
        for top in toppings_data:
            tid = top.get("topping_id") or top.get("id")
            if tid:
                top_obj = db.query(Topping).filter_by(id=int(tid)).first()
                if top_obj:
                    unit_price += top_obj.price
                    validated_toppings.append(top_obj)

        line_total = round(unit_price * qty, 2)
        subtotal += line_total

        validated_order_items.append({
            "menu_item": menu_item,
            "crust": crust_obj,
            "size": size,
            "quantity": qty,
            "unit_price": unit_price,
            "line_total": line_total,
            "instructions": instructions,
            "toppings": validated_toppings
        })

    if not validated_order_items:
        return templates.TemplateResponse(
            "order_success.html",
            {"request": request, "error": "Selected items are currently unavailable.", "user": user}
        )

    # Coupon Discount
    coupon_discount = 0.0
    valid_coupon = None
    if coupon_code:
        coupon_code_clean = coupon_code.strip().upper()
        coupon = db.query(Coupon).filter_by(code=coupon_code_clean).first()
        if coupon:
            ok, _ = coupon.is_valid_for(subtotal)
            if ok:
                coupon_discount = coupon.calculate_discount(subtotal)
                valid_coupon = coupon
                coupon.times_used += 1

    # Loyalty Points Redemption ($5.00 off for 100 points)
    points_discount = 0.0
    points_redeemed = 0
    if redeem_points and user and user.loyalty_points >= 100:
        points_discount = 5.0
        points_redeemed = 100
        user.loyalty_points -= 100

    total_discount = round(coupon_discount + points_discount, 2)

    # Tax, Delivery fee & Driver Tip
    order_type_clean = "pickup" if order_type == "pickup" else "delivery"
    if order_type_clean == "pickup":
        delivery_fee = 0.0
    else:
        delivery_fee = settings.DELIVERY_FEE if subtotal < 50.0 else 0.0

    tip = max(0.0, float(tip_amount or 0.0))
    taxable_amount = max(0.0, subtotal - total_discount)
    tax = round(taxable_amount * settings.TAX_RATE, 2)
    grand_total = round(taxable_amount + tax + delivery_fee + tip, 2)

    # Loyalty Points Earned (10 points per dollar spent on subtotal)
    points_earned = int(subtotal * 10)
    if user:
        user.loyalty_points += points_earned

    # Fulfillment address fallback for pickup
    order_address = address.strip()
    if order_type_clean == "pickup" and not order_address:
        order_address = "Store Pickup: 142 Artisan Boulevard, Food District"

    # Create Order
    order = Order(
        user_id=user.id if user else None,
        customer_name=customer_name.strip(),
        customer_email=customer_email.strip(),
        customer_phone=customer_phone.strip() if customer_phone else None,
        address=order_address,
        delivery_notes=delivery_notes.strip() if delivery_notes else None,
        order_type=order_type_clean,
        subtotal=round(subtotal, 2),
        tax=tax,
        delivery_fee=delivery_fee,
        discount=total_discount,
        tip_amount=round(tip, 2),
        total=grand_total,
        coupon_code=valid_coupon.code if valid_coupon else None,
        points_earned=points_earned,
        points_redeemed=points_redeemed,
        payment_method=payment_method,
        payment_status="paid" if payment_method == "card" else "pending",
        status="Received"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Insert Order Items & Toppings
    for it_data in validated_order_items:
        db_item = OrderItem(
            order_id=order.id,
            menu_item_id=it_data["menu_item"].id,
            pizza_id=it_data["menu_item"].id,
            crust_id=it_data["crust"].id if it_data["crust"] else None,
            size=it_data["size"],
            quantity=it_data["quantity"],
            price=it_data["unit_price"],
            unit_price=it_data["unit_price"],
            line_total=it_data["line_total"],
            special_instructions=it_data["instructions"]
        )
        db.add(db_item)
        db.commit()
        db.refresh(db_item)

        for top_obj in it_data["toppings"]:
            db_top = OrderItemTopping(
                order_item_id=db_item.id,
                topping_id=top_obj.id,
                topping_name=top_obj.name,
                price=top_obj.price
            )
            db.add(db_top)

    db.commit()
    db.refresh(order)

    return templates.TemplateResponse(
        "order_success.html",
        {"request": request, "order": order, "user": user}
    )


# ----------------- ORDER TRACKING & HISTORY -----------------

@router.get("/orders/{order_id}", response_class=HTMLResponse)
def track_order_page(
    request: Request,
    order_id: int,
    db: Session = Depends(get_db)
):
    """Visual order tracking page."""
    user = get_current_user_optional(request, db)
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Order tracking status stages
    stages = ["Received", "Preparing", "Out for Delivery", "Delivered"]
    current_index = 0
    if order.status in stages:
        current_index = stages.index(order.status)
    elif order.status == "Cancelled":
        current_index = -1

    return templates.TemplateResponse(
        "orders/track.html",
        {
            "request": request,
            "order": order,
            "stages": stages,
            "current_index": current_index,
            "user": user
        }
    )


@router.get("/api/orders/{order_id}/status")
def get_order_status_api(order_id: int, db: Session = Depends(get_db)):
    """API for real-time order tracking."""
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "payment_status": order.payment_status,
        "updated_at": order.updated_at.isoformat() if order.updated_at else order.created_at.isoformat()
    }


@router.post("/api/orders/{order_id}/reorder")
def reorder_api(order_id: int, db: Session = Depends(get_db)):
    """1-Click Reorder API: converts past order items into a cart array for instant checkout."""
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    new_cart = []
    for item in order.items:
        if not item.menu_item or not item.menu_item.is_available:
            continue
        toppings_list = [
            {"topping_id": t.topping_id, "topping_name": t.topping_name, "price": t.price}
            for t in item.toppings
        ]
        new_cart.append({
            "pizza_id": item.menu_item_id,
            "name": item.menu_item.name,
            "price": item.unit_price,
            "quantity": item.quantity,
            "size": item.size,
            "crust_id": item.crust_id,
            "crust_name": item.crust.name if item.crust else None,
            "toppings": toppings_list
        })

    return {"success": True, "cart": new_cart, "count": len(new_cart)}


# ----------------- PRINTABLE RECEIPT & INVOICE -----------------

@router.get("/orders/{order_id}/receipt", response_class=HTMLResponse)
def order_receipt_page(
    request: Request,
    order_id: int,
    db: Session = Depends(get_db)
):
    """Printable invoice & receipt with QR code verification."""
    user = get_current_user_optional(request, db)
    order = db.query(Order).filter_by(id=order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return templates.TemplateResponse(
        "orders/receipt.html",
        {
            "request": request,
            "order": order,
            "user": user
        }
    )
