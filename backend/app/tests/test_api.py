import pytest
from app.models.match import Match
from app.models.quiz import Quiz, Question
from app.models.user import User

@pytest.fixture
def seed_test_data(db):
    # Seed a finished match, an upcoming match, a quiz and questions
    import datetime
    match_finished = Match(
        id=10,
        home_team="Team A",
        away_team="Team B",
        home_score=2,
        away_score=1,
        status="FINISHED",
        match_date=datetime.datetime.now()
    )
    
    match_upcoming = Match(
        id=11,
        home_team="Team C",
        away_team="Team D",
        status="UPCOMING",
        match_date=datetime.datetime.now() + datetime.timedelta(days=1)
    )
    db.add(match_finished)
    db.add(match_upcoming)
    db.commit()

    quiz = Quiz(id=10, match_id=10, title="Team A vs Team B Quiz")
    db.add(quiz)
    db.commit()

    q1 = Question(
        quiz_id=10,
        question_text="Who won?",
        option_a="Team A",
        option_b="Team B",
        option_c="Draw",
        option_d="None",
        correct_option="A",
        explanation="Team A won 2-1"
    )
    q2 = Question(
        quiz_id=10,
        question_text="How many goals did Team B score?",
        option_a="0",
        option_b="1",
        option_c="2",
        option_d="3",
        correct_option="B",
        explanation="Team B scored 1 goal"
    )
    db.add(q1)
    db.add(q2)
    db.commit()
    return {
        "finished_match_id": 10,
        "upcoming_match_id": 11,
        "quiz_id": 10
    }

def test_auth_workflow(client):
    # 1. Register User A
    register_response = client.post(
        "/api/v1/auth/register",
        json={"username": "usera", "email": "usera@ebk.com", "password": "password123"}
    )
    assert register_response.status_code == 201
    assert register_response.json()["username"] == "usera"

    # 2. Register User B
    register_response_b = client.post(
        "/api/v1/auth/register",
        json={"username": "userb", "email": "userb@ebk.com", "password": "password123"}
    )
    assert register_response_b.status_code == 201

    # 3. Login User A
    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "usera", "password": "password123"}
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    assert token is not None

    # 4. Get Current User profile
    headers = {"Authorization": f"Bearer {token}"}
    me_response = client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["username"] == "usera"

def test_matches_endpoint(client, seed_test_data):
    # Register & Login
    client.post("/api/v1/auth/register", json={"username": "usera", "email": "usera@ebk.com", "password": "password123"})
    login_resp = client.post("/api/v1/auth/login", json={"username": "usera", "password": "password123"})
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    # Retrieve matches
    response = client.get("/api/v1/matches/", headers=headers)
    assert response.status_code == 200
    matches_list = response.json()
    assert len(matches_list) >= 2
    
    # Verify match detail attributes
    finished_match = next(m for m in matches_list if m["id"] == seed_test_data["finished_match_id"])
    assert finished_match["has_quiz"] is True
    assert finished_match["status"] == "FINISHED"

    upcoming_match = next(m for m in matches_list if m["id"] == seed_test_data["upcoming_match_id"])
    assert upcoming_match["has_quiz"] is False
    assert upcoming_match["status"] == "UPCOMING"

def test_quiz_attempt_workflow(client, seed_test_data):
    # Register & Login
    client.post("/api/v1/auth/register", json={"username": "usera", "email": "usera@ebk.com", "password": "password123"})
    login_resp = client.post("/api/v1/auth/login", json={"username": "usera", "password": "password123"})
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    # 1. Attempting upcoming match quiz is blocked
    attempt_upcoming_resp = client.post(
        "/api/v1/quiz/attempts",
        json={"match_id": seed_test_data["upcoming_match_id"]},
        headers=headers
    )
    assert attempt_upcoming_resp.status_code == 400

    # 2. Attempting finished match quiz succeeds
    attempt_resp = client.post(
        "/api/v1/quiz/attempts",
        json={"match_id": seed_test_data["finished_match_id"]},
        headers=headers
    )
    assert attempt_resp.status_code == 200
    attempt_data = attempt_resp.json()
    attempt_id = attempt_data["id"]
    assert attempt_data["is_completed"] is False
    assert attempt_data["current_question_index"] == 0
    assert attempt_data["total_questions"] == 2
    assert attempt_data["next_question"]["question_text"] == "Who won?"

    # 3. Submit correct answer for Q1
    submit_q1_resp = client.post(
        f"/api/v1/quiz/attempts/{attempt_id}/submit",
        json={"chosen_option": "A"},
        headers=headers
    )
    assert submit_q1_resp.status_code == 200
    q1_result = submit_q1_resp.json()
    assert q1_result["is_correct"] is True
    assert q1_result["is_completed"] is False
    assert q1_result["accumulated_score"] == 10
    assert q1_result["next_question"]["question_text"] == "How many goals did Team B score?"

    # 4. Submit incorrect answer for Q2
    submit_q2_resp = client.post(
        f"/api/v1/quiz/attempts/{attempt_id}/submit",
        json={"chosen_option": "A"},  # Correct is B
        headers=headers
    )
    assert submit_q2_resp.status_code == 200
    q2_result = submit_q2_resp.json()
    assert q2_result["is_correct"] is False
    assert q2_result["is_completed"] is True
    assert q2_result["accumulated_score"] == 10
    assert q2_result["next_question"] is None

    # 5. Fetch attempt summary
    summary_resp = client.get(f"/api/v1/quiz/attempts/{attempt_id}/summary", headers=headers)
    assert summary_resp.status_code == 200
    summary_data = summary_resp.json()
    assert summary_data["score"] == 10
    assert summary_data["correct_answers_count"] == 1
    assert len(summary_data["answers"]) == 2
    assert summary_data["answers"][0]["is_correct"] is True
    assert summary_data["answers"][1]["is_correct"] is False

    # 6. Verify user profile got updated with scores
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.json()["total_score"] == 10
    assert me_resp.json()["quizzes_completed"] == 1
    assert me_resp.json()["total_correct_answers"] == 1

def test_friends_workflow(client):
    # Register and Login User A
    client.post("/api/v1/auth/register", json={"username": "usera", "email": "usera@ebk.com", "password": "password123"})
    login_a = client.post("/api/v1/auth/login", json={"username": "usera", "password": "password123"})
    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

    # Register and Login User B
    client.post("/api/v1/auth/register", json={"username": "userb", "email": "userb@ebk.com", "password": "password123"})
    login_b = client.post("/api/v1/auth/login", json={"username": "userb", "password": "password123"})
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    # 1. User A search for User B
    search_resp = client.get("/api/v1/friends/search?username=user", headers=headers_a)
    assert search_resp.status_code == 200
    search_results = search_resp.json()
    user_b_entry = next(u for u in search_results if u["username"] == "userb")
    assert user_b_entry["friendship_status"] == "NONE"

    # 2. User A sends friend request to User B
    request_resp = client.post("/api/v1/friends/request", json={"friend_username": "userb"}, headers=headers_a)
    assert request_resp.status_code == 201

    # 3. User B searches and sees PENDING_RECEIVED status
    search_resp_b = client.get("/api/v1/friends/search?username=user", headers=headers_b)
    user_a_entry = next(u for u in search_resp_b.json() if u["username"] == "usera")
    assert user_a_entry["friendship_status"] == "PENDING_RECEIVED"
    friendship_id = user_a_entry["friendship_id"]

    # 4. User B checks pending requests list
    pending_resp = client.get("/api/v1/friends/requests/pending", headers=headers_b)
    assert len(pending_resp.json()) == 1
    assert pending_resp.json()[0]["id"] == friendship_id

    # 5. User B accepts the request
    accept_resp = client.post("/api/v1/friends/accept", json={"friendship_id": friendship_id, "action": "ACCEPT"}, headers=headers_b)
    assert accept_resp.status_code == 200

    # 6. Verify User A and User B are friends
    friends_a = client.get("/api/v1/friends/", headers=headers_a)
    assert len(friends_a.json()) == 1
    assert friends_a.json()[0]["username"] == "userb"

    # 7. Check friends leaderboard
    friend_leaderboard = client.get("/api/v1/friends/leaderboard", headers=headers_a)
    assert len(friend_leaderboard.json()) == 2
    assert friend_leaderboard.json()[0]["username"] in ["usera", "userb"]


def test_leagues_workflow(client):
    # Register and Login User A
    client.post("/api/v1/auth/register", json={"username": "leaguea", "email": "leaguea@ebk.com", "password": "password123"})
    login_a = client.post("/api/v1/auth/login", json={"username": "leaguea", "password": "password123"})
    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

    # Register and Login User B
    client.post("/api/v1/auth/register", json={"username": "leagueb", "email": "leagueb@ebk.com", "password": "password123"})
    login_b = client.post("/api/v1/auth/login", json={"username": "leagueb", "password": "password123"})
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    # 1. User A creates a private league
    create_resp = client.post("/api/v1/leagues/", json={"name": "Champions League"}, headers=headers_a)
    assert create_resp.status_code == 201
    league = create_resp.json()
    assert league["name"] == "Champions League"
    assert league["owner_id"] is not None
    league_id = league["id"]

    # 2. User B joins User A's league
    join_resp = client.post("/api/v1/leagues/join", json={"name": "Champions League"}, headers=headers_b)
    assert join_resp.status_code == 200

    # 3. User A lists their leagues
    my_leagues_resp = client.get("/api/v1/leagues/", headers=headers_a)
    assert len(my_leagues_resp.json()) == 1
    assert my_leagues_resp.json()[0]["name"] == "Champions League"

    # 4. User A checks league details and leaderboard standings
    details_resp = client.get(f"/api/v1/leagues/{league_id}", headers=headers_a)
    assert details_resp.status_code == 200
    details = details_resp.json()
    assert len(details["members"]) == 2
    # Members should be sorted by total_score
    assert details["members"][0]["username"] in ["leaguea", "leagueb"]

    # 5. User B leaves league
    leave_resp = client.post(f"/api/v1/leagues/{league_id}/leave", headers=headers_b)
    assert leave_resp.status_code == 200

    # 6. User A (owner) tries to leave but gets error
    leave_owner_resp = client.post(f"/api/v1/leagues/{league_id}/leave", headers=headers_a)
    assert leave_owner_resp.status_code == 400

    # 7. User A deletes the league
    delete_resp = client.delete(f"/api/v1/leagues/{league_id}", headers=headers_a)
    assert delete_resp.status_code == 200

