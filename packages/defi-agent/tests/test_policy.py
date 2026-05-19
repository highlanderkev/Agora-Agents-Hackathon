from __future__ import annotations

from decimal import Decimal

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
