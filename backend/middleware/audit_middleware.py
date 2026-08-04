"""Audit middleware — automatically logs every API call to the AuditLog table.

Captures: user (from JWT), HTTP method, path, IP address, user-agent, and success status.
Runs after the response is generated so it does not block request processing.
"""

import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from jose import JWTError, jwt

from config.settings import settings
from config.database import AsyncSessionLocal
from models.traffic import AuditLog

# Paths that should NOT be logged (health checks, static files, docs)
_SKIP_PREFIXES = (
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/streams/",
    "/favicon.ico",
)

# Map HTTP methods to audit actions
_METHOD_ACTION_MAP = {
    "GET": "view_record",
    "POST": "create_record",
    "PUT": "update_record",
    "PATCH": "update_record",
    "DELETE": "delete_record",
}


def _extract_resource(path: str) -> tuple[str | None, str | None]:
    """Parse resource_type and resource_id from the URL path.
    
    Example: /api/v1/cameras/cam-1 → ('cameras', 'cam-1')
    """
    parts = [p for p in path.split("/") if p]
    # Find the segment after 'v1' (or the first meaningful segment)
    resource_type = None
    resource_id = None
    if "v1" in parts:
        idx = parts.index("v1")
        remaining = parts[idx + 1:]
        if remaining:
            resource_type = remaining[0]
        if len(remaining) > 1:
            resource_id = remaining[1]
    return resource_type, resource_id


def _extract_username_from_token(request: Request) -> str | None:
    """Try to decode the JWT from the Authorization header to get the username."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


class AuditMiddleware(BaseHTTPMiddleware):
    """Logs all API calls to the audit_logs table."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip non-API paths
        path = request.url.path
        if any(path.startswith(p) for p in _SKIP_PREFIXES):
            return await call_next(request)

        start_time = time.time()
        response: Response | None = None
        success = True

        try:
            response = await call_next(request)
            if response.status_code >= 400:
                success = False
            return response
        except Exception:
            success = False
            raise
        finally:
            # Fire-and-forget audit log write
            try:
                username = _extract_username_from_token(request)
                resource_type, resource_id = _extract_resource(path)
                method = request.method
                action = _METHOD_ACTION_MAP.get(method, "api_call")

                # Special action overrides
                if "login" in path:
                    action = "login"
                elif "logout" in path:
                    action = "logout"
                elif "export" in path.lower():
                    action = "export_data"
                elif "license-plate" in path and method == "GET":
                    action = "search_plate"
                elif "watchlist" in path and method == "POST":
                    action = "add_watchlist"

                status_code = response.status_code if response else 500
                client_ip = request.client.host if request.client else None
                user_agent = request.headers.get("user-agent", "")[:300]

                elapsed_ms = round((time.time() - start_time) * 1000, 1)
                details = f"{method} {path} -> {status_code} ({elapsed_ms}ms)"

                async with AsyncSessionLocal() as session:
                    log_entry = AuditLog(
                        user_id=None,  # We store username in details; user_id requires a DB lookup
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        details=f"[{username or 'anonymous'}] {details}",
                        ip_address=client_ip,
                        user_agent=user_agent,
                        success=success,
                    )
                    session.add(log_entry)
                    await session.commit()
            except Exception:
                # Never let audit logging crash the actual request
                pass
