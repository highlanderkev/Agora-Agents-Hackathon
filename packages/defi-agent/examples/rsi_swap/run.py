from __future__ import annotations

import argparse
import asyncio

from defi_agent import AgentConfig, DeFiAgent, make_swap_policy
from defi_agent.llm_client import MockLLMClient, OpenAICompatibleLLMClient
from defi_agent.prompts import SWAP_SYSTEM_PROMPT


class DemoToolExecutor:
    async def execute(self, tool_name: str, arguments: dict[str, object]) -> dict[str, object]:
        return {"ok": True, "tool": tool_name, "arguments": arguments}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run RSI swap agent.")
    parser.add_argument("--once", action="store_true", default=False)
    parser.add_argument("--mock", action="store_true", default=False)
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    config = AgentConfig()

    if args.mock:
        llm_client = MockLLMClient(
            [
                {
                    "type": "tool",
                    "tool": "get_indicator",
                    "arguments": {"symbol": "ETH", "indicator": "rsi", "period": 14},
                },
                {
                    "type": "tool",
                    "tool": "record_decision",
                    "arguments": {"decision": "hold", "reason": "RSI neutral"},
                },
                {"type": "final", "message": "Cycle complete."},
            ]
        )
    else:
        llm_client = OpenAICompatibleLLMClient(
            model=config.llm_model,
            base_url=config.llm_base_url,
            api_key=config.require_api_key(),
        )

    agent = DeFiAgent(
        config=config,
        policy=make_swap_policy(),
        llm_client=llm_client,
        tool_executor=DemoToolExecutor(),
        system_prompt=SWAP_SYSTEM_PROMPT,
        tools=["get_price", "get_balance", "get_indicator", "swap_tokens", "record_decision"],
    )

    result = await agent.run(once=args.once, mock=args.mock)
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
