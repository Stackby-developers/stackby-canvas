const subscribeHook = async (z, bundle) => {
  const data = {
    url: bundle.targetUrl,
    events: ['artifact.published'],
    description: 'Zapier: artifact.published',
    workspaceId: bundle.authData.workspaceId,
    createdByUserId: bundle.authData.userId,
  };
  const res = await z.request({
    url: `${bundle.authData.apiUrl}/v1/webhooks`,
    method: 'POST',
    body: data,
  });
  return res.data;
};

const unsubscribeHook = async (z, bundle) => {
  const webhookId = bundle.subscribeData.id;
  await z.request({
    url: `${bundle.authData.apiUrl}/v1/webhooks/${webhookId}`,
    method: 'DELETE',
    params: { workspaceId: bundle.authData.workspaceId },
  });
};

const getFallback = async (z, bundle) => {
  // Return sample data when testing in Zapier editor
  return [
    {
      id: 'sample-delivery-id',
      event: 'artifact.published',
      workspaceId: bundle.authData.workspaceId,
      timestamp: new Date().toISOString(),
      data: {
        deploymentId: 'dep_sample',
        projectId: 'proj_sample',
        slug: 'my-dashboard',
        visibility: 'link',
        previewUrl: 'https://my-dashboard.studio.stackby.com',
        publishedAt: new Date().toISOString(),
      },
    },
  ];
};

module.exports = {
  key: 'artifact_published',
  noun: 'Artifact',
  display: {
    label: 'Artifact Published',
    description: 'Triggers when a Stackby Studio artifact is published or re-deployed.',
  },
  operation: {
    type: 'hook',
    performSubscribe: subscribeHook,
    performUnsubscribe: unsubscribeHook,
    perform: (z, bundle) => [bundle.cleanedRequest.data],
    performList: getFallback,
    sample: {
      id: 'sample-delivery-id',
      event: 'artifact.published',
      data: {
        deploymentId: 'dep_sample',
        slug: 'my-dashboard',
        visibility: 'link',
        previewUrl: 'https://my-dashboard.studio.stackby.com',
      },
    },
    outputFields: [
      { key: 'data__deploymentId', label: 'Deployment ID' },
      { key: 'data__projectId', label: 'Project ID' },
      { key: 'data__slug', label: 'URL Slug' },
      { key: 'data__visibility', label: 'Visibility' },
      { key: 'data__previewUrl', label: 'Preview URL' },
      { key: 'data__publishedAt', label: 'Published At' },
    ],
  },
};
