import type { AggregateReport, ScoreResult } from './scorer.js';

export function generateReport(aggregate: AggregateReport, scores: ScoreResult[], totalMs: number): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '  Stackby Studio Eval Report',
    `  Generated: ${new Date().toISOString()}`,
    '═══════════════════════════════════════════════════════════════',
    '',
    `Total cases:          ${aggregate.total}`,
    `Total duration:       ${(totalMs / 1000).toFixed(1)}s`,
    '',
    '─── Deterministic Metrics ───────────────────────────────────',
    `build_success:        ${(aggregate.buildSuccessRate * 100).toFixed(1)}%`,
    `typecheck_clean:      ${(aggregate.typecheckCleanRate * 100).toFixed(1)}%`,
    `lint_clean:           ${(aggregate.lintCleanRate * 100).toFixed(1)}%`,
    `plan_coverage:        ${(aggregate.planCoverageAvg * 100).toFixed(1)}%`,
    `binding_fidelity:     ${(aggregate.bindingFidelityAvg * 100).toFixed(1)}%`,
    '',
    '─── ML Metrics (mocked in CI) ───────────────────────────────',
    `visual_quality:       ${aggregate.visualQualityAvg.toFixed(2)}/5.0`,
    '',
    '─── Safety ──────────────────────────────────────────────────',
    `injection_pass_rate:  ${(aggregate.injectionPassRate * 100).toFixed(1)}%`,
    '',
  ];

  const failures = scores.filter((s) => !s.buildSuccess || s.bindingFidelity < 0.8 || !s.injectionClean);
  if (failures.length > 0) {
    lines.push('─── Failures ────────────────────────────────────────────────');
    for (const f of failures.slice(0, 10)) {
      const reasons: string[] = [];
      if (!f.buildSuccess) reasons.push('build_fail');
      if (f.bindingFidelity < 0.8) reasons.push(`binding_fidelity=${f.bindingFidelity.toFixed(2)}`);
      if (!f.injectionClean) reasons.push('injection_leak');
      lines.push(`  ${f.caseId}: ${reasons.join(', ')}`);
    }
    if (failures.length > 10) lines.push(`  ... and ${failures.length - 10} more`);
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════');
  return lines.join('\n');
}
