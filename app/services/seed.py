from sqlalchemy.orm import Session
from ..core.security import hash_password
from ..models.user import User
from ..models.menu import Category, Crust, Topping, MenuItem
from ..models.coupon import Coupon
from ..models.setting import RestaurantSetting
import os

def seed_database(db: Session):
    """Seed initial essential restaurant data if database is fresh."""
    
    # 1. Seed Users (Admin & Staff)
    if db.query(User).filter_by(email="admin@crustflame.com").first() is None:
        admin_user = User(
            email="admin@crustflame.com",
            hashed_password=hash_password("admin123"),
            full_name="Master Pizzaiolo (Admin)",
            phone="555-0199",
            address="142 Artisan Boulevard, Store #1",
            role="admin",
            is_active=True
        )
        staff_user = User(
            email="staff@crustflame.com",
            hashed_password=hash_password("staff123"),
            full_name="Kitchen Lead (Staff)",
            phone="555-0188",
            address="142 Artisan Boulevard, Store #1",
            role="staff",
            is_active=True
        )
        customer_user = User(
            email="customer@example.com",
            hashed_password=hash_password("customer123"),
            full_name="John Doe",
            phone="555-4321",
            address="742 Evergreen Terrace",
            role="customer",
            is_active=True
        )
        db.add_all([admin_user, staff_user, customer_user])
        db.commit()

    # 2. Seed Categories
    if db.query(Category).count() == 0:
        categories = [
            Category(name="Pizzas", slug="pizzas", description="Wood-fired artisan pizzas with slow-fermented dough", display_order=1),
            Category(name="Sides", slug="sides", description="Golden appetizers, garlic twists & dipping sauces", display_order=2),
            Category(name="Drinks", slug="drinks", description="Artisanal sodas, brewed teas & refreshments", display_order=3),
            Category(name="Deals", slug="deals", description="Value meal bundles & combo specials", display_order=4),
        ]
        db.add_all(categories)
        db.commit()

    # 3. Seed Crusts
    if db.query(Crust).count() == 0:
        crusts = [
            Crust(name="Classic Hand-Tossed", description="Our signature 48h sourdough with airy cornicione", price_modifier=0.0),
            Crust(name="Thin & Crispy", description="Ultra-thin Roman style with satisfying crackle", price_modifier=0.0),
            Crust(name="Cheese Stuffed Crust", description="Hand-rolled crust filled with warm melted mozzarella", price_modifier=2.50),
            Crust(name="Deep Dish Pan", description="Thick, fluffy golden crust baked in an iron skillet", price_modifier=1.75),
        ]
        db.add_all(crusts)
        db.commit()

    # 4. Seed Toppings
    if db.query(Topping).count() == 0:
        toppings = [
            Topping(name="Extra Fior di Latte", category="Cheese", price=1.50),
            Topping(name="Aged Gorgonzola", category="Cheese", price=1.75),
            Topping(name="Artisan Pepperoni", category="Meat", price=1.75),
            Topping(name="Smoked Italian Sausage", category="Meat", price=1.75),
            Topping(name="Grilled Chicken Breast", category="Meat", price=2.00),
            Topping(name="Portobello Mushrooms", category="Veggie", price=1.25),
            Topping(name="Kalamata Black Olives", category="Veggie", price=1.25),
            Topping(name="Fire-Roasted Bell Peppers", category="Veggie", price=1.25),
            Topping(name="Pickled Jalapeño Slices", category="Veggie", price=1.00),
            Topping(name="Fresh Sweet Basil", category="Veggie", price=0.75),
        ]
        db.add_all(toppings)
        db.commit()

    # 5. Seed Menu Items
    if db.query(MenuItem).count() == 0:
        pizza_cat = db.query(Category).filter_by(slug="pizzas").first()
        side_cat = db.query(Category).filter_by(slug="sides").first()
        drink_cat = db.query(Category).filter_by(slug="drinks").first()
        deal_cat = db.query(Category).filter_by(slug="deals").first()

        items = [
            MenuItem(
                name="Margherita D.O.C.",
                slug="margherita-doc",
                description="San Marzano tomato sauce, fresh Fior di Latte mozzarella, extra virgin olive oil, and sweet garden basil.",
                base_price=8.50,
                category_id=pizza_cat.id,
                image_filename="margherita.jpeg",
                is_vegetarian=True,
                is_featured=True,
                is_available=True
            ),
            MenuItem(
                name="Artisan Pepperoni",
                slug="artisan-pepperoni",
                description="Double portion of cured Italian pepperoni, spiced tomato sauce, melted whole-milk mozzarella, and oregano.",
                base_price=9.99,
                category_id=pizza_cat.id,
                image_filename="pepperoni.jpeg",
                is_vegetarian=False,
                is_featured=True,
                is_available=True
            ),
            MenuItem(
                name="Garden Veggie Feast",
                slug="garden-veggie-feast",
                description="Fire-roasted sweet bell peppers, red onions, earthy mushrooms, Kalamata olives, and fresh mozzarella.",
                base_price=9.25,
                category_id=pizza_cat.id,
                image_filename="veggie.jpeg",
                is_vegetarian=True,
                is_featured=True,
                is_available=True
            ),
            MenuItem(
                name="BBQ Chicken Supreme",
                slug="bbq-chicken-supreme",
                description="Smoked grilled chicken, rich hickory BBQ glaze, caramelized red onions, smoked bacon bits, and cilantro.",
                base_price=10.50,
                category_id=pizza_cat.id,
                image_filename="BBQ Chicken Pizza.jpeg",
                is_vegetarian=False,
                is_featured=True,
                is_available=True
            ),
            MenuItem(
                name="Garlic Herb Parmesan Knots",
                slug="garlic-parmesan-knots",
                description="Six freshly baked dough knots tossed in rich roasted garlic butter, fresh parsley, and grated aged Pecorino Romano.",
                base_price=4.99,
                category_id=side_cat.id,
                image_filename="garlic_knots.jpeg",
                is_vegetarian=True,
                is_featured=False,
                is_available=True
            ),
            MenuItem(
                name="Crispy Mozzarella Bites",
                slug="crispy-mozzarella-bites",
                description="Golden-fried artisan mozzarella balls seasoned with Italian herbs, served with warm San Marzano marinara dipping sauce.",
                base_price=5.99,
                category_id=side_cat.id,
                image_filename="default_pizza.jpeg",
                is_vegetarian=True,
                is_featured=False,
                is_available=True
            ),
            MenuItem(
                name="Italian Blood Orange Soda",
                slug="blood-orange-soda",
                description="Sparkling San Pellegrino natural blood orange soda, chilled to refreshing perfection.",
                base_price=2.99,
                category_id=drink_cat.id,
                image_filename="blood_orange_soda.jpeg",
                is_vegetarian=True,
                is_featured=False,
                is_available=True
            ),
            MenuItem(
                name="Fresh Brewed Iced Mint Tea",
                slug="brewed-mint-tea",
                description="Slow-steeped organic black tea infused with fresh crushed spearmint leaves and a splash of lemon.",
                base_price=2.49,
                category_id=drink_cat.id,
                image_filename="default_pizza.jpeg",
                is_vegetarian=True,
                is_featured=False,
                is_available=True
            ),
            MenuItem(
                name="Family Pizza Feast Combo",
                slug="family-pizza-feast",
                description="Includes 2 Large Pizzas of your choice, 1 order of Garlic Herb Knots, and 2 Refreshing Drinks.",
                base_price=24.99,
                category_id=deal_cat.id,
                image_filename="hero_pizza.jpg",
                is_vegetarian=False,
                is_featured=True,
                is_available=True
            ),
        ]
        db.add_all(items)
        db.commit()

    # 6. Seed Coupons
    if db.query(Coupon).count() == 0:
        coupons = [
            Coupon(
                code="WELCOME10",
                description="10% discount on any order for new customers",
                discount_type="percent",
                discount_value=10.0,
                min_order_amount=10.0,
                max_discount=15.0,
                is_active=True
            ),
            Coupon(
                code="PIZZA5",
                description="$5 off orders over $25",
                discount_type="fixed",
                discount_value=5.0,
                min_order_amount=25.0,
                is_active=True
            ),
            Coupon(
                code="CRUST20",
                description="20% off large feast orders over $35",
                discount_type="percent",
                discount_value=20.0,
                min_order_amount=35.0,
                max_discount=20.0,
                is_active=True
            ),
        ]
        db.add_all(coupons)
        db.commit()

    # 7. Seed Settings
    if db.query(RestaurantSetting).count() == 0:
        settings_data = [
            RestaurantSetting(key="store_name", value="Crust & Flame Pizza Restaurant", description="Brand name"),
            RestaurantSetting(key="delivery_fee", value="3.50", description="Flat delivery fee in USD"),
            RestaurantSetting(key="tax_rate", value="0.08", description="Sales tax rate (8%)"),
            RestaurantSetting(key="is_store_open", value="true", description="Accepting online orders"),
            RestaurantSetting(key="store_phone", value="(555) 347-3866", description="Contact phone"),
            RestaurantSetting(key="store_address", value="142 Artisan Boulevard, Food District", description="Address"),
        ]
        db.add_all(settings_data)
        db.commit()

    # 8. Seed Sample Table Reservations
    from ..models.reservation import Reservation
    from datetime import date
    if db.query(Reservation).count() == 0:
        sample_res = [
            Reservation(
                customer_name="Sophia Loren",
                customer_email="sophia@example.com",
                customer_phone="555-7890",
                reservation_date=date.today().isoformat(),
                reservation_time="19:00",
                party_size=4,
                seating_area="Cozy Fireplace Patio",
                occasion="Anniversary",
                special_requests="Corner booth with wine cooler please.",
                status="Confirmed"
            ),
            Reservation(
                customer_name="Chef Alessandro",
                customer_email="alessandro@example.com",
                customer_phone="555-3211",
                reservation_date=date.today().isoformat(),
                reservation_time="20:30",
                party_size=2,
                seating_area="Chef's Pizza Bar",
                occasion="Date Night",
                special_requests="Front row view of the 900°F oven.",
                status="Seated"
            )
        ]
        db.add_all(sample_res)
        db.commit()
