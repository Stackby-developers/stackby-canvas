const subscribeHook = async (z, bundle) => {
  const res = await z.request({
    url: `${bundle.authData.apiUrl}/v1/webhooks`,
    method: 'POST',
    body: {
      url: bundle.targetUrl,
      events: ['run.failed'],
      description: 'Zapier: run.failed',
      workspaceId: bundle.authData.workspaceId,
      createdByUserId: bundle.authData.userId,
    },
  });
  return res.data;
};

const unsubscribeHook = async (z, bundle) => {
  await z.request({
    url: `${bundle.authData.apiUrl}/v1/webhooks/${bundle.subscribeData.id}`,
    method: 'DELETE',
    params: { workspaceId: bundle.authData.workspaceId },
  });
};

module.exports = {
  key: 'run_failed',
  noun: 'Run',
  display: {
    label: 'Build Run Failed',
    description: 'Triggers when a Studio build run fails after all retry attempts.',
  },
  operation: {
    type: 'hook',
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    perform: (z, bundle) => [bundle.cleanedRequest.data],
    performList: async () => [
      {
        id: 'sample',
        event: 'run.failed',
        data: { runId: 'run_sample', projectId: 'proj_sample', errorPhase: 'build', failedAt: new Date().toISOString() },
      },
    ],
    sample: { id: 'sample', event: 'run.failed', data: { runId: 'run_sample', errorPhase: 'build' } },
    outputFields: [
      { key: 'data__runId', label: 'Run ID' },
      { key: 'data__projectId', label: 'Project ID' },
      { key: 'data__errorPhase', label: 'Failed Phase' },
      { key: 'data__failedAt', label: 'Failed At' },
    ],
  },
};
