"""Demo identity and role checks. Replace with real SSO/OIDC before deployment."""
from fastapi import Header, HTTPException

VALID_ROLES = {
    "operations_analyst",
    "supply_chain_manager",
    "warehouse_operator",
    "procurement_approver",
    "administrator",
    "auditor",
}


def get_actor(
    x_user_id: str = Header(default="demo-analyst", alias="X-User-Id"),
    x_user_role: str = Header(default="operations_analyst", alias="X-User-Role"),
):
    role = x_user_role.strip().lower()
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Unknown demo role: {role}")
    return {"id": x_user_id.strip(), "role": role}


def require_role(actor: dict, *allowed: str):
    if actor["role"] not in allowed:
        raise HTTPException(status_code=403, detail="Your role is not permitted to perform this action.")
