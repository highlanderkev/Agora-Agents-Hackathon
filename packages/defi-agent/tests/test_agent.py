from __future__ import annotations

from pathlib import Path

import pytest

from defi_agent.agent import DeFiAgent
from defi_agent.config import AgentConfig
from defi_agent.llm_client import MockLLMClient
from defi_agent.prompts import SWAP_SYSTEM_PROMPT


class DummyExecutor:
    async def execute(self, tool_name: str, arguments: dict[str, object]) -> dict[str, object]:
        return {"ok": True, "tool": tool_name, "arguments": arguments}


class MockPolicy:
    def __init__(self, allowed_tools: set[str]) -> None:
        self.allowed_tools = allowed_tools


@pytest.mark.asyncio
async def test_agent_run_with_mock_creates_trace_file(tmp_path: Path) -> None:
    config = AgentConfig(decision_trace_path=tmp_path / "trace.jsonl")
    llm_client = MockLLMClient(
        [
            {"type": "tool", "tool": "get_price", "arguments": {"symbol": "ETH"}},
            {"type": "final", "message": "done"},
        ]
    )

    agent = DeFiAgent(
        config=config,
        policy={"name": "mock-policy"},
        llm_client=llm_client,
        tool_executor=DummyExecutor(),
        system_prompt=SWAP_SYSTEM_PROMPT,
        tools=["get_price"],
    )

    result = await agent.run(once=True, mock=True)

    assert result["status"] == "completed"
    assert result["final_message"] == "done"
    assert config.decision_trace_path.exists()


@pytest.mark.asyncio
async def test_agent_requires_key_in_real_mode(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("AGENT_LLM_API_KEY", raising=False)
    config = AgentConfig(decision_trace_path=tmp_path / "trace.jsonl")

    agent = DeFiAgent(
        config=config,
        policy={"name": "mock-policy"},
        llm_client=MockLLMClient([]),
        tool_executor=DummyExecutor(),
        system_prompt=SWAP_SYSTEM_PROMPT,
        tools=["get_price"],
    )

    with pytest.raises(ValueError, match="No LLM API key configured"):
        await agent.run(once=True, mock=False)


@pytest.mark.asyncio
async def test_agent_derives_tools_from_policy(tmp_path: Path) -> None:
    config = AgentConfig(decision_trace_path=tmp_path / "trace.jsonl")
    policy = MockPolicy(allowed_tools={"get_price", "swap_tokens"})
    llm_client = MockLLMClient(
        [
            {"type": "tool", "tool": "get_price", "arguments": {"symbol": "ETH"}},
            {"type": "final", "message": "done"},
        ]
    )

    agent = DeFiAgent(
        config=config,
        policy=policy,
        llm_client=llm_client,
        tool_executor=DummyExecutor(),
        system_prompt=SWAP_SYSTEM_PROMPT,
    )

    assert agent.tools is not None
    assert set(agent.tools) == {"get_price", "swap_tokens"}

    result = await agent.run(once=True, mock=True)
    assert result["status"] == "completed"


def test_agent_raises_error_when_no_tools_and_no_policy_allowed_tools(tmp_path: Path) -> None:
    config = AgentConfig(decision_trace_path=tmp_path / "trace.jsonl")

    with pytest.raises(ValueError, match="Either provide 'tools' explicitly"):
        DeFiAgent(
            config=config,
            policy={"name": "mock-policy"},
            llm_client=MockLLMClient([]),
            tool_executor=DummyExecutor(),
            system_prompt=SWAP_SYSTEM_PROMPT,
        )
