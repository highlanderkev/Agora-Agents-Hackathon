"""Tests for the DeFi agent HTTP service (server.py).

Uses FastAPI's built-in TestClient (runs synchronously via httpx) so that
the agent loop executes in-process without needing a real LLM or Almanak SDK.
All runs use mock=true which substitutes MockLLMClient + DemoToolExecutor.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from defi_agent.server import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------


def test_health_returns_200():
    response = client.get("/health")
    assert response.status_code == 200


def test_health_body_shape():
    data = client.get("/health").json()
    assert data["ok"] is True
    assert data["status"] == "healthy"
    assert "note" in data
    assert "supported_actions" in data
    assert "run-strategy-cycle" in data["supported_actions"]


def test_health_llm_configured_reflects_missing_key(monkeypatch):
    """When AGENT_LLM_API_KEY is absent the flag should be False."""
    monkeypatch.delenv("AGENT_LLM_API_KEY", raising=False)
    data = client.get("/health").json()
    assert data["llm_configured"] is False


# ---------------------------------------------------------------------------
# /execute – happy paths (mock mode)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("strategy", ["rsi_swap", "lp_manager", "yield_farmer"])
def test_execute_mock_all_strategies(strategy: str):
    response = client.post(
        "/execute",
        json={"action": "run-strategy-cycle", "input": {"mock": True, "strategy": strategy}},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["mock"] is True
    assert data["strategy"] == strategy
    assert "status" in data  # propagated from agent loop result


def test_execute_mock_default_strategy():
    """When strategy is omitted it defaults to rsi_swap."""
    response = client.post(
        "/execute",
        json={"action": "run-strategy-cycle", "input": {"mock": True}},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["strategy"] == "rsi_swap"


def test_execute_mock_completed_status():
    """The mock scripted actions should reach 'completed' status."""
    data = client.post(
        "/execute",
        json={"action": "run-strategy-cycle", "input": {"mock": True}},
    ).json()
    assert data["status"] == "completed"
    assert "final_message" in data


# ---------------------------------------------------------------------------
# /execute – validation errors
# ---------------------------------------------------------------------------


def test_execute_unknown_action_returns_400():
    response = client.post(
        "/execute",
        json={"action": "do-something-wild", "input": {"mock": True}},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["ok"] is False
    assert "Unsupported action" in data["error"]


def test_execute_unknown_strategy_returns_400():
    response = client.post(
        "/execute",
        json={"action": "run-strategy-cycle", "input": {"mock": True, "strategy": "moon-shot"}},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["ok"] is False
    assert "Unsupported strategy" in data["error"]


def test_execute_no_api_key_real_mode_returns_503(monkeypatch):
    """Without an API key, real-mode requests should be rejected."""
    monkeypatch.delenv("AGENT_LLM_API_KEY", raising=False)
    response = client.post(
        "/execute",
        json={"action": "run-strategy-cycle", "input": {"mock": False}},
    )
    assert response.status_code == 503
    data = response.json()
    assert data["ok"] is False
    assert "AGENT_LLM_API_KEY" in data["error"]
