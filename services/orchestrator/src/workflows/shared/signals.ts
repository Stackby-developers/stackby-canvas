import * as wf from '@temporalio/workflow';

export const approvePlanSignal = wf.defineSignal<[{ comment?: string }]>('approvePlan');
export const rejectPlanSignal = wf.defineSignal<[{ feedback: string }]>('rejectPlan');
export const clarifyResponseSignal = wf.defineSignal<[{ answers: Record<string, string> }]>('clarifyResponse');
export const cancelSignal = wf.defineSignal<[]>('cancel');
export const workflowStateQuery = wf.defineQuery<string>('workflowState');
