from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.auth.security import decode_access_token
from app.database.client import db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(token: Annotated[str | None, Depends(oauth2_scheme)]):
    if not token:
        raise CREDENTIALS_ERROR
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise CREDENTIALS_ERROR

    user = await db.user.find_unique(where={"id": payload["sub"]})
    if user is None or not user.isActive:
        raise CREDENTIALS_ERROR
    return user


CurrentUser = Annotated[object, Depends(get_current_user)]


def require_roles(*roles: str):
    async def dependency(user: CurrentUser):
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user

    return dependency


require_admin = require_roles("admin")
require_employer = require_roles("employer")
require_job_seeker = require_roles("job_seeker")
require_employer_or_admin = require_roles("employer", "admin")
