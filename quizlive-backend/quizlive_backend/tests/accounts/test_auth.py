"""Tests for accounts auth endpoints."""
import pytest
from django.urls import reverse


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def teacher_data():
    return {
        "email": "teacher@example.com",
        "username": "teacher1",
        "password": "SecurePass123!",
        "password2": "SecurePass123!",
        "role": "teacher",
    }


@pytest.fixture
def student_data():
    return {
        "email": "student@example.com",
        "username": "student1",
        "password": "SecurePass123!",
        "password2": "SecurePass123!",
        "role": "student",
    }


@pytest.mark.django_db
def test_register_teacher(api_client, teacher_data):
    url = reverse("auth-register")
    resp = api_client.post(url, teacher_data, format="json")
    assert resp.status_code == 201
    assert resp.data["role"] == "teacher"
    assert resp.data["email"] == teacher_data["email"]


@pytest.mark.django_db
def test_register_student(api_client, student_data):
    url = reverse("auth-register")
    resp = api_client.post(url, student_data, format="json")
    assert resp.status_code == 201
    assert resp.data["role"] == "student"


@pytest.mark.django_db
def test_register_duplicate_email(api_client, teacher_data):
    url = reverse("auth-register")
    api_client.post(url, teacher_data, format="json")
    resp = api_client.post(url, teacher_data, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_login_returns_tokens(api_client, teacher_data):
    register_url = reverse("auth-register")
    login_url = reverse("auth-login")
    api_client.post(register_url, teacher_data, format="json")
    resp = api_client.post(
        login_url,
        {"email": teacher_data["email"], "password": teacher_data["password"]},
        format="json",
    )
    assert resp.status_code == 200
    assert "access" in resp.data
    assert "refresh" in resp.data
    assert resp.data["user"]["role"] == "teacher"


@pytest.mark.django_db
def test_login_wrong_password(api_client, teacher_data):
    register_url = reverse("auth-register")
    login_url = reverse("auth-login")
    api_client.post(register_url, teacher_data, format="json")
    resp = api_client.post(
        login_url,
        {"email": teacher_data["email"], "password": "wrongpassword"},
        format="json",
    )
    assert resp.status_code == 401


@pytest.mark.django_db
def test_me_requires_auth(api_client):
    url = reverse("auth-me")
    resp = api_client.get(url)
    assert resp.status_code == 401


@pytest.mark.django_db
def test_me_returns_profile(api_client, teacher_data):
    register_url = reverse("auth-register")
    login_url = reverse("auth-login")
    me_url = reverse("auth-me")

    api_client.post(register_url, teacher_data, format="json")
    login_resp = api_client.post(
        login_url,
        {"email": teacher_data["email"], "password": teacher_data["password"]},
        format="json",
    )
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_resp.data['access']}")
    resp = api_client.get(me_url)
    assert resp.status_code == 200
    assert resp.data["email"] == teacher_data["email"]
