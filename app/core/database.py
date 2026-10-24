import os
import shutil
import tempfile
from pathlib import Path
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# Detect Vercel, AWS Lambda, or other serverless read-only environments
IS_VERCEL = bool(
    os.environ.get("VERCEL")
    or os.environ.get("VERCEL_ENV")
    or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
)

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

if IS_VERCEL and db_url.startswith("sqlite"):
    # On Vercel Linux serverless environment, /tmp is writable.
    # On Windows or fallback, use tempfile.gettempdir().
    if os.name != "nt" and Path("/tmp").exists():
        tmp_dir = Path("/tmp")
    else:
        tmp_dir = Path(tempfile.gettempdir())

    tmp_db = tmp_dir / "pizzadb.db"

    # Base directory of the repository
    repo_root = Path(__file__).resolve().parent.parent.parent
    candidate_dbs = [
        repo_root / "pizzadb.db",
        Path.cwd() / "pizzadb.db",
        Path("/var/task/pizzadb.db"),
    ]
    bundled_db = next((p for p in candidate_dbs if p.exists() and p.is_file()), None)

    # Copy bundled database to writable /tmp if it doesn't already exist
    if bundled_db and not tmp_db.exists():
        try:
            shutil.copyfile(bundled_db, tmp_db)
            try:
                os.chmod(tmp_db, 0o666)
            except Exception:
                pass
        except Exception as e:
            print(f"Warning: Failed to copy database to temp directory: {e}")

    db_url = f"sqlite:///{tmp_db.as_posix()}"

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
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
    try:
        with engine.begin() as conn:
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
                    ("tip_amount", "FLOAT DEFAULT 0.0"),
                    ("coupon_code", "VARCHAR(50)"),
                    ("points_earned", "INTEGER DEFAULT 0"),
                    ("points_redeemed", "INTEGER DEFAULT 0"),
                    ("order_type", "VARCHAR(20) DEFAULT 'delivery'"),
                    ("payment_method", "VARCHAR(30) DEFAULT 'cod'"),
                    ("payment_status", "VARCHAR(30) DEFAULT 'pending'"),
                    ("updated_at", "DATETIME"),
                ]
                for col_name, col_type in add_cols:
                    if col_name not in columns:
                        try:
                            conn.execute(text(f"ALTER TABLE orders ADD COLUMN {col_name} {col_type}"))
                        except Exception:
                            pass
                
                # Backfill order_number for existing rows
                try:
                    conn.execute(text("UPDATE orders SET order_number = 'ORD-' || id WHERE order_number IS NULL"))
                    conn.execute(text("UPDATE orders SET order_type = 'delivery' WHERE order_type IS NULL"))
                    conn.execute(text("UPDATE orders SET tip_amount = 0.0 WHERE tip_amount IS NULL"))
                except Exception:
                    pass

            # Migrate 'users' table
            if "users" in tables:
                columns = [c["name"] for c in inspector.get_columns("users")]
                if "loyalty_points" not in columns:
                    try:
                        conn.execute(text("ALTER TABLE users ADD COLUMN loyalty_points INTEGER DEFAULT 100"))
                        conn.execute(text("UPDATE users SET loyalty_points = 100 WHERE loyalty_points IS NULL"))
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
                        except Exception:
                            pass

                try:
                    conn.execute(text("UPDATE order_items SET menu_item_id = pizza_id WHERE menu_item_id IS NULL AND pizza_id IS NOT NULL"))
                    conn.execute(text("UPDATE order_items SET unit_price = price WHERE (unit_price IS NULL OR unit_price = 0) AND price IS NOT NULL"))
                except Exception:
                    pass
    except Exception as e:
        print(f"Warning during auto_migrate: {e}")

