import type { AggregateReport } from './scorer.js';

export interface BaselineScores {
  version: string;
  scores: AggregateReport;
  recordedAt: string;
}

export interface RegressionResult {
  blocked: boolean;
  reason: string | undefined;
  deltas: {
    buildSuccess: { current: number; baseline: number; regressed: boolean };
    bindingFidelity: { current: number; baseline: number; regressed: boolean };
    visualQuality: { current: number; baseline: number; delta: number; regressed: boolean };
  };
}

const VISUAL_QUALITY_TOLERANCE = 0.15;

export function checkRegression(current: AggregateReport, baseline: BaselineScores): RegressionResult {
  const bs = baseline.scores;
  const buildRegressed = current.buildSuccessRate < bs.buildSuccessRate;
  const bindingRegressed = current.bindingFidelityAvg < bs.bindingFidelityAvg;
  const visualDelta = current.visualQualityAvg - bs.visualQualityAvg;
  const visualRegressed = visualDelta < -VISUAL_QUALITY_TOLERANCE;

  const blocked = buildRegressed || bindingRegressed || visualRegressed;
  let reason: string | undefined;

  if (blocked) {
    const parts: string[] = [];
    if (buildRegressed) parts.push(`build_success regressed: ${(bs.buildSuccessRate * 100).toFixed(1)}% → ${(current.buildSuccessRate * 100).toFixed(1)}%`);
    if (bindingRegressed) parts.push(`binding_fidelity regressed: ${bs.bindingFidelityAvg.toFixed(3)} → ${current.bindingFidelityAvg.toFixed(3)}`);
    if (visualRegressed) parts.push(`visual_quality regressed by ${Math.abs(visualDelta).toFixed(2)} (limit ${VISUAL_QUALITY_TOLERANCE}): ${bs.visualQualityAvg.toFixed(2)} → ${current.visualQualityAvg.toFixed(2)}`);
    reason = parts.join('; ');
  }

  return {
    blocked,
    reason,
    deltas: {
      buildSuccess: { current: current.buildSuccessRate, baseline: bs.buildSuccessRate, regressed: buildRegressed },
      bindingFidelity: { current: current.bindingFidelityAvg, baseline: bs.bindingFidelityAvg, regressed: bindingRegressed },
      visualQuality: { current: current.visualQualityAvg, baseline: bs.visualQualityAvg, delta: visualDelta, regressed: visualRegressed },
    },
  };
}
