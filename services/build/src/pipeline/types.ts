import type { FileOperation } from '@stackby/schema-types';

export type BuildPhase = 'allowlist' | 'typecheck' | 'lint' | 'bundle' | 'screenshot';

export interface BuildError {
  phase: BuildPhase;
  file: string;
  line?: number;
  column?: number;
  code?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface Screenshot {
  breakpoint: 375 | 768 | 1440;
  /** base64 PNG */
  dataUrl: string;
  width: number;
  height: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementInfo {
  /** data-inspect-id attribute value */
  inspectId: string;
  /** CSS selector for this element */
  selector: string;
  /** React component path (inferred from data attributes or DOM hierarchy) */
  componentPath: string;
  boundingBox: BoundingBox;
  visible: boolean;
  tag: string;
}

export type ElementMap = Record<string, ElementInfo>;

export interface BuildInput {
  projectId: string;
  versionId: string;
  runId: string;
  files: FileOperation[];
  /** Previous version's file hashes for incremental build */
  previousHashes?: Record<string, string>;
}

export interface BuildResult {
  buildId: string;
  success: boolean;
  errors: BuildError[];
  warnings: BuildError[];
  previewUrl: string;
  /** base64 data-URL of the 1440px screenshot */
  screenshotUrl: string;
  screenshots: Screenshot[];
  elementMap: ElementMap;
  buildHash: string;
  durationMs: number;
  consoleErrors: string[];
  failedRequests: string[];
  /** True when incremental cache was used */
  incremental: boolean;
}
