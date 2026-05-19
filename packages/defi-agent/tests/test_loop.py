from __future__ import annotations

import pytest

from defi_agent.llm_client import MockLLMClient
from defi_agent.loop import run_agent_loop


class TrackingExecutor:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, object]]] = []

    async def execute(self, tool_name: str, arguments: dict[str, object]) -> dict[str, object]:
        self.calls.append((tool_name, arguments))
        return {"ok": True}


class FailingExecutor:
    async def execute(self, tool_name: str, arguments: dict[str, object]) -> dict[str, object]:
        raise RuntimeError("Simulated tool failure")


@pytest.mark.asyncio
async def test_run_agent_loop_rejects_tool_not_in_allowlist() -> None:
    executor = TrackingExecutor()
    trace_events: list[dict[str, object]] = []

    result = await run_agent_loop(
        llm_client=MockLLMClient(
            [{"type": "tool", "tool": "sell_everything", "arguments": {"symbol": "ETH"}}]
        ),
        tool_executor=executor,
        system_prompt="system",
        user_prompt="user",
        tools=["get_price"],
        trace_sink=trace_events.append,
    )

    assert result["status"] == "failed"
    assert result["error"] == "Agent requested unauthorized tool: sell_everything."
    assert executor.calls == []
    assert result["transcript"] == [
        {
            "step": 1,
            "role": "tool",
            "tool": "sell_everything",
            "arguments": {"symbol": "ETH"},
            "status": "failed",
            "error": "Agent requested unauthorized tool: sell_everything.",
        }
    ]
    assert trace_events[-1]["tool"] == "sell_everything"
    assert trace_events[-1]["status"] == "failed"


@pytest.mark.asyncio
async def test_run_agent_loop_handles_tool_execution_exception() -> None:
    executor = FailingExecutor()
    trace_events: list[dict[str, object]] = []

    result = await run_agent_loop(
        llm_client=MockLLMClient(
            [{"type": "tool", "tool": "get_price", "arguments": {"symbol": "ETH"}}]
        ),
        tool_executor=executor,
        system_prompt="system",
        user_prompt="user",
        tools=["get_price"],
        trace_sink=trace_events.append,
    )

    assert result["status"] == "failed"
    assert "Tool execution failed" in result["error"]
    assert "Simulated tool failure" in result["error"]
    assert len(result["transcript"]) == 1
    assert result["transcript"][0]["status"] == "failed"
    assert result["transcript"][0]["tool"] == "get_price"
    assert "error" in result["transcript"][0]
    assert trace_events[-1]["status"] == "failed"
