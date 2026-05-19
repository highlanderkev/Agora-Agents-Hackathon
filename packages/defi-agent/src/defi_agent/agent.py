from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .config import AgentConfig
from .loop import make_file_trace_sink, run_agent_loop


@dataclass(slots=True)
class DeFiAgent:
    config: AgentConfig
    policy: Any
    llm_client: Any
    tool_executor: Any
    system_prompt: str
    tools: list[str]

    async def run(self, *, once: bool = True, mock: bool = False) -> dict[str, Any]:
        if not mock:
            self.config.require_api_key()

        user_prompt = "Run one safe strategy decision cycle."
        if not once:
            user_prompt = "Run continuous strategy cycles while respecting policy limits."

        trace_sink = make_file_trace_sink(self.config.decision_trace_path)

        return await run_agent_loop(
            llm_client=self.llm_client,
            tool_executor=self.tool_executor,
            system_prompt=self.system_prompt,
            user_prompt=user_prompt,
            tools=self.tools,
            trace_sink=trace_sink,
        )
