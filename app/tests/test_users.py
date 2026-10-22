def test_create_user(client):
    response = client.post(
        "/users/",
        json={"name": "Test User", "email": "testuser@example.com", "password": "securepassword"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "testuser@example.com"
    assert "id" in data

def test_login_user(client):
    # Setup - first create the user
    client.post(
        "/users/",
        json={"name": "Test User 2", "email": "testuser2@example.com", "password": "securepassword"}
    )
    
    # Act - login
    response = client.post(
        "/auth/login",
        data={"username": "testuser2@example.com", "password": "securepassword"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_password(client):
    response = client.post(
        "/auth/login",
        data={"username": "testuser2@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 403
