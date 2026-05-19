export class UnknownAgentError extends Error {
  readonly statusCode = 404;

  constructor(agentId: string) {
    super(`Unknown agent: ${agentId}`);
    this.name = 'UnknownAgentError';
  }
}
