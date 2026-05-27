"""Basic API tests - run with: pytest tests/"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_list_datasets():
    r = client.get("/datasets")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 2
    ids = {d["id"] for d in data}
    assert "fish" in ids
    assert "pokemon" in ids


def test_session_and_execute():
    r = client.post("/sessions")
    assert r.status_code == 200
    sid = r.json()["session_id"]

    r2 = client.post(
        f"/sessions/{sid}/execute",
        json={"code": "a = 10\nprint(a)", "cell_id": "1"},
    )
    assert r2.status_code == 200
    assert r2.json()["ok"] is True
    assert "10" in r2.json()["stdout"]

    r3 = client.post(
        f"/sessions/{sid}/execute",
        json={"code": "print(a)", "cell_id": "2"},
    )
    assert r3.status_code == 200
    assert "10" in r3.json()["stdout"]

    client.delete(f"/sessions/{sid}")


def test_safety_blocks_os():
    r = client.post("/sessions")
    sid = r.json()["session_id"]
    r2 = client.post(
        f"/sessions/{sid}/execute",
        json={"code": "import os", "cell_id": "1"},
    )
    assert r2.json()["ok"] is False
    client.delete(f"/sessions/{sid}")
