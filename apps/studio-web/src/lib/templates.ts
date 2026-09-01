export type ArtifactType = 'dashboard' | 'portal' | 'report' | 'form' | 'gallery';
export type MappingRole = 'title' | 'status' | 'date' | 'owner' | 'measure' | 'image' | 'link';

export interface TemplateField {
  name: string;
  role: MappingRole;
  required: boolean;
  columnType: string;
  description: string;
}

export interface TemplateEntity {
  name: string;
  fields: TemplateField[];
}

export interface Template {
  id: string;
  name: string;
  type: ArtifactType;
  icon: string;
  description: string;
  longDescription: string;
  category: string;
  prompt: string;
  schema: TemplateEntity[];
}

export const TEMPLATES: Template[] = [
  {
    id: 'crm-dashboard',
    name: 'CRM Dashboard',
    type: 'dashboard',
    icon: '📊',
    category: 'Sales',
    description: 'Pipeline and deals overview',
    longDescription: 'A live dashboard showing deal pipeline health, stage distribution, and top opportunities. Pulls from your CRM stack.',
    prompt: 'Build a CRM dashboard showing deal pipeline with KPIs for total value, win rate, and average deal size. Include a stage funnel chart and top deals table.',
    schema: [
      {
        name: 'Deals',
        fields: [
          { name: 'Deal Name', role: 'title', required: true, columnType: 'text', description: 'Name of the deal' },
          { name: 'Stage', role: 'status', required: true, columnType: 'select', description: 'Pipeline stage' },
          { name: 'Value', role: 'measure', required: true, columnType: 'currency', description: 'Deal value' },
          { name: 'Close Date', role: 'date', required: true, columnType: 'date', description: 'Expected close date' },
          { name: 'Owner', role: 'owner', required: false, columnType: 'collaborator', description: 'Deal owner' },
        ],
      },
    ],
  },
  {
    id: 'project-tracker',
    name: 'Project Tracker',
    type: 'portal',
    icon: '🗂️',
    category: 'Operations',
    description: 'Tasks, deadlines, and owners',
    longDescription: 'A multi-page project management portal with task lists, milestone tracking, and team workload views.',
    prompt: 'Build a project tracker portal with a task list view grouped by status, a timeline view for deadlines, and a team workload chart.',
    schema: [
      {
        name: 'Tasks',
        fields: [
          { name: 'Task Name', role: 'title', required: true, columnType: 'text', description: 'Task title' },
          { name: 'Status', role: 'status', required: true, columnType: 'select', description: 'Task status' },
          { name: 'Due Date', role: 'date', required: true, columnType: 'date', description: 'Deadline' },
          { name: 'Assignee', role: 'owner', required: false, columnType: 'collaborator', description: 'Person responsible' },
        ],
      },
    ],
  },
  {
    id: 'invoice-portal',
    name: 'Invoice Portal',
    type: 'portal',
    icon: '🧾',
    category: 'Finance',
    description: 'Client billing and status',
    longDescription: 'A client-facing portal showing invoice history, payment status, and outstanding balances.',
    prompt: 'Build an invoice portal showing a list of invoices with status badges, total amount, due dates, and a summary card showing total outstanding.',
    schema: [
      {
        name: 'Invoices',
        fields: [
          { name: 'Invoice Number', role: 'title', required: true, columnType: 'text', description: 'Invoice identifier' },
          { name: 'Status', role: 'status', required: true, columnType: 'select', description: 'Payment status' },
          { name: 'Amount', role: 'measure', required: true, columnType: 'currency', description: 'Invoice amount' },
          { name: 'Due Date', role: 'date', required: true, columnType: 'date', description: 'Payment due date' },
          { name: 'Client', role: 'title', required: false, columnType: 'text', description: 'Client name' },
        ],
      },
    ],
  },
  {
    id: 'inventory-gallery',
    name: 'Inventory Gallery',
    type: 'gallery',
    icon: '📦',
    category: 'Operations',
    description: 'Product catalog with search',
    longDescription: 'A searchable product gallery with filtering by category, stock status, and price range.',
    prompt: 'Build an inventory gallery showing products as cards with image, name, SKU, stock count, and price. Include search and filter by category.',
    schema: [
      {
        name: 'Products',
        fields: [
          { name: 'Product Name', role: 'title', required: true, columnType: 'text', description: 'Product name' },
          { name: 'SKU', role: 'title', required: false, columnType: 'text', description: 'Stock keeping unit' },
          { name: 'Price', role: 'measure', required: true, columnType: 'currency', description: 'Unit price' },
          { name: 'Stock', role: 'measure', required: false, columnType: 'number', description: 'Units in stock' },
          { name: 'Category', role: 'status', required: false, columnType: 'select', description: 'Product category' },
          { name: 'Image', role: 'image', required: false, columnType: 'multipleAttachment', description: 'Product photo' },
        ],
      },
    ],
  },
  {
    id: 'team-form',
    name: 'Request Form',
    type: 'form',
    icon: '📋',
    category: 'Operations',
    description: 'Internal request intake',
    longDescription: 'A branded intake form for internal requests (IT, HR, procurement) that writes directly to your Stackby table.',
    prompt: 'Build a request intake form with fields for request type, priority, description, and requester name. On submit, write to the requests table.',
    schema: [
      {
        name: 'Requests',
        fields: [
          { name: 'Request Title', role: 'title', required: true, columnType: 'text', description: 'Brief title' },
          { name: 'Type', role: 'status', required: true, columnType: 'select', description: 'Request category' },
          { name: 'Priority', role: 'status', required: false, columnType: 'select', description: 'Urgency level' },
          { name: 'Description', role: 'title', required: false, columnType: 'multilineText', description: 'Details' },
        ],
      },
    ],
  },
  {
    id: 'status-report',
    name: 'Status Report',
    type: 'report',
    icon: '📄',
    category: 'Leadership',
    description: 'Weekly snapshot for stakeholders',
    longDescription: 'A printable weekly status report with KPI summary, project health indicators, and key highlights from your data.',
    prompt: 'Build a weekly status report showing top KPIs, project health summary, and a highlights section. Format for printing or PDF export.',
    schema: [
      {
        name: 'Projects',
        fields: [
          { name: 'Project Name', role: 'title', required: true, columnType: 'text', description: 'Project name' },
          { name: 'Health', role: 'status', required: true, columnType: 'select', description: 'On track / At risk / Blocked' },
          { name: 'Owner', role: 'owner', required: false, columnType: 'collaborator', description: 'Project lead' },
          { name: 'Due Date', role: 'date', required: false, columnType: 'date', description: 'Target completion' },
        ],
      },
    ],
  },
  {
    id: 'candidate-pipeline',
    name: 'Hiring Pipeline',
    type: 'dashboard',
    icon: '🧑‍💼',
    category: 'HR',
    description: 'Recruitment funnel and candidates',
    longDescription: 'A hiring dashboard showing candidate pipeline, stage distribution, and open roles overview.',
    prompt: 'Build a hiring dashboard showing candidates by stage, time-to-hire metric, and a list of open roles with applicant counts.',
    schema: [
      {
        name: 'Candidates',
        fields: [
          { name: 'Candidate Name', role: 'title', required: true, columnType: 'text', description: 'Full name' },
          { name: 'Stage', role: 'status', required: true, columnType: 'select', description: 'Interview stage' },
          { name: 'Role', role: 'title', required: true, columnType: 'text', description: 'Applied role' },
          { name: 'Interview Date', role: 'date', required: false, columnType: 'date', description: 'Next interview' },
          { name: 'Recruiter', role: 'owner', required: false, columnType: 'collaborator', description: 'Assigned recruiter' },
        ],
      },
    ],
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    type: 'portal',
    icon: '📅',
    category: 'Marketing',
    description: 'Editorial schedule and publishing',
    longDescription: 'A marketing content calendar portal with scheduled posts, publish status, and channel breakdown.',
    prompt: 'Build a content calendar portal showing scheduled posts in a calendar view, a list view with status filters, and a channel breakdown chart.',
    schema: [
      {
        name: 'Content',
        fields: [
          { name: 'Title', role: 'title', required: true, columnType: 'text', description: 'Content title' },
          { name: 'Status', role: 'status', required: true, columnType: 'select', description: 'Draft/Scheduled/Published' },
          { name: 'Publish Date', role: 'date', required: true, columnType: 'date', description: 'Planned publish date' },
          { name: 'Channel', role: 'status', required: false, columnType: 'select', description: 'Distribution channel' },
          { name: 'Author', role: 'owner', required: false, columnType: 'collaborator', description: 'Content owner' },
        ],
      },
    ],
  },
  {
    id: 'bug-tracker',
    name: 'Bug Tracker',
    type: 'portal',
    icon: '🐛',
    category: 'Engineering',
    description: 'Issue list with priority and status',
    longDescription: 'A developer portal for tracking bugs, feature requests, and their resolution status.',
    prompt: 'Build a bug tracker portal with an issue list grouped by priority, individual issue detail view, and a status distribution chart.',
    schema: [
      {
        name: 'Issues',
        fields: [
          { name: 'Issue Title', role: 'title', required: true, columnType: 'text', description: 'Issue summary' },
          { name: 'Status', role: 'status', required: true, columnType: 'select', description: 'Open/In Progress/Resolved' },
          { name: 'Priority', role: 'status', required: true, columnType: 'select', description: 'Critical/High/Medium/Low' },
          { name: 'Assignee', role: 'owner', required: false, columnType: 'collaborator', description: 'Developer handling it' },
          { name: 'Created At', role: 'date', required: false, columnType: 'createdTime', description: 'Report date' },
        ],
      },
    ],
  },
  {
    id: 'client-portal',
    name: 'Client Portal',
    type: 'portal',
    icon: '🏢',
    category: 'Agency',
    description: 'Shared workspace for client projects',
    longDescription: 'A client-facing project portal with deliverables, milestones, and feedback capture.',
    prompt: 'Build a client portal showing current project deliverables, milestone progress, and a feedback form.',
    schema: [
      {
        name: 'Deliverables',
        fields: [
          { name: 'Deliverable', role: 'title', required: true, columnType: 'text', description: 'Deliverable name' },
          { name: 'Status', role: 'status', required: true, columnType: 'select', description: 'Pending/In Review/Approved' },
          { name: 'Due Date', role: 'date', required: true, columnType: 'date', description: 'Expected delivery' },
          { name: 'URL', role: 'link', required: false, columnType: 'url', description: 'Deliverable link' },
        ],
      },
    ],
  },
  {
    id: 'expense-report',
    name: 'Expense Report',
    type: 'report',
    icon: '💳',
    category: 'Finance',
    description: 'Team expense summary and trends',
    longDescription: 'A printable expense report showing total spend by category, top spenders, and monthly trend.',
    prompt: 'Build an expense report showing total spend by category as a bar chart, top 10 expenses table, and month-over-month trend.',
    schema: [
      {
        name: 'Expenses',
        fields: [
          { name: 'Description', role: 'title', required: true, columnType: 'text', description: 'Expense description' },
          { name: 'Amount', role: 'measure', required: true, columnType: 'currency', description: 'Amount spent' },
          { name: 'Category', role: 'status', required: true, columnType: 'select', description: 'Expense category' },
          { name: 'Date', role: 'date', required: true, columnType: 'date', description: 'Expense date' },
          { name: 'Submitter', role: 'owner', required: false, columnType: 'collaborator', description: 'Who submitted' },
        ],
      },
    ],
  },
  {
    id: 'event-registration',
    name: 'Event Registration',
    type: 'form',
    icon: '🎟️',
    category: 'Events',
    description: 'Attendee sign-up and tracking',
    longDescription: 'A public-facing event registration form that writes attendee data to your Stackby table.',
    prompt: 'Build an event registration form collecting name, email, dietary requirements, and session preferences. Write to the registrations table.',
    schema: [
      {
        name: 'Registrations',
        fields: [
          { name: 'Full Name', role: 'title', required: true, columnType: 'text', description: 'Attendee name' },
          { name: 'Email', role: 'title', required: true, columnType: 'email', description: 'Contact email' },
          { name: 'Session', role: 'status', required: false, columnType: 'select', description: 'Selected session' },
          { name: 'Registered At', role: 'date', required: false, columnType: 'createdTime', description: 'Registration time' },
        ],
      },
    ],
  },
];

export const CATEGORIES = [...new Set(TEMPLATES.map((t) => t.category))].sort();
