"""Tests for quiz CRUD."""
import pytest
from django.urls import reverse


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_teacher(api_client, django_user_model):
    user = django_user_model.objects.create_user(
        email="teacher@t.com",
        username="teacher",
        password="pass123!",
        role="teacher",
    )
    from rest_framework_simplejwt.tokens import AccessToken
    token = AccessToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client, user


@pytest.fixture
def authenticated_student(api_client, django_user_model):
    user = django_user_model.objects.create_user(
        email="student@s.com",
        username="student",
        password="pass123!",
        role="student",
    )
    from rest_framework_simplejwt.tokens import AccessToken
    token = AccessToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client, user


@pytest.mark.django_db
def test_teacher_can_create_quiz(authenticated_teacher):
    client, user = authenticated_teacher
    url = reverse("quiz-list")
    resp = client.post(url, {"title": "My Quiz", "description": "desc"}, format="json")
    assert resp.status_code == 201
    assert resp.data["title"] == "My Quiz"
    assert resp.data["owner"] == str(user)


@pytest.mark.django_db
def test_student_cannot_create_quiz(authenticated_student):
    client, _ = authenticated_student
    url = reverse("quiz-list")
    resp = client.post(url, {"title": "My Quiz"}, format="json")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_teacher_can_add_question(authenticated_teacher):
    client, user = authenticated_teacher
    # Create quiz
    quiz_resp = client.post(reverse("quiz-list"), {"title": "Q"}, format="json")
    quiz_id = quiz_resp.data["id"]

    url = reverse("question-list", kwargs={"quiz_id": quiz_id})
    question_data = {
        "text": "What is 2+2?",
        "question_type": "mcq",
        "difficulty": "easy",
        "time_limit_secs": 20,
        "base_points": 100,
        "options": [
            {"text": "3", "is_correct": False},
            {"text": "4", "is_correct": True},
            {"text": "5", "is_correct": False},
        ],
    }
    resp = client.post(url, question_data, format="json")
    assert resp.status_code == 201
    assert resp.data["text"] == "What is 2+2?"
    assert len(resp.data["options"]) == 3


@pytest.mark.django_db
def test_quiz_belongs_to_owner(authenticated_teacher, api_client, django_user_model):
    client, user = authenticated_teacher
    quiz_resp = client.post(reverse("quiz-list"), {"title": "Mine"}, format="json")
    quiz_id = quiz_resp.data["id"]

    # Create another teacher
    other_user = django_user_model.objects.create_user(
        email="other@t.com", username="other", password="pass!", role="teacher"
    )
    from rest_framework_simplejwt.tokens import AccessToken
    token = AccessToken.for_user(other_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    resp = api_client.get(reverse("quiz-detail", kwargs={"pk": quiz_id}))
    assert resp.status_code == 404  # Not found for other owner
