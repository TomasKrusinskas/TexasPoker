import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import db
import uuid

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Setup test database before each test."""
    db.init_db()
    yield
    pass


def test_root_endpoint():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["message"] == "Poker API"


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_create_hand():
    """Test creating a new hand."""
    hand_data = {
        "hand_id": str(uuid.uuid4()),
        "stack_size": 10000,
        "dealer_position": 3,
        "small_blind_position": 4,
        "big_blind_position": 5,
        "player_cards": {
            "1": "Tc2c",
            "2": "5d4c",
            "3": "Ah4s",
            "4": "QcTd",
            "5": "Js9d",
            "6": "8h6s"
        },
        "actions": [
            {"round": "preflop", "player": 6, "action": "fold"},
            {"round": "preflop", "player": 1, "action": "fold"},
            {"round": "preflop", "player": 2, "action": "fold"},
            {"round": "preflop", "player": 3, "action": "fold"},
            {"round": "preflop", "player": 4, "action": "call", "amount": 40},
            {"round": "preflop", "player": 5, "action": "check"}
        ],
        "board_cards": None
    }

    response = client.post("/api/v1/hands/", json=hand_data)
    assert response.status_code == 201

    data = response.json()
    assert data["hand_id"] == hand_data["hand_id"]
    assert data["stack_size"] == hand_data["stack_size"]
    assert "winnings" in data
    assert "created_at" in data


def test_create_duplicate_hand():
    """Test creating a duplicate hand returns 409."""
    hand_id = str(uuid.uuid4())
    hand_data = {
        "hand_id": hand_id,
        "stack_size": 10000,
        "dealer_position": 3,
        "small_blind_position": 4,
        "big_blind_position": 5,
        "player_cards": {
            "1": "Tc2c",
            "2": "5d4c",
            "3": "Ah4s",
            "4": "QcTd",
            "5": "Js9d",
            "6": "8h6s"
        },
        "actions": [
            {"round": "preflop", "player": 6, "action": "fold"}
        ],
        "board_cards": None
    }

    response = client.post("/api/v1/hands/", json=hand_data)
    assert response.status_code == 201

    response = client.post("/api/v1/hands/", json=hand_data)
    assert response.status_code == 409


def test_get_hand():
    """Test getting a specific hand."""
    hand_id = str(uuid.uuid4())
    hand_data = {
        "hand_id": hand_id,
        "stack_size": 10000,
        "dealer_position": 1,
        "small_blind_position": 2,
        "big_blind_position": 3,
        "player_cards": {
            "1": "AsKs",
            "2": "2d3d",
            "3": "4h5h",
            "4": "6c7c",
            "5": "8s9s",
            "6": "TdJd"
        },
        "actions": [
            {"round": "preflop", "player": 4, "action": "fold"},
            {"round": "preflop", "player": 5, "action": "fold"},
            {"round": "preflop", "player": 6, "action": "fold"},
            {"round": "preflop", "player": 1, "action": "raise", "amount": 100},
            {"round": "preflop", "player": 2, "action": "fold"},
            {"round": "preflop", "player": 3, "action": "call", "amount": 100}
        ],
        "board_cards": None
    }

    create_response = client.post("/api/v1/hands/", json=hand_data)
    assert create_response.status_code == 201

    response = client.get(f"/api/v1/hands/{hand_id}")
    assert response.status_code == 200

    data = response.json()
    assert data["hand_id"] == hand_id
    assert data["stack_size"] == 10000


def test_get_nonexistent_hand():
    """Test getting a hand that doesn't exist returns 404."""
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/hands/{fake_id}")
    assert response.status_code == 404


def test_get_hands_list():
    """Test getting list of hands."""
    response = client.get("/api/v1/hands/")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)

    for item in data:
        assert "hand_id" in item
        assert "display_lines" in item
        assert "created_at" in item
        assert isinstance(item["display_lines"], list)


def test_delete_hand():
    """Test deleting a hand."""
    hand_id = str(uuid.uuid4())
    hand_data = {
        "hand_id": hand_id,
        "stack_size": 10000,
        "dealer_position": 1,
        "small_blind_position": 2,
        "big_blind_position": 3,
        "player_cards": {
            "1": "AsKs",
            "2": "2d3d",
            "3": "4h5h",
            "4": "6c7c",
            "5": "8s9s",
            "6": "TdJd"
        },
        "actions": [
            {"round": "preflop", "player": 4, "action": "fold"}
        ],
        "board_cards": None
    }

    create_response = client.post("/api/v1/hands/", json=hand_data)
    assert create_response.status_code == 201

    response = client.delete(f"/api/v1/hands/{hand_id}")
    assert response.status_code == 204

    get_response = client.get(f"/api/v1/hands/{hand_id}")
    assert get_response.status_code == 404


def test_delete_nonexistent_hand():
    """Test deleting a hand that doesn't exist returns 404."""
    fake_id = str(uuid.uuid4())
    response = client.delete(f"/api/v1/hands/{fake_id}")
    assert response.status_code == 404