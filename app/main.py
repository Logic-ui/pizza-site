from fastapi import status, UploadFile, File, FastAPI, Request, Form, Depends, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
import json, os, shutil
from pathlib import Path

from . import models
from .database import engine, get_db


app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent

# Mount static and templates
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")

# Ensure uploads folder exists
UPLOAD_DIR = BASE_DIR / "static" / "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Create DB tables
models.Base.metadata.create_all(bind=engine)


# ----------------- SEED PIZZAS -----------------
@app.on_event("startup")
def startup():
    db = next(get_db())
    try:
        if db.query(models.Pizza).count() == 0:
            db.add_all([
                models.Pizza(
                    name="Margherita",
                    description="Tomato, mozzarella, basil",
                    price=6.5,
                    image_filename="margherita.jpeg"
                ),
                models.Pizza(
                    name="Pepperoni",
                    description="Pepperoni & cheese",
                    price=8.5,
                    image_filename="pepperoni.jpeg"
                ),
                models.Pizza(
                    name="Veggie",
                    description="Peppers, onions, mushrooms",
                    price=7.5,
                    image_filename="veggie.jpeg"
                ),
            ])
            db.commit()
    finally:
        db.close()


# ----------------- USER ROUTES -----------------
@app.get("/", response_class=HTMLResponse)
def home(request: Request, db: Session = Depends(get_db)):
    pizzas = db.query(models.Pizza).all()
    return templates.TemplateResponse("index.html", {"request": request, "pizzas": pizzas})


@app.get("/cart", response_class=HTMLResponse)
def cart_page(request: Request):
    return templates.TemplateResponse("cart.html", {"request": request})


@app.post("/order", response_class=HTMLResponse)
async def create_order(
    request: Request,
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    address: str = Form(...),
    cart: str = Form(...),
    db: Session = Depends(get_db),
):
    try:
        items = json.loads(cart)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid cart data")

    if not items:
        return templates.TemplateResponse(
            "order_success.html", {"request": request, "error": "Cart is empty."}
        )

    # Create new order
    order = models.Order(
        customer_name=customer_name,
        customer_email=customer_email,
        address=address,
        total=0.0,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    total = 0.0
    for it in items:
        pid = int(it.get("pizza_id"))
        qty = int(it.get("quantity", 1))
        size = it.get("size", "Regular")

        pizza = db.query(models.Pizza).filter_by(id=pid).first()
        if pizza is None:
            continue

        item_total = pizza.price * qty
        total += item_total

        db_item = models.OrderItem(
            order_id=order.id,
            pizza_id=pizza.id,
            size=size,
            quantity=qty,
            price=pizza.price,  # snapshot of price at order time
        )
        db.add(db_item)

    order.total = total
    db.commit()
    db.refresh(order)

    return templates.TemplateResponse("order_success.html", {"request": request, "order": order})


# ----------------- ADMIN ROUTES -----------------
@app.get("/admin/pizzas", response_class=HTMLResponse)
def list_pizzas(request: Request, db: Session = Depends(get_db)):
    pizzas = db.query(models.Pizza).all()
    return templates.TemplateResponse("admin_pizzas.html", {"request": request, "pizzas": pizzas})


@app.get("/admin/pizzas/new", response_class=HTMLResponse)
def new_pizza_form(request: Request):
    return templates.TemplateResponse("pizza_form.html", {"request": request, "pizza": None})


@app.post("/admin/pizzas/new")
def create_pizza(
    request: Request,
    name: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    filename = "default_pizza.jpeg"
    if image:
        filename = image.filename
        filepath = UPLOAD_DIR / filename
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

    pizza = models.Pizza(
        name=name,
        description=description,
        price=price,
        image_filename=filename,
    )
    db.add(pizza)
    db.commit()
    return RedirectResponse(url="/admin/pizzas", status_code=status.HTTP_303_SEE_OTHER)


@app.get("/admin/pizzas/edit/{pizza_id}", response_class=HTMLResponse)
def edit_pizza_form(request: Request, pizza_id: int, db: Session = Depends(get_db)):
    pizza = db.query(models.Pizza).filter_by(id=pizza_id).first()
    if not pizza:
        raise HTTPException(status_code=404, detail="Pizza not found")
    return templates.TemplateResponse("pizza_form.html", {"request": request, "pizza": pizza})

@app.post("/admin/pizzas/edit/{pizza_id}")
def update_pizza(
    request: Request,
    pizza_id: int,
    name: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    pizza = db.query(models.Pizza).filter_by(id=pizza_id).first()
    if not pizza:
        raise HTTPException(status_code=404, detail="Pizza not found")

    pizza.name = name
    pizza.description = description
    pizza.price = price

    if image and image.filename:
        filename = os.path.basename(image.filename)
        filepath = UPLOAD_DIR / filename

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        pizza.image_filename = filename

    db.commit()
    return RedirectResponse(url="/admin/pizzas", status_code=status.HTTP_303_SEE_OTHER)


@app.post("/admin/pizzas/delete/{pizza_id}")
def delete_pizza(pizza_id: int, db: Session = Depends(get_db)):
    pizza = db.query(models.Pizza).filter_by(id=pizza_id).first()
    if not pizza:
        raise HTTPException(status_code=404, detail="Pizza not found")
    db.delete(pizza)
    db.commit()
    return RedirectResponse(url="/admin/pizzas", status_code=status.HTTP_303_SEE_OTHER)