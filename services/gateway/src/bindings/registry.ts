import type { Redis } from 'ioredis';
import type { DataBinding } from '@stackby/schema-types';

export class BindingRegistry {
  constructor(private readonly redis: Redis) {}

  private key(artifactId: string): string {
    return `bindings:${artifactId}`;
  }

  async register(artifactId: string, bindings: DataBinding[]): Promise<void> {
    await this.redis.set(this.key(artifactId), JSON.stringify(bindings), 'EX', 86400 * 30);
  }

  async validate(
    artifactId: string | null,
    tableId: string,
    columnIds: string[],
  ): Promise<DataBinding> {
    // Studio sessions skip binding validation — they have schema-level access
    if (!artifactId) {
      return { componentId: '__studio__', tableId, tableName: '', columnIds };
    }

    const raw = await this.redis.get(this.key(artifactId));
    if (!raw) {
      throw Object.assign(
        new Error(`No bindings registered for artifact ${artifactId}`),
        { statusCode: 403, code: 'BINDING_NOT_DECLARED' },
      );
    }

    const bindings = JSON.parse(raw) as DataBinding[];
    const match = bindings.find(
      (b) =>
        b.tableId === tableId &&
        columnIds.every((c) => b.columnIds.includes(c) || c === '*'),
    );

    if (!match) {
      throw Object.assign(
        new Error(
          `Binding not declared for table=${tableId} columns=[${columnIds.join(',')}]`,
        ),
        { statusCode: 403, code: 'BINDING_NOT_DECLARED' },
      );
    }

    return match;
  }
}
