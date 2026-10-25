from fastapi import APIRouter, Depends, HTTPException, status, Request, Form, Response
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from pathlib import Path
from typing import Optional

from ..core.database import get_db
from ..core.security import verify_password, hash_password, create_access_token
from ..core.dependencies import get_current_user, get_current_user_optional
from ..models.user import User
from ..schemas.user import UserCreate, UserLogin, Token, UserOut

router = APIRouter(tags=["Authentication"])
BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")

# ----------------- WEB PAGES (HTML) -----------------

@router.get("/auth/login", response_class=HTMLResponse)
def login_page(
    request: Request,
    next: Optional[str] = "/",
    db: Session = Depends(get_db)
):
    user = get_current_user_optional(request, db)
    if user:
        if user.is_staff():
            return RedirectResponse(url="/admin", status_code=status.HTTP_303_SEE_OTHER)
        return RedirectResponse(url="/profile", status_code=status.HTTP_303_SEE_OTHER)
    return templates.TemplateResponse("auth/login.html", {"request": request, "next": next, "user": None})


@router.post("/auth/login")
def login_post(
    request: Request,
    response: Response,
    email: str = Form(...),
    password: str = Form(...),
    next: Optional[str] = Form("/"),
    db: Session = Depends(get_db)
):
    email_clean = email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    
    if not user or not verify_password(password, user.hashed_password):
        return templates.TemplateResponse(
            "auth/login.html",
            {
                "request": request,
                "error": "Invalid email or password. Please try again.",
                "email": email,
                "next": next,
                "user": None
            },
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    if not user.is_active:
        return templates.TemplateResponse(
            "auth/login.html",
            {
                "request": request,
                "error": "This account is inactive. Please contact store management.",
                "email": email,
                "next": next,
                "user": None
            },
            status_code=status.HTTP_403_FORBIDDEN
        )

    # Generate token
    token = create_access_token({"sub": str(user.id), "role": user.role})
    
    redirect_target = next if next and not next.startswith("/auth") else "/"
    if user.is_staff() and redirect_target == "/":
        redirect_target = "/admin"

    res = RedirectResponse(url=redirect_target, status_code=status.HTTP_303_SEE_OTHER)
    res.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        max_age=86400,
        samesite="lax"
    )
    return res


@router.get("/auth/register", response_class=HTMLResponse)
def register_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_optional(request, db)
    if user:
        return RedirectResponse(url="/profile", status_code=status.HTTP_303_SEE_OTHER)
    return templates.TemplateResponse("auth/register.html", {"request": request, "user": None})


@router.post("/auth/register")
def register_post(
    request: Request,
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    email_clean = email.strip().lower()
    if len(password) < 6:
        return templates.TemplateResponse(
            "auth/register.html",
            {"request": request, "error": "Password must be at least 6 characters.", "user": None},
            status_code=status.HTTP_400_BAD_REQUEST
        )

    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        return templates.TemplateResponse(
            "auth/register.html",
            {"request": request, "error": "An account with this email already exists.", "user": None},
            status_code=status.HTTP_400_BAD_REQUEST
        )

    new_user = User(
        email=email_clean,
        full_name=full_name.strip(),
        phone=phone.strip() if phone else None,
        address=address.strip() if address else None,
        hashed_password=hash_password(password),
        role="customer",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Login automatically
    token = create_access_token({"sub": str(new_user.id), "role": new_user.role})
    res = RedirectResponse(url="/profile", status_code=status.HTTP_303_SEE_OTHER)
    res.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        max_age=86400,
        samesite="lax"
    )
    return res


@router.get("/auth/logout")
def logout():
    res = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    res.delete_cookie(key="access_token")
    return res


@router.get("/profile", response_class=HTMLResponse)
def user_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    orders = current_user.orders
    orders_sorted = sorted(orders, key=lambda x: x.created_at, reverse=True)
    reservations = current_user.reservations or []
    reservations_sorted = sorted(reservations, key=lambda x: (x.reservation_date, x.reservation_time), reverse=True)
    return templates.TemplateResponse(
        "auth/profile.html",
        {
            "request": request,
            "user": current_user,
            "orders": orders_sorted,
            "reservations": reservations_sorted
        }
    )


@router.post("/profile")
def update_profile(
    request: Request,
    full_name: str = Form(...),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    new_password: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.full_name = full_name.strip()
    current_user.phone = phone.strip() if phone else None
    current_user.address = address.strip() if address else None

    if new_password and len(new_password.strip()) >= 6:
        current_user.hashed_password = hash_password(new_password.strip())

    db.commit()
    return RedirectResponse(url="/profile?updated=1", status_code=status.HTTP_303_SEE_OTHER)


# ----------------- REST API ENDPOINTS -----------------

@router.post("/api/auth/register", response_model=UserOut)
def api_register(payload: UserCreate, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    if db.query(User).filter(User.email == email_clean).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=email_clean,
        full_name=payload.full_name,
        phone=payload.phone,
        address=payload.address,
        hashed_password=hash_password(payload.password),
        role="customer"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/api/auth/token", response_model=Token)
def api_login(payload: UserLogin, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/api/auth/me", response_model=UserOut)
def api_me(current_user: User = Depends(get_current_user)):
    return current_user
