from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentConfig(BaseSettings):
    llm_api_key: str | None = Field(default=None, validation_alias="AGENT_LLM_API_KEY")
    llm_base_url: str = Field(
        default="https://api.openai.com/v1",
        validation_alias="AGENT_LLM_BASE_URL",
    )
    llm_model: str = Field(default="gpt-4o", validation_alias="AGENT_LLM_MODEL")
    decision_trace_path: Path = Path("traces/agent_decisions.jsonl")
    share_full_transcript: bool = Field(
        default=False,
        validation_alias="AGENT_SHARE_FULL_TRANSCRIPT",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        extra="ignore",
    )

    def require_api_key(self) -> str:
        if self.llm_api_key:
            return self.llm_api_key
        raise ValueError(
            "No LLM API key configured. Set AGENT_LLM_API_KEY before running in real mode."
        )
