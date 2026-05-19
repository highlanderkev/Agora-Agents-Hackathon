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
    tools: list[str] | None = None

    def __post_init__(self) -> None:
        if self.tools is None:
            if hasattr(self.policy, "allowed_tools"):
                self.tools = sorted(self.policy.allowed_tools)
            else:
                raise ValueError(
                    "Either provide 'tools' explicitly or ensure 'policy' has "
                    "'allowed_tools' attribute."
                )

    async def run(self, *, once: bool = True, mock: bool = False) -> dict[str, Any]:
        if not mock:
            self.config.require_api_key()

        if self.tools is None:
            raise ValueError("Agent tools not initialized. This should not happen.")

        user_prompt = "Run one safe strategy decision cycle."
        if not once:
            user_prompt = (
                "Run an extended safe strategy decision cycle within the configured "
                "loop limits while respecting policy limits."
            )

        trace_sink = make_file_trace_sink(self.config.decision_trace_path)

        return await run_agent_loop(
            llm_client=self.llm_client,
            tool_executor=self.tool_executor,
            system_prompt=self.system_prompt,
            user_prompt=user_prompt,
            tools=self.tools,
            trace_sink=trace_sink,
        )
