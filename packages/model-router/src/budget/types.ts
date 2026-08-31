/** Mirrors @stackby/schema-types StudioError — kept local to avoid rootDir cross-package source resolution issues */
export interface StudioErrorShape {
  code: string;
  message: string;
  httpStatus: number;
  retryable: boolean;
  userMessage: string;
  details?: Record<string, unknown>;
}

export interface BudgetCeiling {
  runId?: string;
  projectId?: string;
  workspaceId: string;
  limitUsd: number;
}

export interface BudgetKey {
  workspaceId: string;
  projectId?: string;
  runId?: string;
}

export class BudgetExceededError extends Error {
  readonly code = 'BUDGET_EXCEEDED';
  readonly httpStatus = 402;
  readonly retryable = false;
  readonly userMessage: string;
  readonly resumeInstructions: string;

  constructor(
    public readonly scope: 'run' | 'project' | 'workspace',
    public readonly limitUsd: number,
    public readonly usedUsd: number,
    public readonly workspaceId: string,
  ) {
    const scopeLabel =
      scope === 'run' ? 'this run' : scope === 'project' ? 'this project' : 'your workspace';
    super(`Budget ceiling ($${limitUsd.toFixed(4)}) exceeded for ${scopeLabel}. Used: $${usedUsd.toFixed(4)}`);
    this.name = 'BudgetExceededError';
    this.userMessage = `AI generation budget for ${scopeLabel} has been reached ($${limitUsd.toFixed(2)}).`;
    this.resumeInstructions =
      scope === 'workspace'
        ? 'Contact your workspace admin to increase the budget ceiling or upgrade your plan.'
        : 'Ask your workspace admin to raise the per-run or per-project budget limit.';
  }

  toStudioError(): StudioErrorShape {
    return {
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      retryable: this.retryable,
      userMessage: this.userMessage,
      details: { scope: this.scope, limitUsd: this.limitUsd, usedUsd: this.usedUsd },
    };
  }
}
