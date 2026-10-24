from fastapi import Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from .database import get_db
from .security import decode_access_token
from ..models.user import User

def get_token_from_request(request: Request) -> Optional[str]:
    """Extract JWT token from Authorization header or HTTP-only cookie."""
    # 1. Header check
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    
    # 2. Cookie check
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        if cookie_token.startswith("Bearer "):
            return cookie_token.split(" ")[1]
        return cookie_token
        
    return None

def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Retrieve current user if authenticated; returns None otherwise."""
    token = get_token_from_request(request)
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    try:
        user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
        return user
    except Exception:
        return None

def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """Enforce authentication; redirects browser or raises HTTP 401."""
    user = get_current_user_optional(request, db)
    if not user:
        # Check if browser HTML request or API JSON request
        accept_header = request.headers.get("accept", "")
        if "text/html" in accept_header:
            # Browser request -> redirect to login with next url
            next_url = str(request.url.path)
            raise HTTPException(
                status_code=status.HTTP_307_TEMPORARY_REDIRECT,
                headers={"Location": f"/auth/login?next={next_url}"}
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_role(allowed_roles: List[str]):
    """Role-based access control dependency."""
    def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return user
    return role_checker
