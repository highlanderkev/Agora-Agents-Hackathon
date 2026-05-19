from __future__ import annotations

import pytest

from defi_agent.config import AgentConfig


def test_config_reads_agent_env_vars(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENT_LLM_API_KEY", "test-key")
    monkeypatch.setenv("AGENT_LLM_BASE_URL", "https://example.test/v1")
    monkeypatch.setenv("AGENT_LLM_MODEL", "test-model")

    cfg = AgentConfig()

    assert cfg.llm_api_key == "test-key"
    assert cfg.llm_base_url == "https://example.test/v1"
    assert cfg.llm_model == "test-model"


def test_require_api_key_raises_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENT_LLM_API_KEY", raising=False)
    cfg = AgentConfig()

    with pytest.raises(ValueError, match="No LLM API key configured"):
        cfg.require_api_key()
