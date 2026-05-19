from __future__ import annotations

import json
from collections.abc import Iterable
from copy import deepcopy
from json import JSONDecodeError
from typing import Any, cast

import httpx

ACTION_FORMAT_GUIDANCE = (
    "Return exactly one JSON object with keys: "
    'type ("tool" or "final"), tool (string, required when type is "tool"), '
    "arguments (object), and message (string, optional)."
)


class MockLLMClient:
    def __init__(self, scripted_actions: Iterable[dict[str, Any]]) -> None:
        self._actions = list(scripted_actions)
        self._cursor = 0

    async def next_action(self, **_: Any) -> dict[str, Any]:
        if self._cursor >= len(self._actions):
            return {"type": "final", "message": "No more scripted actions."}

        action = deepcopy(self._actions[self._cursor])
        self._cursor += 1
        return action


class OpenAICompatibleLLMClient:
    def __init__(
        self,
        *,
        model: str,
        base_url: str,
        api_key: str,
        timeout_seconds: float = 30.0,
    ) -> None:
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds

    @staticmethod
    def _coerce_action(payload: Any) -> dict[str, Any]:
        if isinstance(payload, dict):
            action = dict(payload)
        elif isinstance(payload, str):
            action = OpenAICompatibleLLMClient._parse_content_as_json(payload)
        else:
            raise ValueError("LLM response must be a JSON object or JSON string.")

        action_type = action.get("type", "final")
        if action_type not in {"tool", "final"}:
            raise ValueError("LLM action.type must be 'tool' or 'final'.")

        if action_type == "tool" and not action.get("tool"):
            raise ValueError("LLM tool action missing required 'tool' field.")

        if "arguments" in action and not isinstance(action["arguments"], dict):
            raise ValueError("LLM action.arguments must be an object.")

        action.setdefault("arguments", {})
        return action

    @staticmethod
    def _parse_content_as_json(content: str) -> dict[str, Any]:
        stripped = content.strip()
        try:
            parsed = json.loads(stripped)
            return cast(dict[str, Any], parsed)
        except JSONDecodeError:
            pass

        start_idx = stripped.find("{")
        end_idx = stripped.rfind("}")
        if start_idx == -1 or end_idx == -1 or end_idx <= start_idx:
            raise ValueError("LLM response did not include a JSON object.")

        candidate = stripped[start_idx : end_idx + 1]
        try:
            parsed = json.loads(candidate)
            return cast(dict[str, Any], parsed)
        except JSONDecodeError as exc:
            raise ValueError("Failed to parse JSON action from LLM response.") from exc

    @staticmethod
    def _build_transcript_summary(transcript: list[dict[str, Any]]) -> str:
        if not transcript:
            return "No prior tool calls."
        return json.dumps(transcript[-8:], default=str)

    async def next_action(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        transcript: list[dict[str, Any]],
        tools: list[str],
    ) -> dict[str, Any]:
        tool_list = ", ".join(tools)
        messages: list[dict[str, str]] = [
            {
                "role": "system",
                "content": (
                    f"{system_prompt}\n\n"
                    "You control a DeFi strategy loop. "
                    f"Available tools: {tool_list}.\n"
                    f"{ACTION_FORMAT_GUIDANCE}"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Instruction: {user_prompt}\n"
                    f"Recent transcript: {self._build_transcript_summary(transcript)}"
                ),
            },
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        endpoint = f"{self.base_url}/chat/completions"

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(endpoint, headers=headers, json=payload)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"LLM request failed: {exc}") from exc

        data = response.json()
        choices = data.get("choices")
        if not choices:
            raise RuntimeError("LLM response did not include choices.")

        first_choice = choices[0]
        message = first_choice.get("message", {})
        content = message.get("content")

        if content is None:
            raise RuntimeError("LLM response did not include message content.")

        return self._coerce_action(content)
