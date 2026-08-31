import type { ArtifactType, Plan, FileOperation } from '@stackby/schema-types';

export type { Plan, FileOperation };

export interface GenerationInput {
  projectId: string;
  runId: string;
  stackId: string;
  prompt: string;
  artifactType: ArtifactType;
  designSystemId?: string;
  conversationHistory?: ConversationTurn[];
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerationOutput {
  artifactId: string;
  versionId: string;
  previewUrl: string;
  buildHash: string;
}

export interface IntentAnalysis {
  intent: string;
  artifactType: ArtifactType;
  confidence: number;
}

export interface ClarificationResult {
  questions: string[];
  answers: Record<string, string>;
  skipped: boolean;
}

export interface BuildResult {
  buildId: string;
  previewUrl: string;
  screenshotUrl: string;
  buildHash: string;
  success: boolean;
  errors?: string[];
}

export interface VerifyResult {
  pass: boolean;
  issues: string[];
  screenshotUrl: string;
}

export interface ActivityContext {
  runId: string;
  projectId: string;
  stackId: string;
  workflowId: string;
}

// Activity interface definitions used by proxyActivities in workflows
export interface GenerationActivities {
  analyzeIntent(input: ActivityContext & { prompt: string; artifactType: ArtifactType }): Promise<IntentAnalysis>;
  analyzeSchema(input: ActivityContext): Promise<{ stackId: string; tables: unknown[]; profiledAt: string }>;
  clarify(input: ActivityContext & { intent: IntentAnalysis; schemaProfile: unknown; conversationHistory?: ConversationTurn[] | undefined }): Promise<ClarificationResult>;
  generatePlan(input: ActivityContext & { intent: IntentAnalysis; schemaProfile: unknown; clarification: ClarificationResult; rejectionFeedback?: string | undefined }): Promise<Plan>;
  generateDesign(input: ActivityContext & { plan: Plan; designSystemId?: string | undefined }): Promise<unknown>;
  generateCode(input: ActivityContext & { plan: Plan; schemaProfile: unknown; designContext: unknown; conversationHistory?: ConversationTurn[] | undefined }): Promise<FileOperation[]>;
  generateVisualPatch(input: ActivityContext & { patch: unknown; artifactId: string }): Promise<FileOperation[]>;
  generateAnnotationPatches(input: ActivityContext & { annotations: unknown[]; artifactId: string }): Promise<FileOperation[]>;
  applyOperations(input: ActivityContext & { fileOps: FileOperation[] }): Promise<{ paths: string[] }>;
  buildArtifact(input: ActivityContext & { plan: Plan; appliedFiles: string[] }): Promise<BuildResult>;
  verifyVisually(input: ActivityContext & { plan: Plan; screenshotUrl: string }): Promise<VerifyResult>;
  fixCode(input: ActivityContext & { plan: Plan; buildErrors?: string[] | undefined; visualIssues?: string[] | undefined; fileOps: FileOperation[]; cycle: number }): Promise<FileOperation[]>;
  summarise(input: ActivityContext & { plan: Plan; buildResult: BuildResult }): Promise<void>;
  finalise(input: ActivityContext & { plan: Plan; buildResult: BuildResult; verifyResult?: VerifyResult | undefined }): Promise<GenerationOutput>;
  generateStack(input: ActivityContext & { description: string; tableCount: number; rowCount: number }): Promise<unknown>;
  extractDesignTokens(input: ActivityContext & { artifactUrl: string; workspaceId: string }): Promise<unknown>;
}
