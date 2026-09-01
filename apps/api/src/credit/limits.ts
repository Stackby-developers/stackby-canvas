import type { Pool } from 'pg';
import type { CreditLedger } from './ledger.js';

export interface WorkspacePolicy {
  workspaceId: string;
  monthlyCreditCap: number;
  allowPublicPublishing: boolean;
  allowGitExport: boolean;
  allowedModelTiers: string[];
  requireApprovalForPublish: boolean;
}

export interface CreditCheckResult {
  allowed: boolean;
  balance: number;
  monthUsed: number;
  cap: number;
  remaining: number;
}

export class CreditCapError extends Error {
  readonly code = 'CREDIT_CAP_EXCEEDED';
  readonly httpStatus = 402;
  readonly retryable = false;
  readonly userMessage: string;
  readonly resumeInstructions: string;

  constructor(
    public readonly workspaceId: string,
    public readonly monthUsed: number,
    public readonly cap: number,
    public readonly runId?: string,
    public readonly workflowId?: string,
  ) {
    super(`Monthly credit cap (${cap}) reached for workspace ${workspaceId}. Used: ${monthUsed}`);
    this.userMessage =
      `Your workspace has used all ${cap} monthly credits. ` +
      (runId
        ? `Your generation (run ${runId}) is paused — it will resume automatically once credits are added.`
        : 'Add credits to continue.');
    this.resumeInstructions =
      `To resume: go to Workspace Settings → Credits → Add Credits, then return to this tab. ` +
      (workflowId ? `Your work is saved at workflow ${workflowId}.` : '');
  }
}

export class PolicyEnforcer {
  constructor(
    private readonly pool: Pool,
    private readonly ledger: CreditLedger,
    private readonly defaultCap: number,
  ) {}

  async getPolicy(workspaceId: string): Promise<WorkspacePolicy> {
    const { rows } = await this.pool.query(
      `SELECT * FROM workspace_policies WHERE workspace_id=$1`,
      [workspaceId],
    );
    const row = rows[0];
    return {
      workspaceId,
      monthlyCreditCap: row?.['monthly_credit_cap'] as number ?? this.defaultCap,
      allowPublicPublishing: row?.['allow_public_publishing'] as boolean ?? true,
      allowGitExport: row?.['allow_git_export'] as boolean ?? true,
      allowedModelTiers: row?.['allowed_model_tiers'] as string[] ?? ['T0', 'T1', 'T2', 'T3'],
      requireApprovalForPublish: row?.['require_approval_for_publish'] as boolean ?? false,
    };
  }

  async savePolicy(policy: WorkspacePolicy): Promise<void> {
    await this.pool.query(
      `INSERT INTO workspace_policies
       (workspace_id, monthly_credit_cap, allow_public_publishing, allow_git_export, allowed_model_tiers, require_approval_for_publish)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (workspace_id) DO UPDATE SET
         monthly_credit_cap=$2, allow_public_publishing=$3, allow_git_export=$4,
         allowed_model_tiers=$5, require_approval_for_publish=$6`,
      [policy.workspaceId, policy.monthlyCreditCap, policy.allowPublicPublishing,
       policy.allowGitExport, JSON.stringify(policy.allowedModelTiers), policy.requireApprovalForPublish],
    );
  }

  async checkCanRun(
    workspaceId: string,
    estimatedCredits: number,
    runId?: string,
    workflowId?: string,
  ): Promise<CreditCheckResult> {
    const policy = await this.getPolicy(workspaceId);
    const balance = await this.ledger.getBalance(workspaceId);

    if (balance.monthUsed + estimatedCredits > policy.monthlyCreditCap) {
      throw new CreditCapError(workspaceId, balance.monthUsed, policy.monthlyCreditCap, runId, workflowId);
    }

    return {
      allowed: true,
      balance: balance.balance,
      monthUsed: balance.monthUsed,
      cap: policy.monthlyCreditCap,
      remaining: policy.monthlyCreditCap - balance.monthUsed,
    };
  }
}
