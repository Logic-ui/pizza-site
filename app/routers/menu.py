from fastapi import APIRouter, Depends, HTTPException, Request, Form, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from pathlib import Path
from typing import Optional, List

from ..core.database import get_db
from ..core.dependencies import get_current_user_optional, get_current_user
from ..models.menu import Category, MenuItem, Crust, Topping
from ..models.review import Review
from ..models.user import User

router = APIRouter(tags=["Menu"])
BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")

@router.get("/api/menu", response_class=JSONResponse)
def get_full_menu_api(db: Session = Depends(get_db)):
    """Return all active menu categories, items, crusts, and toppings."""
    categories = db.query(Category).filter_by(is_active=True).order_by(Category.display_order).all()
    crusts = db.query(Crust).filter_by(is_available=True).all()
    toppings = db.query(Topping).filter_by(is_available=True).all()

    data = {
        "categories": [
            {
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "description": cat.description,
                "items": [
                    {
                        "id": it.id,
                        "name": it.name,
                        "slug": it.slug,
                        "description": it.description,
                        "base_price": it.base_price,
                        "image_url": it.image_url(),
                        "is_vegetarian": it.is_vegetarian,
                        "is_spicy": it.is_spicy,
                        "is_featured": it.is_featured,
                        "rating": it.average_rating(),
                        "reviews_count": len([r for r in it.reviews if r.is_approved])
                    }
                    for it in cat.items if it.is_available
                ]
            }
            for cat in categories
        ],
        "crusts": [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "price_modifier": c.price_modifier
            }
            for c in crusts
        ],
        "toppings": [
            {
                "id": t.id,
                "name": t.name,
                "category": t.category,
                "price": t.price
            }
            for t in toppings
        ]
    }
    return data


@router.get("/api/menu/items/{item_id}", response_class=JSONResponse)
def get_menu_item_detail_api(item_id: int, db: Session = Depends(get_db)):
    """Return single menu item with customization choices and approved reviews."""
    item = db.query(MenuItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    crusts = db.query(Crust).filter_by(is_available=True).all()
    toppings = db.query(Topping).filter_by(is_available=True).all()

    return {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "base_price": item.base_price,
        "image_url": item.image_url(),
        "is_vegetarian": item.is_vegetarian,
        "is_spicy": item.is_spicy,
        "category": item.category.name if item.category else "Pizzas",
        "crusts": [{"id": c.id, "name": c.name, "price_modifier": c.price_modifier} for c in crusts],
        "toppings": [{"id": t.id, "name": t.name, "category": t.category, "price": t.price} for t in toppings],
        "reviews": [
            {
                "id": r.id,
                "user_name": r.user.full_name if r.user else "Anonymous",
                "rating": r.rating,
                "comment": r.comment,
                "date": r.created_at.strftime("%b %d, %Y")
            }
            for r in item.reviews if r.is_approved
        ]
    }


@router.post("/api/menu/items/{item_id}/reviews")
def submit_review(
    item_id: int,
    rating: int = Form(...),
    comment: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a customer rating and review for a menu item."""
    item = db.query(MenuItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    review = Review(
        user_id=current_user.id,
        menu_item_id=item.id,
        rating=rating,
        comment=comment.strip(),
        is_approved=True  # auto-approve customer reviews
    )
    db.add(review)
    db.commit()
    return {"success": True, "message": "Thank you! Your review has been posted."}
