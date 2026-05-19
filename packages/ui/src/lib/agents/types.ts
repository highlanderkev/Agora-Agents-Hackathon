export type AgentLlmMode = 'agent-owned' | 'ui-owned' | 'hybrid';

export interface AgentCapabilities {
  supportsMockMode: boolean;
  requiresLocalWalletAccess: boolean;
  supportedActions: string[];
  llmMode: AgentLlmMode;
}

export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  capabilities: AgentCapabilities;
}

export interface AgentExecutionRequest {
  action: string;
  input?: Record<string, unknown>;
}

export interface AgentExecutionSuccess {
  ok: true;
  agentId: string;
  action: string;
  data: unknown;
}

export interface AgentExecutionFailure {
  ok: false;
  agentId: string;
  action: string;
  error: string;
  statusCode?: number;
}

export type AgentExecutionResult = AgentExecutionSuccess | AgentExecutionFailure;

export interface AgentHealthStatus {
  ok: boolean;
  status: 'healthy' | 'degraded' | 'unavailable';
  note: string;
  details?: Record<string, unknown>;
}

export interface AgentRuntimeAdapter {
  readonly metadata: AgentMetadata;
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>;
  health(): Promise<AgentHealthStatus>;
}
