API = "/api/v1/auth"


def test_register_returns_token_and_me_matches(client):
    res = client.post(
        f"{API}/register",
        json={"name": "Jordan Alvarez", "email": "jordan@example.com", "password": "supersecure1", "role": "student"},
    )
    assert res.status_code == 201
    token = res.json()["access_token"]

    me = client.get(f"{API}/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "jordan@example.com"
    assert me.json()["role"] == "student"


def test_duplicate_email_is_rejected(client):
    payload = {"name": "User A", "email": "dupe@example.com", "password": "supersecure1", "role": "student"}
    assert client.post(f"{API}/register", json=payload).status_code == 201
    assert client.post(f"{API}/register", json=payload).status_code == 409


def test_short_password_is_rejected_by_validation(client):
    res = client.post(
        f"{API}/register",
        json={"name": "Weak", "email": "weak@example.com", "password": "123", "role": "student"},
    )
    assert res.status_code == 422


def test_login_with_wrong_password_fails(client):
    client.post(
        f"{API}/register",
        json={"name": "User B", "email": "b@example.com", "password": "supersecure1", "role": "student"},
    )
    res = client.post(f"{API}/login", json={"email": "b@example.com", "password": "wrong-password"})
    assert res.status_code == 401


def test_login_with_correct_password_succeeds(client):
    client.post(
        f"{API}/register",
        json={"name": "User D", "email": "d@example.com", "password": "supersecure1", "role": "admin"},
    )
    res = client.post(f"{API}/login", json={"email": "d@example.com", "password": "supersecure1"})
    assert res.status_code == 200
    assert res.json()["user"]["role"] == "admin"


def test_role_gate_blocks_wrong_role(client):
    res = client.post(
        f"{API}/register",
        json={"name": "User C", "email": "c@example.com", "password": "supersecure1", "role": "student"},
    )
    token = res.json()["access_token"]
    denied = client.get(f"{API}/admin/ping", headers={"Authorization": f"Bearer {token}"})
    assert denied.status_code == 403


def test_role_gate_allows_matching_role(client):
    res = client.post(
        f"{API}/register",
        json={"name": "User E", "email": "e@example.com", "password": "supersecure1", "role": "admin"},
    )
    token = res.json()["access_token"]
    allowed = client.get(f"{API}/admin/ping", headers={"Authorization": f"Bearer {token}"})
    assert allowed.status_code == 200


def test_protected_route_without_token_is_rejected(client):
    assert client.get(f"{API}/me").status_code == 401


def test_protected_route_with_garbage_token_is_rejected(client):
    res = client.get(f"{API}/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert res.status_code == 401
