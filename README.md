# 🍕 Crust & Flame — Enterprise Pizza Restaurant & Ordering System

A production-ready, full-stack pizza restaurant management and ordering platform built with **FastAPI**, **SQLAlchemy**, and a modern mobile-first vanilla frontend. Engineered for restaurant chains with multi-role access control, live order tracking, interactive pizza customization, and executive analytics.

---

## 🌟 Key Features

### 🛒 Customer Experience
1. **User Authentication & Profiles**:
   - Secure sign-up, sign-in, and logout with **bcrypt** password hashing.
   - Dual-mode JWT authentication via HTTP-only cookies and `Authorization: Bearer` headers.
   - Profile management with delivery address saving and order history.
2. **Interactive Menu & Categories**:
   - Browse **Pizzas**, **Sides**, **Drinks**, and **Deals**.
   - Real-time search by pizza name or ingredients.
   - Dietary badges (🌿 Vegetarian, 🌶️ Spicy, 🔥 Chef's Pick).
3. **Pizza Customizer**:
   - Dynamic selection of size: *Small (10")*, *Regular (12")*, *Large (14")*.
   - Crust selection: *Classic Hand-Tossed*, *Thin & Crispy*, *Cheese Stuffed Crust*, *Deep Dish Pan*.
   - Extra gourmet toppings with automatic real-time price calculation.
4. **Smart Shopping Cart**:
   - Real-time quantity increment/decrement right in the cart.
   - Dynamic tax (8%) and delivery fee calculation (Free over $50).
   - Empty cart illustration and recovery.
5. **Coupons & Promo Codes**:
   - Integrated promo validator with live discount calculation (`WELCOME10`, `PIZZA5`, `CRUST20`).
6. **Checkout & Payment**:
   - Flexible checkout with Cash on Delivery (COD) and Card options.
   - Pre-fills delivery details for authenticated users.
7. **Live Order Tracking**:
   - Visual 4-stage tracking timeline (*Received* ➔ *Preparing* ➔ *Out for Delivery* ➔ *Delivered*).
   - Automated client polling every 8 seconds for live progress updates.
8. **1-Click Reorder**:
   - Re-populate past order items into the cart in a single click.
9. **Customer Reviews**:
   - 1-to-5 star ratings with feedback comments per menu item.

---

### ⚙️ Admin & Staff Operations
1. **Role-Based Access Control (RBAC)**:
   - Dedicated roles: `admin`, `staff`, and `customer`.
2. **Executive Sales Dashboard**:
   - Today's orders count and gross sales.
   - Month-to-date revenue tracking.
   - Best-selling menu items ranked by volume and revenue.
3. **Kitchen & Order Queue Management**:
   - Filter tickets by status (*Received*, *Preparing*, *Out for Delivery*, *Delivered*).
   - Instant 1-click status transitions.
4. **Menu & Pricing Manager**:
   - Add, edit, or delete items.
   - 1-click item availability toggle (*Active* / *Inactive*).
   - Live photo preview for newly uploaded pizza imagery.
5. **Coupons & Promotions**:
   - Create percentage or fixed-dollar discount codes.
   - Set minimum order values and toggle status.
6. **Customer Directory**:
   - View registered members, contact information, and order volume.

---

## 🏗️ Project Architecture

```
d:\pizza-site\
├── .env.example                # Sample environment configuration
├── .env                        # Active environment variables
├── .gitignore                  # Git exclusions (venv, caches, env)
├── alembic.ini                 # Alembic migration configuration
├── main.py                     # Root entry point for uvicorn
├── pizzadb.db                  # Development SQLite database
├── requirements.txt            # Python dependencies
├── README.md                   # System documentation
└── app/
    ├── __init__.py
    ├── main.py                 # FastAPI application, middleware, lifecycle
    ├── models.py               # Legacy compatibility bridge
    ├── database.py             # Database session helpers
    ├── core/
    │   ├── config.py           # Pydantic Settings
    │   ├── database.py         # SQLAlchemy engine & session factory
    │   ├── security.py         # Bcrypt hashing & JWT management
    │   └── dependencies.py     # Auth & Role-based dependencies
    ├── models/
    │   ├── __init__.py         # Model discovery & exports
    │   ├── user.py             # User model
    │   ├── menu.py             # Category, MenuItem, Crust, Topping
    │   ├── order.py            # Order, OrderItem, OrderItemTopping
    │   ├── coupon.py           # Coupon promo model
    │   ├── review.py           # Item reviews & ratings
    │   └── setting.py          # Restaurant settings
    ├── schemas/
    │   ├── __init__.py
    │   ├── user.py             # User & Auth Pydantic schemas
    │   ├── menu.py             # Menu & Item Pydantic schemas
    │   ├── order.py            # Cart & Order Pydantic schemas
    │   └── coupon.py           # Coupon Pydantic schemas
    ├── routers/
    │   ├── auth.py             # Authentication & user profile endpoints
    │   ├── menu.py             # Menu browsing & review endpoints
    │   ├── orders.py           # Cart, checkout, tracking & reorder
    │   └── admin.py            # Management dashboard & analytics
    ├── services/
    │   ├── seed.py             # Initial database seeder
    ├── static/
    │   ├── css/main.css        # Responsive artisan design system
    │   ├── js/main.js          # Cart, modal, drawer & API logic
    │   ├── images/             # Restaurant branding & hero imagery
    │   └── uploads/            # Uploaded pizza photos
    └── templates/
        ├── base.html           # Master layout with drawer & header
        ├── index.html          # Storefront, customizer & review modal
        ├── cart.html           # 2-column cart & checkout
        ├── order_success.html  # Order confirmation receipt
        ├── auth/
        │   ├── login.html
        │   ├── register.html
        │   └── profile.html
        ├── orders/
        │   └── track.html      # Visual status tracker
        └── admin/
            ├── dashboard.html  # Analytics & operations
            ├── orders.html     # Kitchen tickets
            ├── menu_items.html # Menu management
            ├── menu_form.html  # Add/edit recipe form
            ├── coupons.html    # Discounts manager
            └── customers.html  # Customer directory
```

---

## 🚀 Getting Started

### 1. Requirements
- Python 3.10+
- Virtual Environment (`venv`)

### 2. Installation
```bash
# Activate your virtual environment
.\venv\Scripts\activate

# Install required dependencies
pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
PROJECT_NAME="Crust & Flame Pizza Restaurant"
ENVIRONMENT="development"
DEBUG=True
SECRET_KEY="crust_and_flame_super_secret_jwt_key_2026_change_in_production"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL="sqlite:///./pizzadb.db"
DELIVERY_FEE=3.50
TAX_RATE=0.08
```

### 4. Running the Application
Run the application using Uvicorn:
```bash
python -m uvicorn main:app --reload
```
The application will launch at: **`http://127.0.0.1:8000`**

---

## 🔑 Demo & Test Credentials

The database is automatically seeded on the first startup with default users, menu categories, crusts, toppings, and promo codes:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@crustflame.com` | `admin123` | Full access to dashboard, menu, orders, coupons, analytics |
| **Staff** | `staff@crustflame.com` | `staff123` | Kitchen queue, order status updates, menu browsing |
| **Customer** | `customer@example.com` | `customer123` | Storefront, cart, checkout, profile, order tracking |

### 🎟️ Sample Active Promo Codes
- `WELCOME10`: 10% off any order over $10.
- `PIZZA5`: $5.00 flat discount on orders over $25.
- `CRUST20`: 20% off large feast orders over $35.

---

## 📚 API Documentation

FastAPI auto-generates interactive API documentation:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🐘 Switching to PostgreSQL in Production

To transition from SQLite to PostgreSQL:
1. Install async/sync driver:
   ```bash
   pip install psycopg2-binary
   ```
2. Update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/pizzadb"
   ```
3. Restart the server. SQLAlchemy will automatically create and manage all schema tables in PostgreSQL without any code changes.
