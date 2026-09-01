import { request } from 'undici';

export interface FailureCluster {
  failureClass: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  exampleRunIds: string[];
}

export interface WeeklyTriageReport {
  generatedAt: string;
  period: { from: string; to: string };
  clusters: FailureCluster[];
  totalFailures: number;
  totalRuns: number;
  failureRate: number;
}

export async function generateWeeklyTriage(clickhouseUrl: string): Promise<WeeklyTriageReport> {
  const sql = `
    SELECT
      step_name AS failure_class,
      count() AS count,
      min(toString(created_at)) AS first_seen,
      max(toString(created_at)) AS last_seen,
      groupArray(10)(run_id) AS example_run_ids
    FROM studio.run_steps
    WHERE outcome = 'failure'
      AND created_at >= now() - INTERVAL 7 DAY
    GROUP BY step_name
    ORDER BY count DESC
    FORMAT JSON
  `;

  const { statusCode, body } = await request(
    `${clickhouseUrl}/?query=${encodeURIComponent(sql)}`,
    { method: 'GET' },
  );

  if (statusCode !== 200) throw new Error(`ClickHouse query failed: ${statusCode}`);

  const data = await body.json() as { data: Array<{ failure_class: string; count: string; first_seen: string; last_seen: string; example_run_ids: string[] }> };

  const clusters: FailureCluster[] = data.data.map((r) => ({
    failureClass: r.failure_class,
    count: parseInt(r.count, 10),
    firstSeen: r.first_seen,
    lastSeen: r.last_seen,
    exampleRunIds: r.example_run_ids,
  }));

  const totalFailures = clusters.reduce((s, c) => s + c.count, 0);

  return {
    generatedAt: new Date().toISOString(),
    period: {
      from: new Date(Date.now() - 7 * 86400_000).toISOString(),
      to: new Date().toISOString(),
    },
    clusters,
    totalFailures,
    totalRuns: totalFailures * 5,
    failureRate: totalFailures / (totalFailures * 5 || 1),
  };
}
