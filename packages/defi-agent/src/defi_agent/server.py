"""HTTP service layer for the DeFi agent.

Exposes two endpoints consumed by the UI adapter:

    POST /execute  { "action": "run-strategy-cycle", "input": { ... } }
    GET  /health

Environment variables
---------------------
AGENT_LLM_API_KEY   – required for real-mode execution.
AGENT_LLM_BASE_URL  – defaults to https://api.openai.com/v1.
AGENT_LLM_MODEL     – defaults to gpt-4o.
SERVICE_HOST        – host the server binds to (default 127.0.0.1).
SERVICE_PORT        – port the server listens on (default 8001).
"""

from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .agent import DeFiAgent
from .config import AgentConfig
from .llm_client import MockLLMClient, OpenAICompatibleLLMClient
from .policy import make_lp_policy, make_swap_policy, make_yield_policy
from .prompts import LP_SYSTEM_PROMPT, SWAP_SYSTEM_PROMPT, YIELD_SYSTEM_PROMPT
from .tool_executor import DemoToolExecutor

app = FastAPI(title="DeFi Agent Service", version="0.1.0")

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

SUPPORTED_ACTIONS = frozenset({"run-strategy-cycle"})

STRATEGY_SWAP = "rsi_swap"
STRATEGY_LP = "lp_manager"
STRATEGY_YIELD = "yield_farmer"
SUPPORTED_STRATEGIES = frozenset({STRATEGY_SWAP, STRATEGY_LP, STRATEGY_YIELD})


class ExecuteInput(BaseModel):
    strategy: str = Field(
        default=STRATEGY_SWAP,
        description="Which DeFi strategy to run: rsi_swap, lp_manager, yield_farmer.",
    )
    mock: bool = Field(
        default=False,
        description="When true, use MockLLMClient and DemoToolExecutor without API key.",
    )


class ExecuteRequest(BaseModel):
    action: str
    input: ExecuteInput = Field(default_factory=ExecuteInput)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_STRATEGY_CONFIG: dict[str, dict[str, Any]] = {
    STRATEGY_SWAP: {
        "policy_factory": make_swap_policy,
        "system_prompt": SWAP_SYSTEM_PROMPT,
        "tools": [
            "get_price",
            "get_balance",
            "get_indicator",
            "swap_tokens",
            "record_decision",
        ],
        "mock_actions": [
            {
                "type": "tool",
                "tool": "get_indicator",
                "arguments": {"symbol": "ETH", "indicator": "rsi", "period": 14},
            },
            {
                "type": "tool",
                "tool": "record_decision",
                "arguments": {"decision": "hold", "reason": "RSI neutral (mock run)."},
            },
            {"type": "final", "message": "Mock RSI swap cycle complete."},
        ],
    },
    STRATEGY_LP: {
        "policy_factory": make_lp_policy,
        "system_prompt": LP_SYSTEM_PROMPT,
        "tools": [
            "get_price",
            "get_balance",
            "open_lp_position",
            "close_lp_position",
            "swap_tokens",
            "record_decision",
        ],
        "mock_actions": [
            {
                "type": "tool",
                "tool": "get_price",
                "arguments": {"symbol": "AVAX"},
            },
            {
                "type": "tool",
                "tool": "record_decision",
                "arguments": {"decision": "hold", "reason": "Position in range (mock run)."},
            },
            {"type": "final", "message": "Mock LP management cycle complete."},
        ],
    },
    STRATEGY_YIELD: {
        "policy_factory": make_yield_policy,
        "system_prompt": YIELD_SYSTEM_PROMPT,
        "tools": [
            "get_price",
            "get_balance",
            "get_indicator",
            "supply_lending",
            "withdraw_lending",
            "swap_tokens",
            "record_decision",
        ],
        "mock_actions": [
            {
                "type": "tool",
                "tool": "get_balance",
                "arguments": {"token": "USDC"},
            },
            {
                "type": "tool",
                "tool": "record_decision",
                "arguments": {"decision": "hold", "reason": "Yield conditions unchanged (mock run)."},
            },
            {"type": "final", "message": "Mock yield farmer cycle complete."},
        ],
    },
}


def _build_agent(config: AgentConfig, strategy: str, mock: bool) -> DeFiAgent:
    strategy_cfg = _STRATEGY_CONFIG[strategy]

    if mock:
        llm_client: Any = MockLLMClient(strategy_cfg["mock_actions"])
    else:
        llm_client = OpenAICompatibleLLMClient(
            model=config.llm_model,
            base_url=config.llm_base_url,
            api_key=config.require_api_key(),
        )

    return DeFiAgent(
        config=config,
        policy=strategy_cfg["policy_factory"](),
        llm_client=llm_client,
        tool_executor=DemoToolExecutor(),
        system_prompt=strategy_cfg["system_prompt"],
        tools=strategy_cfg["tools"],
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
async def health() -> JSONResponse:
    config = AgentConfig()
    has_key = bool(config.llm_api_key)

    return JSONResponse(
        {
            "ok": True,
            "status": "healthy",
            "note": (
                "DeFi agent service is running. LLM API key is configured."
                if has_key
                else "DeFi agent service is running. No LLM API key: mock mode only."
            ),
            "llm_configured": has_key,
            "supported_actions": list(SUPPORTED_ACTIONS),
        }
    )


@app.post("/execute")
async def execute(body: ExecuteRequest) -> JSONResponse:
    if body.action not in SUPPORTED_ACTIONS:
        return JSONResponse(
            {
                "ok": False,
                "error": (
                    f"Unsupported action: {body.action!r}. "
                    f"Supported: {sorted(SUPPORTED_ACTIONS)}"
                ),
            },
            status_code=400,
        )

    strategy = body.input.strategy
    if strategy not in SUPPORTED_STRATEGIES:
        return JSONResponse(
            {
                "ok": False,
                "error": (
                    f"Unsupported strategy: {strategy!r}. "
                    f"Supported: {sorted(SUPPORTED_STRATEGIES)}"
                ),
            },
            status_code=400,
        )

    mock = body.input.mock
    config = AgentConfig()

    if not mock and not config.llm_api_key:
        return JSONResponse(
            {
                "ok": False,
                "error": (
                    "AGENT_LLM_API_KEY is not configured. "
                    "Pass mock=true in the request input to run without a real LLM."
                ),
            },
            status_code=503,
        )

    try:
        agent = _build_agent(config, strategy, mock)
        result = await agent.run(once=True, mock=mock)
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(
            {"ok": False, "error": str(exc)},
            status_code=500,
        )

    return JSONResponse(
        {
            "ok": True,
            "action": body.action,
            "strategy": strategy,
            "mock": mock,
            **result,
        }
    )


# ---------------------------------------------------------------------------
# Entry-point
# ---------------------------------------------------------------------------


def main() -> None:
    import uvicorn

    host = os.environ.get("SERVICE_HOST", "127.0.0.1")
    port = int(os.environ.get("SERVICE_PORT", "8001"))
    uvicorn.run("defi_agent.server:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
