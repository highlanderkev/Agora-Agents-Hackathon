from __future__ import annotations

from typing import Any

import httpx
import pytest

from defi_agent.llm_client import OpenAICompatibleLLMClient


def test_parse_content_as_json_with_wrapped_text() -> None:
    payload = "Result:\n{\"type\": \"final\", \"message\": \"done\"}\n"

    result = OpenAICompatibleLLMClient._parse_content_as_json(payload)

    assert result["type"] == "final"
    assert result["message"] == "done"


def test_coerce_action_validates_tool_shape() -> None:
    action = OpenAICompatibleLLMClient._coerce_action(
        {"type": "tool", "tool": "get_price", "arguments": {"symbol": "ETH"}}
    )

    assert action["type"] == "tool"
    assert action["tool"] == "get_price"
    assert action["arguments"] == {"symbol": "ETH"}


@pytest.mark.asyncio
async def test_next_action_makes_chat_completion_request(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, Any]:
            content = (
                '{"type":"tool","tool":"get_balance",'
                '"arguments":{"token":"USDC"}}'
            )
            return {
                "choices": [
                    {
                        "message": {
                            "content": content
                        }
                    }
                ]
            }

    class FakeClient:
        def __init__(self, timeout: float) -> None:
            captured["timeout"] = timeout

        async def __aenter__(self) -> FakeClient:
            return self

        async def __aexit__(self, exc_type, exc, tb) -> None:
            return None

        async def post(
            self,
            url: str,
            *,
            headers: dict[str, str],
            json: dict[str, Any],
        ) -> FakeResponse:
            captured["url"] = url
            captured["headers"] = headers
            captured["json"] = json
            return FakeResponse()

    monkeypatch.setattr("defi_agent.llm_client.httpx.AsyncClient", FakeClient)

    client = OpenAICompatibleLLMClient(
        model="gpt-4o",
        base_url="https://api.openai.com/v1",
        api_key="test-key",
    )

    action = await client.next_action(
        system_prompt="system",
        user_prompt="user",
        transcript=[],
        tools=["get_balance"],
    )

    assert captured["url"] == "https://api.openai.com/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer test-key"
    assert captured["json"]["model"] == "gpt-4o"
    assert action["type"] == "tool"
    assert action["tool"] == "get_balance"


@pytest.mark.asyncio
async def test_next_action_raises_runtime_error_on_http_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FailingResponse:
        def raise_for_status(self) -> None:
            request = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
            response = httpx.Response(status_code=500, request=request)
            raise httpx.HTTPStatusError("Server error", request=request, response=response)

        def json(self) -> dict[str, Any]:
            return {}

    class FailingClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        async def __aenter__(self) -> FailingClient:
            return self

        async def __aexit__(self, exc_type, exc, tb) -> None:
            return None

        async def post(
            self,
            url: str,
            *,
            headers: dict[str, str],
            json: dict[str, Any],
        ) -> FailingResponse:
            del url, headers, json
            return FailingResponse()

    monkeypatch.setattr("defi_agent.llm_client.httpx.AsyncClient", FailingClient)

    client = OpenAICompatibleLLMClient(
        model="gpt-4o",
        base_url="https://api.openai.com/v1",
        api_key="test-key",
    )

    with pytest.raises(RuntimeError, match="LLM request failed"):
        await client.next_action(
            system_prompt="system",
            user_prompt="user",
            transcript=[],
            tools=["get_balance"],
        )
