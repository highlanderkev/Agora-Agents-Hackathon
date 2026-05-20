from __future__ import annotations

from typing import Any


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
