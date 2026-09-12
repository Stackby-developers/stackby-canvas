import { createHmac } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import { request as undiciRequest } from 'undici';
import type { Pool } from 'pg';

interface WebhookSubscription {
  id: string;
  url: string;
  secret: string;
  failureCount: number;
}

function computeHmac(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logDelivery(
  pool: Pool,
  subscriptionId: string,
  eventName: string,
  payload: Record<string, unknown>,
  attempt: number,
  status: number | null,
  responseBody: string | null,
  durationMs: number,
  success: boolean,
): Promise<void> {
  await pool.query(
    `INSERT INTO webhook_deliveries
       (id, subscription_id, event, payload, response_status, response_body, duration_ms, attempt, success)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [randomUUID(), subscriptionId, eventName, JSON.stringify(payload),
     status, responseBody, durationMs, attempt, success],
  );
}

async function deliver(
  pool: Pool,
  sub: WebhookSubscription,
  deliveryId: string,
  eventName: string,
  workspaceId: string,
  payload: Record<string, unknown>,
  attempt: number,
): Promise<boolean> {
  const body = JSON.stringify({
    id: deliveryId,
    event: eventName,
    workspaceId,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  const signature = computeHmac(sub.secret, body);
  const start = Date.now();

  try {
    const { statusCode, body: resBody } = await undiciRequest(sub.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Stackby-Event': eventName,
        'X-Stackby-Delivery': deliveryId,
        'X-Stackby-Signature': `sha256=${signature}`,
      },
      body,
      headersTimeout: 10_000,
      bodyTimeout: 10_000,
    });

    const durationMs = Date.now() - start;
    const responseText = await resBody.text().catch(() => null);
    const success = statusCode >= 200 && statusCode < 300;

    await logDelivery(pool, sub.id, eventName, payload, attempt, statusCode, responseText, durationMs, success);

    if (success) {
      await pool.query(
        `UPDATE webhook_subscriptions SET last_fired_at=NOW(), failure_count=0 WHERE id=$1`,
        [sub.id],
      );
    } else {
      await incrementFailures(pool, sub);
    }

    return success;
  } catch (err) {
    const durationMs = Date.now() - start;
    const errMsg = err instanceof Error ? err.message : String(err);
    await logDelivery(pool, sub.id, eventName, payload, attempt, null, errMsg, durationMs, false);
    await incrementFailures(pool, sub);
    return false;
  }
}

async function incrementFailures(pool: Pool, sub: WebhookSubscription): Promise<void> {
  const newCount = sub.failureCount + 1;
  if (newCount >= 10) {
    await pool.query(
      `UPDATE webhook_subscriptions SET failure_count=$1, active=FALSE WHERE id=$2`,
      [newCount, sub.id],
    );
  } else {
    await pool.query(
      `UPDATE webhook_subscriptions SET failure_count=$1 WHERE id=$2`,
      [newCount, sub.id],
    );
  }
}

async function deliverWithRetry(
  pool: Pool,
  sub: WebhookSubscription,
  eventName: string,
  workspaceId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const deliveryId = randomUUID();
  const delays = [0, 1000, 5000];

  for (let attempt = 1; attempt <= delays.length; attempt++) {
    const delay = delays[attempt - 1]!;
    if (delay > 0) await sleep(delay);

    const success = await deliver(pool, sub, deliveryId, eventName, workspaceId, payload, attempt);
    if (success) return;
  }
}

export async function dispatchEvent(
  pool: Pool,
  eventName: string,
  workspaceId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id, url, secret, failure_count FROM webhook_subscriptions
     WHERE workspace_id=$1 AND active=TRUE AND $2=ANY(events)`,
    [workspaceId, eventName],
  );

  for (const row of rows) {
    const sub: WebhookSubscription = {
      id: row['id'] as string,
      url: row['url'] as string,
      secret: row['secret'] as string,
      failureCount: row['failure_count'] as number,
    };
    void deliverWithRetry(pool, sub, eventName, workspaceId, payload).catch(() => {
      // Delivery failures are logged inside deliverWithRetry; swallow here to never
      // block the caller.
    });
  }
}
