from __future__ import annotations

from decimal import Decimal
from importlib import import_module
from typing import Any


def _load_agent_policy_cls() -> type:
    module = import_module("almanak.framework.agent_tools")
    return module.AgentPolicy


def _build_policy(**kwargs: Any) -> Any:
    policy_cls = _load_agent_policy_cls()
    return policy_cls(**kwargs)


def make_swap_policy() -> Any:
    return _build_policy(
        max_single_trade_usd=Decimal("100"),
        max_daily_spend_usd=Decimal("500"),
        max_position_size_usd=Decimal("2000"),
        allowed_chains={"arbitrum"},
        allowed_tokens={"USDC", "WETH", "ETH"},
        allowed_tools={
            "get_price",
            "get_balance",
            "get_indicator",
            "swap_tokens",
            "save_agent_state",
            "load_agent_state",
            "record_decision",
        },
        max_trades_per_hour=5,
        cooldown_seconds=30,
        max_consecutive_failures=3,
        stop_loss_pct=Decimal("5.0"),
        require_simulation_before_execution=True,
    )


def make_lp_policy() -> Any:
    return _build_policy(
        max_single_trade_usd=Decimal("150"),
        max_daily_spend_usd=Decimal("750"),
        max_position_size_usd=Decimal("3000"),
        allowed_chains={"avalanche"},
        allowed_tokens={"WAVAX", "USDC", "AVAX"},
        allowed_tools={
            "get_price",
            "get_balance",
            "open_lp_position",
            "close_lp_position",
            "swap_tokens",
            "save_agent_state",
            "load_agent_state",
            "record_decision",
        },
        max_trades_per_hour=4,
        cooldown_seconds=60,
        max_consecutive_failures=3,
        stop_loss_pct=Decimal("6.0"),
        require_simulation_before_execution=True,
    )


def make_yield_policy() -> Any:
    return _build_policy(
        max_single_trade_usd=Decimal("200"),
        max_daily_spend_usd=Decimal("1000"),
        max_position_size_usd=Decimal("5000"),
        allowed_chains={"avalanche"},
        allowed_tokens={"USDC", "WAVAX", "AVAX"},
        allowed_tools={
            "get_price",
            "get_balance",
            "get_indicator",
            "supply_lending",
            "withdraw_lending",
            "swap_tokens",
            "save_agent_state",
            "load_agent_state",
            "record_decision",
        },
        max_trades_per_hour=3,
        cooldown_seconds=120,
        max_consecutive_failures=3,
        stop_loss_pct=Decimal("7.0"),
        require_simulation_before_execution=True,
    )
