from __future__ import annotations

from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from defi_agent import policy


class DummyPolicy:
    def __init__(self, **kwargs):
        self.kwargs = kwargs


def test_make_swap_policy(monkeypatch) -> None:
    monkeypatch.setattr(policy, "_load_agent_policy_cls", lambda: DummyPolicy)

    result = policy.make_swap_policy()

    assert isinstance(result, DummyPolicy)
    assert result.kwargs["max_single_trade_usd"] == Decimal("100")
    assert "swap_tokens" in result.kwargs["allowed_tools"]
    assert "arbitrum" in result.kwargs["allowed_chains"]


def test_make_lp_policy(monkeypatch) -> None:
    monkeypatch.setattr(policy, "_load_agent_policy_cls", lambda: DummyPolicy)

    result = policy.make_lp_policy()

    assert isinstance(result, DummyPolicy)
    assert "open_lp_position" in result.kwargs["allowed_tools"]
    assert "avalanche" in result.kwargs["allowed_chains"]


def test_make_yield_policy(monkeypatch) -> None:
    monkeypatch.setattr(policy, "_load_agent_policy_cls", lambda: DummyPolicy)

    result = policy.make_yield_policy()

    assert isinstance(result, DummyPolicy)
    assert "supply_lending" in result.kwargs["allowed_tools"]
    assert result.kwargs["stop_loss_pct"] == Decimal("7.0")


def test_load_agent_policy_cls_raises_clear_error_on_missing_module(monkeypatch) -> None:
    def mock_import_module(name: str):
        raise ModuleNotFoundError(f"No module named '{name}'")

    monkeypatch.setattr("defi_agent.policy.import_module", mock_import_module)

    with pytest.raises(ImportError, match="Failed to import 'almanak.framework.agent_tools'"):
        policy._load_agent_policy_cls()


def test_load_agent_policy_cls_raises_clear_error_on_missing_attribute(monkeypatch) -> None:
    # Use MagicMock with empty spec to create a module that genuinely lacks AgentPolicy
    mock_module = MagicMock(spec=[])

    def mock_import_module(name: str):
        return mock_module

    monkeypatch.setattr("defi_agent.policy.import_module", mock_import_module)

    with pytest.raises(
        ImportError, match="does not have 'AgentPolicy' attribute"
    ):
        policy._load_agent_policy_cls()
