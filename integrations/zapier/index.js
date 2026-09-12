const { version } = require('./package.json');
const { version: platformVersion } = require('zapier-platform-core');

const artifactPublished = require('./triggers/artifact-published');
const runCompleted     = require('./triggers/run-completed');
const runFailed        = require('./triggers/run-failed');
const createProject    = require('./creates/create-project');

const App = {
  version,
  platformVersion,

  authentication: {
    type: 'custom',
    fields: [
      { key: 'apiUrl', label: 'API URL', type: 'string', required: true,
        default: 'https://api.studio.stackby.com', helpText: 'Your Studio API base URL.' },
      { key: 'apiKey', label: 'API Key', type: 'string', required: true, secret: true,
        helpText: 'Find this in Studio → Admin Console → API Keys.' },
      { key: 'workspaceId', label: 'Workspace ID', type: 'string', required: true },
      { key: 'userId', label: 'User ID', type: 'string', required: true },
    ],
    test: async (z, bundle) => {
      const res = await z.request(`${bundle.authData.apiUrl}/v1/credits/balance?workspaceId=${bundle.authData.workspaceId}`);
      return res.data;
    },
    connectionLabel: (z, bundle) => `Stackby Studio (${bundle.authData.workspaceId})`,
  },

  beforeRequest: [
    (request, z, bundle) => {
      request.headers = request.headers || {};
      request.headers['Authorization'] = `Bearer ${bundle.authData.apiKey}`;
      request.headers['Content-Type'] = 'application/json';
      return request;
    },
  ],

  triggers: {
    [artifactPublished.key]: artifactPublished,
    [runCompleted.key]: runCompleted,
    [runFailed.key]: runFailed,
  },

  creates: {
    [createProject.key]: createProject,
  },

  searches: {},
};

module.exports = App;
