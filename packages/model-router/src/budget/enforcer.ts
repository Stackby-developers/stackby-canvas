import type { BudgetCeiling, BudgetKey } from './types.js';
import { BudgetExceededError } from './types.js';
import type { BudgetLedger } from './ledger.js';

export class BudgetEnforcer {
  constructor(private readonly ledger: BudgetLedger) {}

  async check(key: BudgetKey, ceilings: BudgetCeiling[], estimatedCostUsd: number): Promise<void> {
    for (const ceiling of ceilings) {
      let usedUsd: number;
      let scope: 'run' | 'project' | 'workspace';

      if (ceiling.runId !== undefined && key.runId === ceiling.runId) {
        usedUsd = await this.ledger.getRunTotal(ceiling.runId);
        scope = 'run';
      } else if (ceiling.projectId !== undefined && key.projectId === ceiling.projectId) {
        usedUsd = await this.ledger.getProjectTotal(ceiling.projectId);
        scope = 'project';
      } else if (
        ceiling.workspaceId === key.workspaceId &&
        ceiling.runId === undefined &&
        ceiling.projectId === undefined
      ) {
        usedUsd = await this.ledger.getWorkspaceTotal(ceiling.workspaceId);
        scope = 'workspace';
      } else {
        continue;
      }

      if (usedUsd + estimatedCostUsd > ceiling.limitUsd) {
        throw new BudgetExceededError(scope, ceiling.limitUsd, usedUsd, ceiling.workspaceId);
      }
    }
  }
}
