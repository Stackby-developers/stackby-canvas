import * as wf from '@temporalio/workflow';
import {
  approvePlanSignal,
  rejectPlanSignal,
  clarifyResponseSignal,
  cancelSignal,
  workflowStateQuery,
} from './shared/signals.js';
import type {
  GenerationActivities,
  GenerationInput,
  GenerationOutput,
  IntentAnalysis,
  ClarificationResult,
  BuildResult,
  VerifyResult,
  FileOperation,
  Plan,
} from './shared/workflow-types.js';

const defaultOpts = { retry: { maximumAttempts: 5, initialInterval: '2s', backoffCoefficient: 2 } };

const t1Acts = wf.proxyActivities<Pick<GenerationActivities, 'analyzeIntent' | 'analyzeSchema' | 'clarify'>>({
  startToCloseTimeout: '60s', ...defaultOpts,
});
const t2Acts = wf.proxyActivities<Pick<GenerationActivities, 'generatePlan' | 'generateDesign' | 'generateCode' | 'fixCode'>>({
  startToCloseTimeout: '120s', ...defaultOpts,
});
const t3Acts = wf.proxyActivities<Pick<GenerationActivities, 'verifyVisually'>>({
  startToCloseTimeout: '60s',
  retry: { maximumAttempts: 3, initialInterval: '5s', backoffCoefficient: 2 },
});
const deterministicActs = wf.proxyActivities<Pick<GenerationActivities, 'applyOperations' | 'buildArtifact' | 'summarise' | 'finalise'>>({
  startToCloseTimeout: '300s', ...defaultOpts,
});

export async function GenerationWorkflow(input: GenerationInput): Promise<GenerationOutput> {
  let state = 'starting';
  let cancelled = false;
  let planApproved = false;
  let planRejectionFeedback: string | undefined;
  let clarifyAnswers: Record<string, string> = {};

  wf.setHandler(cancelSignal, () => { cancelled = true; });
  wf.setHandler(approvePlanSignal, () => { planApproved = true; });
  wf.setHandler(rejectPlanSignal, ({ feedback }) => { planRejectionFeedback = feedback; });
  wf.setHandler(clarifyResponseSignal, ({ answers }) => { clarifyAnswers = { ...clarifyAnswers, ...answers }; });
  wf.setHandler(workflowStateQuery, () => state);

  const ctx = {
    runId: input.runId,
    projectId: input.projectId,
    stackId: input.stackId,
    workflowId: wf.workflowInfo().workflowId,
  };

  // 1. Analyze intent
  state = 'intent';
  if (cancelled) throw wf.ApplicationFailure.create({ message: 'Cancelled', type: 'Cancelled' });
  const intent: IntentAnalysis = await t1Acts.analyzeIntent({ ...ctx, prompt: input.prompt, artifactType: input.artifactType });

  // 2. Analyze schema
  state = 'schema';
  const schemaProfile = await t1Acts.analyzeSchema(ctx);

  // 3. Clarify — may SUSPEND up to 7 days
  state = 'clarification';
  const clarification: ClarificationResult = await t1Acts.clarify({
    ...ctx, intent, schemaProfile, conversationHistory: input.conversationHistory,
  });
  if (clarification.questions.length > 0) {
    const answered = await wf.condition(
      () => Object.keys(clarifyAnswers).length > 0 || cancelled,
      '7 days',
    );
    if (cancelled || !answered) throw wf.ApplicationFailure.create({ message: 'Clarification timed out', type: 'Timeout' });
    clarification.answers = clarifyAnswers;
  }

  // 4. Plan — SUSPENDS for approval up to 7 days
  state = 'planning';
  let plan: Plan | undefined;
  let planAttempts = 0;
  while (true) {
    planRejectionFeedback = undefined;
    planApproved = false;
    plan = await t2Acts.generatePlan({
      ...ctx, intent, schemaProfile, clarification,
      rejectionFeedback: planAttempts > 0 ? planRejectionFeedback : undefined,
    });
    state = 'plan_review';

    const resolved = await wf.condition(
      () => planApproved || planRejectionFeedback !== undefined || cancelled,
      '7 days',
    );
    if (cancelled) throw wf.ApplicationFailure.create({ message: 'Cancelled during plan review', type: 'Cancelled' });
    if (!resolved) throw wf.ApplicationFailure.create({ message: 'Plan review timed out', type: 'Timeout' });
    if (planApproved) break;
    planAttempts++;
    if (planAttempts > 5) throw wf.ApplicationFailure.create({ message: 'Too many plan rejections', type: 'PlanRejected' });
    state = 'planning';
  }

  if (!plan) throw wf.ApplicationFailure.create({ message: 'Plan undefined after approval', type: 'Internal' });

  // 5. Design
  state = 'design';
  const designContext = await t2Acts.generateDesign({ ...ctx, plan, designSystemId: input.designSystemId });

  // 6–10. Codegen + self-heal loop
  let fileOps: FileOperation[] = [];
  let buildResult: BuildResult | undefined;
  let verifyResult: VerifyResult | undefined;

  for (let cycle = 0; cycle < 3; cycle++) {
    if (cancelled) throw wf.ApplicationFailure.create({ message: 'Cancelled during build', type: 'Cancelled' });

    if (cycle === 0) {
      state = 'codegen';
      fileOps = await t2Acts.generateCode({
        ...ctx, plan, schemaProfile, designContext, conversationHistory: input.conversationHistory,
      });
    }

    state = 'applying';
    const applied = await deterministicActs.applyOperations({ ...ctx, fileOps });

    state = 'building';
    buildResult = await deterministicActs.buildArtifact({ ...ctx, plan, appliedFiles: applied.paths });

    if (!buildResult.success) {
      if (cycle >= 2) break;
      state = 'fixing';
      fileOps = await t2Acts.fixCode({ ...ctx, plan, buildErrors: buildResult.errors ?? [], fileOps, cycle });
      continue;
    }

    state = 'verifying';
    verifyResult = await t3Acts.verifyVisually({ ...ctx, plan, screenshotUrl: buildResult.screenshotUrl });
    if (verifyResult.pass) break;
    if (cycle >= 2) break;

    state = 'fixing';
    fileOps = await t2Acts.fixCode({ ...ctx, plan, visualIssues: verifyResult.issues, fileOps, cycle });
  }

  // 11. Summarise
  state = 'summarising';
  await deterministicActs.summarise({ ...ctx, plan, buildResult: buildResult! });

  // 12. Finalise
  state = 'finalising';
  const output = await deterministicActs.finalise({ ...ctx, plan, buildResult: buildResult!, verifyResult });

  state = 'done';
  return output;
}
