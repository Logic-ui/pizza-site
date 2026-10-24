from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from pathlib import Path
import os

from .core.config import settings
from .core.database import engine, get_db, auto_migrate
from .core.dependencies import get_current_user_optional
from . import models
from .services.seed import seed_database
from .routers import auth, menu, orders, admin

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Enterprise Pizza Restaurant Ordering & Management System with Authentication, Cart, Customization, Order Tracking, and Admin Dashboard.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

BASE_DIR = Path(__file__).resolve().parent

# Mount Static Files
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# Templates Configuration
templates = Jinja2Templates(directory=BASE_DIR / "templates")

# Ensure uploads directory exists
UPLOAD_DIR = BASE_DIR / "static" / "uploads"
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except Exception:
    pass

# Run schema migrations and create any new DB tables safely
try:
    auto_migrate()
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning during schema setup: {e}")


# ----------------- LIFECYCLE / STARTUP SEEDING -----------------
@app.on_event("startup")
def startup_event():
    try:
        auto_migrate()
        db = next(get_db())
        try:
            seed_database(db)
        finally:
            db.close()
    except Exception as e:
        print(f"Warning during startup seeding: {e}")


# ----------------- MIDDLEWARE / USER CONTEXT -----------------
@app.middleware("http")
async def user_context_middleware(request: Request, call_next):
    # Extract user if token cookie exists
    request.state.user = None
    token = request.cookies.get("access_token")
    if token:
        from .core.security import decode_access_token
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            db = next(get_db())
            try:
                user = db.query(models.User).filter_by(id=int(payload["sub"]), is_active=True).first()
                request.state.user = user
            except Exception:
                pass
            finally:
                db.close()

    response = await call_next(request)
    return response


# ----------------- MOUNT MODULAR ROUTERS -----------------
app.include_router(auth.router)
app.include_router(menu.router)
app.include_router(orders.router)
app.include_router(admin.router)


# ----------------- STOREFRONT CORE PAGES -----------------
@app.get("/", response_class=HTMLResponse)
def home_page(request: Request, db: Session = Depends(get_db)):
    """Storefront landing page showcasing hero section, categories, and pizza customization."""
    user = get_current_user_optional(request, db)
    
    categories = db.query(models.Category).filter_by(is_active=True).order_by(models.Category.display_order).all()
    items = db.query(models.MenuItem).filter_by(is_available=True).all()
    pizzas = [it for it in items if it.category and it.category.slug == "pizzas"] or items
    crusts = db.query(models.Crust).filter_by(is_available=True).all()
    toppings = db.query(models.Topping).filter_by(is_available=True).all()

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "user": user,
            "categories": categories,
            "items": items,
            "pizzas": pizzas,
            "crusts": crusts,
            "toppings": toppings
        }
    )


@app.get("/cart", response_class=HTMLResponse)
def cart_page(request: Request, db: Session = Depends(get_db)):
    """Shopping cart & secure checkout page."""
    user = get_current_user_optional(request, db)
    return templates.TemplateResponse("cart.html", {"request": request, "user": user})


# ----------------- LEGACY COMPATIBILITY REDIRECTS -----------------
@app.get("/login", response_class=HTMLResponse)
def shortcut_login(request: Request):
    return RedirectResponse(url="/auth/login", status_code=status.HTTP_302_FOUND)


@app.get("/register", response_class=HTMLResponse)
def shortcut_register(request: Request):
    return RedirectResponse(url="/auth/register", status_code=status.HTTP_302_FOUND)


@app.get("/admin/pizzas", response_class=HTMLResponse)
def legacy_admin_pizzas(request: Request):
    return RedirectResponse(url="/admin/menu", status_code=status.HTTP_302_FOUND)