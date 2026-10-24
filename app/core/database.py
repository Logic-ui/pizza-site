from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency that provides a database session and safely closes it upon completion."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def auto_migrate():
    """Safely migrate missing columns into existing SQLite tables."""
    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        # Migrate 'orders' table
        if "orders" in tables:
            columns = [c["name"] for c in inspector.get_columns("orders")]
            add_cols = [
                ("order_number", "VARCHAR(36)"),
                ("user_id", "INTEGER"),
                ("customer_phone", "VARCHAR(30)"),
                ("delivery_notes", "TEXT"),
                ("subtotal", "FLOAT DEFAULT 0.0"),
                ("tax", "FLOAT DEFAULT 0.0"),
                ("delivery_fee", "FLOAT DEFAULT 0.0"),
                ("discount", "FLOAT DEFAULT 0.0"),
                ("coupon_code", "VARCHAR(50)"),
                ("payment_method", "VARCHAR(30) DEFAULT 'cod'"),
                ("payment_status", "VARCHAR(30) DEFAULT 'pending'"),
                ("updated_at", "DATETIME"),
            ]
            for col_name, col_type in add_cols:
                if col_name not in columns:
                    try:
                        conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception as e:
                        pass
            
            # Backfill order_number for existing rows
            try:
                conn.execute(text("UPDATE orders SET order_number = 'ORD-' || id WHERE order_number IS NULL"))
                conn.commit()
            except Exception:
                pass

        # Migrate 'order_items' table
        if "order_items" in tables:
            columns = [c["name"] for c in inspector.get_columns("order_items")]
            add_cols = [
                ("menu_item_id", "INTEGER"),
                ("crust_id", "INTEGER"),
                ("unit_price", "FLOAT DEFAULT 0.0"),
                ("line_total", "FLOAT DEFAULT 0.0"),
                ("special_instructions", "VARCHAR(200)"),
            ]
            for col_name, col_type in add_cols:
                if col_name not in columns:
                    try:
                        conn.execute(text(f"ALTER TABLE order_items ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception as e:
                        pass

            try:
                conn.execute(text("UPDATE order_items SET menu_item_id = pizza_id WHERE menu_item_id IS NULL AND pizza_id IS NOT NULL"))
                conn.execute(text("UPDATE order_items SET unit_price = price WHERE (unit_price IS NULL OR unit_price = 0) AND price IS NOT NULL"))
                conn.commit()
            except Exception:
                pass
