# app/main.py
from fastapi import status
from fastapi.responses import RedirectResponse
from fastapi import FastAPI, Request, Form, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
import json

from . import models
from .database import engine, get_db

app = FastAPI()
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# create DB tables
models.Base.metadata.create_all(bind=engine)

# seed some pizzas if DB empty
@app.on_event("startup")
def startup():
    db = next(get_db())
    try:
        if db.query(models.Pizza).count() == 0:
            db.add_all([
                models.Pizza(name="Margherita", description="Tomato, mozzarella, basil", price=6.5),
                models.Pizza(name="Pepperoni", description="Pepperoni & cheese", price=8.5),
                models.Pizza(name="Veggie", description="Peppers, onions, mushrooms", price=7.5),
            ])
            db.commit()
    finally:
        db.close()


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
    # cart comes as JSON string from client
    try:
        items = json.loads(cart)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid cart data")

    if not items:
        return templates.TemplateResponse("order_success.html", {"request": request, "error": "Cart is empty."})

    # create order record (total will be computed server-side)
    order = models.Order(customer_name=customer_name, customer_email=customer_email, address=address, total=0.0)
    db.add(order)
    db.commit()
    db.refresh(order)

    total = 0.0
    for it in items:
        pid = int(it.get("pizza_id"))
        qty = int(it.get("quantity", 1))
        pizza = db.query(models.Pizza).filter_by(id=pid).first()
        if pizza is None:
            # skip invalid pizza (or you can return 400)
            continue
        item_total = pizza.price * qty
        total += item_total
        db_item = models.OrderItem(order_id=order.id, pizza_id=pid, pizza_name=pizza.name, quantity=qty, price=pizza.price)
        db.add(db_item)

    order.total = total
    db.commit()
    db.refresh(order)

    # Clear cart is client-side (JS) after success
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
    db: Session = Depends(get_db),
):
    pizza = models.Pizza(name=name, description=description, price=price)
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
    db: Session = Depends(get_db),
):
    pizza = db.query(models.Pizza).filter_by(id=pizza_id).first()
    if not pizza:
        raise HTTPException(status_code=404, detail="Pizza not found")

    pizza.name = name
    pizza.description = description
    pizza.price = price
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