import { Client, Connection } from '@temporalio/client';
import type { Config } from './config.js';

export async function createTemporalClient(config: Config): Promise<Client> {
  const connection = await Connection.connect({ address: config.TEMPORAL_ADDRESS });
  return new Client({ connection, namespace: config.TEMPORAL_NAMESPACE });
}
