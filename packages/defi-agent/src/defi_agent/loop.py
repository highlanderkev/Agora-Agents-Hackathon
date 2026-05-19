from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Protocol, TypedDict


class AgentAction(TypedDict, total=False):
    type: str
    tool: str
    arguments: dict[str, Any]
    message: str


class AgentLoopClient(Protocol):
    async def next_action(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        transcript: list[dict[str, Any]],
        tools: list[str],
    ) -> AgentAction: ...


class ToolExecutor(Protocol):
    async def execute(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]: ...


def make_file_trace_sink(trace_path: Path):
    trace_path.parent.mkdir(parents=True, exist_ok=True)

    def _sink(event: dict[str, Any]) -> None:
        with trace_path.open("a", encoding="utf-8") as trace_file:
            trace_file.write(json.dumps(event, default=str) + "\n")

    return _sink


async def run_agent_loop(
    *,
    llm_client: AgentLoopClient,
    tool_executor: ToolExecutor,
    system_prompt: str,
    user_prompt: str,
    tools: list[str],
    max_steps: int = 6,
    trace_sink: Any | None = None,
) -> dict[str, Any]:
    transcript: list[dict[str, Any]] = []

    for step in range(1, max_steps + 1):
        action = await llm_client.next_action(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            transcript=transcript,
            tools=tools,
        )

        if trace_sink:
            trace_sink({"step": step, "role": "agent", "action": action})

        action_type = action.get("type", "final")
        if action_type == "final":
            return {
                "status": "completed",
                "steps": step,
                "final_message": action.get("message", "No action taken."),
                "transcript": transcript,
            }

        tool_name = action.get("tool")
        arguments = action.get("arguments", {})
        if not tool_name:
            return {
                "status": "failed",
                "steps": step,
                "error": "Agent returned tool action without tool name.",
                "transcript": transcript,
            }

        tool_result = await tool_executor.execute(tool_name, arguments)
        tool_event = {
            "step": step,
            "role": "tool",
            "tool": tool_name,
            "arguments": arguments,
            "result": tool_result,
        }
        transcript.append(tool_event)
        if trace_sink:
            trace_sink(tool_event)

    return {
        "status": "max_steps_reached",
        "steps": max_steps,
        "final_message": "Maximum steps reached without terminal response.",
        "transcript": transcript,
    }
