module.exports = {
  key: 'create_project',
  noun: 'Project',
  display: {
    label: 'Create Project',
    description: 'Creates a new Stackby Studio project and starts a build run.',
  },
  operation: {
    inputFields: [
      { key: 'prompt', label: 'Prompt', type: 'text', required: true, helpText: 'Describe what you want to build (up to 4,000 characters).' },
      { key: 'stackId', label: 'Stack ID', type: 'string', required: true, helpText: 'The Stackby stack ID to connect to.' },
      { key: 'artifactType', label: 'Artifact Type', type: 'string', required: true,
        choices: ['dashboard','portal','report','form','gallery','website','document','presentation'] },
      { key: 'projectName', label: 'Project Name', type: 'string', required: false },
    ],
    perform: async (z, bundle) => {
      const res = await z.request({
        url: `${bundle.authData.apiUrl}/v1/projects`,
        method: 'POST',
        body: {
          workspaceId: bundle.authData.workspaceId,
          stackId: bundle.inputData.stackId,
          prompt: bundle.inputData.prompt,
          artifactType: bundle.inputData.artifactType,
          name: bundle.inputData.projectName || bundle.inputData.prompt.slice(0, 60),
        },
      });
      return res.data;
    },
    sample: {
      id: 'proj_sample',
      name: 'Sample Project',
      runId: 'run_sample',
      status: 'building',
    },
    outputFields: [
      { key: 'id', label: 'Project ID' },
      { key: 'runId', label: 'Run ID' },
      { key: 'name', label: 'Project Name' },
      { key: 'status', label: 'Status' },
    ],
  },
};
