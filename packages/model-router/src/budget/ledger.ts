import type { Redis } from 'ioredis';
import type { BudgetKey } from './types.js';

const TTL_RUN = 86400 * 3;
const TTL_PROJECT = 86400 * 31;
const TTL_WORKSPACE = 86400 * 31;

function runKey(runId: string): string { return `budget:run:${runId}`; }
function projectKey(projectId: string): string { return `budget:project:${projectId}`; }
function workspaceKey(workspaceId: string): string { return `budget:workspace:${workspaceId}`; }

export class BudgetLedger {
  constructor(private readonly redis: Redis) {}

  async record(key: BudgetKey, costUsd: number): Promise<void> {
    const pipe = this.redis.pipeline();
    if (key.runId) {
      pipe.incrbyfloat(runKey(key.runId), costUsd);
      pipe.expire(runKey(key.runId), TTL_RUN);
    }
    if (key.projectId) {
      pipe.incrbyfloat(projectKey(key.projectId), costUsd);
      pipe.expire(projectKey(key.projectId), TTL_PROJECT);
    }
    pipe.incrbyfloat(workspaceKey(key.workspaceId), costUsd);
    pipe.expire(workspaceKey(key.workspaceId), TTL_WORKSPACE);
    await pipe.exec();
  }

  async getRunTotal(runId: string): Promise<number> {
    return parseFloat((await this.redis.get(runKey(runId))) ?? '0');
  }

  async getProjectTotal(projectId: string): Promise<number> {
    return parseFloat((await this.redis.get(projectKey(projectId))) ?? '0');
  }

  async getWorkspaceTotal(workspaceId: string): Promise<number> {
    return parseFloat((await this.redis.get(workspaceKey(workspaceId))) ?? '0');
  }

  async resetRun(runId: string): Promise<void> {
    await this.redis.del(runKey(runId));
  }
}
