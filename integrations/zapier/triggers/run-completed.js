const subscribeHook = async (z, bundle) => {
  const res = await z.request({
    url: `${bundle.authData.apiUrl}/v1/webhooks`,
    method: 'POST',
    body: {
      url: bundle.targetUrl,
      events: ['run.completed'],
      description: 'Zapier: run.completed',
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
  key: 'run_completed',
  noun: 'Run',
  display: {
    label: 'Build Run Completed',
    description: 'Triggers when a Studio build run finishes successfully and the artifact is ready.',
  },
  operation: {
    type: 'hook',
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    perform: (z, bundle) => [bundle.cleanedRequest.data],
    performList: async (z, bundle) => [
      {
        id: 'sample-delivery-id',
        event: 'run.completed',
        data: {
          runId: 'run_sample',
          projectId: 'proj_sample',
          artifactType: 'dashboard',
          prompt: 'Build a sales dashboard',
          completedAt: new Date().toISOString(),
        },
      },
    ],
    sample: {
      id: 'sample',
      event: 'run.completed',
      data: { runId: 'run_sample', artifactType: 'dashboard' },
    },
    outputFields: [
      { key: 'data__runId', label: 'Run ID' },
      { key: 'data__projectId', label: 'Project ID' },
      { key: 'data__artifactType', label: 'Artifact Type' },
      { key: 'data__prompt', label: 'Original Prompt' },
      { key: 'data__completedAt', label: 'Completed At' },
    ],
  },
};
