API = "/api/v1/auth"
MENTORS = "/api/v1/mentors"


def _register(client, *, name="User", email, password="supersecure1", role):
    return client.post(API + "/register", json={"name": name, "email": email, "password": password, "role": role})


def _login(client, *, email, password="supersecure1"):
    return client.post(API + "/login", json={"email": email, "password": password})


def _admin_token(client):
    res = _register(client, name="Admin One", email="admin1@example.com", role="admin")
    return res.json()["access_token"]


def test_mentor_registration_blocked_when_not_on_roster(client):
    res = _register(client, name="Unapproved Mentor", email="unapproved@example.com", role="mentor")
    assert res.status_code == 404
    assert "contact your institution's admin" in res.json()["detail"]


def test_login_with_unknown_email_says_contact_admin(client):
    res = _login(client, email="nobody@example.com")
    assert res.status_code == 404
    assert "contact your institution's admin" in res.json()["detail"]


def test_admin_can_add_mentor_then_registration_succeeds(client):
    token = _admin_token(client)

    add = client.post(
        MENTORS,
        json={"name": "Nina Alvarez", "email": "nina@example.com", "domain": "Data Science", "capacity": 2},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert add.status_code == 201
    assert add.json()["is_registered"] is False

    register = _register(client, name="Nina Alvarez", email="nina@example.com", role="mentor")
    assert register.status_code == 201
    assert register.json()["user"]["role"] == "mentor"


def test_login_with_roster_only_email_prompts_registration(client):
    token = _admin_token(client)
    client.post(
        MENTORS,
        json={"name": "Pending Mentor", "email": "pending@example.com"},
        headers={"Authorization": f"Bearer {token}"},
    )

    res = _login(client, email="pending@example.com")
    assert res.status_code == 404
    assert "hasn't completed registration" in res.json()["detail"]


def test_non_admin_cannot_manage_roster(client):
    res = _register(client, name="Regular Student", email="student1@example.com", role="student")
    token = res.json()["access_token"]

    denied = client.post(
        MENTORS,
        json={"name": "Someone", "email": "someone@example.com"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert denied.status_code == 403


def test_duplicate_roster_email_rejected(client):
    token = _admin_token(client)
    payload = {"name": "Dup Mentor", "email": "dupmentor@example.com"}
    first = client.post(MENTORS, json=payload, headers={"Authorization": f"Bearer {token}"})
    second = client.post(MENTORS, json=payload, headers={"Authorization": f"Bearer {token}"})
    assert first.status_code == 201
    assert second.status_code == 409


def test_admin_can_list_and_remove_roster_entry(client):
    token = _admin_token(client)
    add = client.post(
        MENTORS,
        json={"name": "Temp Mentor", "email": "temp@example.com"},
        headers={"Authorization": f"Bearer {token}"},
    )
    mentor_id = add.json()["id"]

    listing = client.get(MENTORS, headers={"Authorization": f"Bearer {token}"})
    assert listing.status_code == 200
    assert any(m["email"] == "temp@example.com" for m in listing.json())

    delete = client.delete(f"{MENTORS}/{mentor_id}", headers={"Authorization": f"Bearer {token}"})
    assert delete.status_code == 204

    listing_after = client.get(MENTORS, headers={"Authorization": f"Bearer {token}"})
    assert not any(m["email"] == "temp@example.com" for m in listing_after.json())
