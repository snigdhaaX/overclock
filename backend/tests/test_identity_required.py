"""With header identity off, as in production, nothing protected answers without a verified token."""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

PUBLIC = {"/health", "/openapi.json", "/docs", "/redoc", "/docs/oauth2-redirect"}
# These prove identity another way: credentials, a refresh token or a shared secret.
OWN_CHECK = {"/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout", "/api/v1/webhooks/carriers/simulated", "/api/v1/intelligence/webhook/supplier"}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.delenv("TRUSTCHAIN_ALLOW_HEADER_AUTH", raising=False)
    return TestClient(app)


def protected_routes():
    for path, operations in app.openapi()["paths"].items():
        if path in PUBLIC or path in OWN_CHECK:
            continue
        for method in operations:
            yield method.upper(), path.replace("{version}", "1").replace("{limit}", "1")


@pytest.mark.parametrize("method,path", sorted(set(protected_routes())))
def test_route_rejects_missing_identity(client, method, path):
    assert client.request(method, path, json={}).status_code == 401


@pytest.mark.parametrize("method,path", [("GET", "/api/v1/supply-chain/orders"), ("GET", "/api/v1/risk/status"), ("GET", "/blockchain/wallet/linked")])
def test_header_claims_are_ignored(client, method, path):
    spoof = {"X-User-Id": "x", "X-Organization-Id": "ORG-APEX-GLOBAL", "X-User-Roles": "administrator"}
    assert client.request(method, path, headers=spoof).status_code == 401


def test_a_bad_token_is_rejected_even_when_header_auth_is_on(client, monkeypatch):
    monkeypatch.setenv("TRUSTCHAIN_ALLOW_HEADER_AUTH", "1")
    assert client.get("/api/v1/supply-chain/orders", headers={"Authorization": "Bearer nonsense"}).status_code == 401
