import pytest
import uuid
from unittest.mock import patch

@pytest.fixture
def auth_token(client):
    # Setup test user for transactions
    email = f"trx_user_{uuid.uuid4().hex[:8]}@example.com"
    password = "trxpassword"
    
    # Try creating the user, ignore if already exists (depends on db truncation tactic)
    client.post("/users/", json={"name": "Transaction User", "email": email, "password": password})
    
    login_res = client.post("/auth/login", data={"username": email, "password": password})
    return login_res.json()["access_token"]

@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(autouse=True)
def mock_predict_category():
    with patch("app.routers.transactions.ai_agent.predict_category") as mock:
        mock.return_value = {"id": 0, "confidence": 0.0}
        yield mock

@pytest.fixture(autouse=True)
def mock_redis():
    with patch("app.routers.transactions.redis_client") as mock:
        yield mock

def test_create_transaction(client, auth_headers, mock_redis):
    response = client.post(
        "/transactions/",
        json={
            "amount": 100.5,
            "description": "Bought Groceries",
            "category_id": None
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == 100.5
    assert data["description"] == "Bought Groceries"
    assert data["id"] is not None
    
    # Verify cache invalidation was triggered
    assert mock_redis.delete.called

def test_get_transactions(client, auth_headers):
    # Ensure there's a transaction
    client.post(
        "/transactions/",
        json={"amount": 50, "description": "Coffee", "category_id": None},
        headers=auth_headers
    )
    
    response = client.get("/transactions/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_delete_transaction(client, auth_headers):
    # Create one first
    create_res = client.post(
        "/transactions/",
        json={"amount": 30, "description": "Tea", "category_id": None},
        headers=auth_headers
    )
    trx_id = create_res.json()["id"]

    # Delete it
    delete_res = client.delete(f"/transactions/{trx_id}", headers=auth_headers)
    assert delete_res.status_code == 204

    # Try fetching it 
    get_res = client.get("/transactions/", headers=auth_headers)
    # The list shouldn't contain the deleted ID
    ids = [t["id"] for t in get_res.json()]
    assert trx_id not in ids
