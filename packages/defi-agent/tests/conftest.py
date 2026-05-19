from __future__ import annotations

import pytest

from defi_agent.config import AgentConfig
from defi_agent.llm_client import MockLLMClient


class DummyToolExecutor:
    async def execute(self, tool_name: str, arguments: dict[str, object]) -> dict[str, object]:
        return {"ok": True, "tool": tool_name, "arguments": arguments}


@pytest.fixture
def mock_llm_client() -> MockLLMClient:
    return MockLLMClient(
        [
            {"type": "tool", "tool": "get_price", "arguments": {"symbol": "ETH"}},
            {"type": "final", "message": "done"},
        ]
    )


@pytest.fixture
def tool_executor() -> DummyToolExecutor:
    return DummyToolExecutor()


@pytest.fixture
def agent_config(tmp_path) -> AgentConfig:
    return AgentConfig(decision_trace_path=tmp_path / "agent_trace.jsonl")
