from __future__ import annotations

from typing import Any, cast


class DemoToolExecutor:
    """Passthrough executor used when the real Almanak SDK is not configured.

    Returns a structured record of every tool call so callers can inspect
    execution flow without side-effects.  Suitable for mock-mode runs and
    integration tests.
    """

    async def execute(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        return {
            "ok": True,
            "tool": tool_name,
            "arguments": arguments,
            "note": "Demo executor: no real on-chain action was performed.",
        }


class AlmanakToolExecutor:
    """Real tool executor backed by Almanak's GatewayClient + ToolExecutor."""

    def __init__(self, *, policy: Any) -> None:
        from almanak.framework.agent_tools import (  # type: ignore[import-untyped]
            ToolExecutor as FrameworkToolExecutor,
        )
        from almanak.framework.gateway_client import (  # type: ignore[import-untyped]
            GatewayClient,
        )

        self._executor = FrameworkToolExecutor(
            GatewayClient(),
            policy=policy,
        )

    async def execute(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        result = await self._executor.execute(tool_name, arguments)
        if hasattr(result, "model_dump"):
            return cast(dict[str, Any], result.model_dump(exclude_none=True))
        if isinstance(result, dict):
            return result
        return {"status": "success", "data": result}
