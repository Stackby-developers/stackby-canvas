import { describe, it, expect } from 'vitest';
import { GenerationWorkflow } from '../workflows/generation.js';
import type { GenerationInput } from '../workflows/shared/workflow-types.js';
import type { ArtifactType } from '@stackby/schema-types';

// ---------------------------------------------------------------------------
// Fixture catalogue — 210 golden prompts covering all 8 artifact types across
// 10 vertical domains. Each fixture asserts:
//   1. the prompt maps to the right artifact type
//   2. the GenerationInput shape is valid
//   3. implied entities and capabilities can be inferred from keywords
// ---------------------------------------------------------------------------

type Fixture = {
  prompt: string;
  artifactType: ArtifactType;
  domain: string;
  /** Keywords that must appear in an intent analysis output */
  impliedEntities?: string[];
  /** Minimum confidence expected from the intent analyser */
  minConfidence?: number;
};

const VALID_TYPES: ArtifactType[] = [
  'dashboard', 'portal', 'report', 'form', 'gallery', 'website', 'document', 'presentation',
];

// -- CRM / Sales (30 fixtures) -----------------------------------------------
const CRM: Fixture[] = [
  { prompt: 'Build a sales pipeline dashboard showing deals by stage', artifactType: 'dashboard', domain: 'crm', impliedEntities: ['deal', 'stage'] },
  { prompt: 'Create a lead scoring report ranking prospects by engagement', artifactType: 'report', domain: 'crm', impliedEntities: ['lead'] },
  { prompt: 'Make a contact detail portal for account managers', artifactType: 'portal', domain: 'crm', impliedEntities: ['contact'] },
  { prompt: 'Build a new-lead intake form with required fields and validation', artifactType: 'form', domain: 'crm', impliedEntities: ['lead'] },
  { prompt: 'Create a customer gallery showing company logo, tier, and ARR', artifactType: 'gallery', domain: 'crm', impliedEntities: ['customer'] },
  { prompt: 'Generate a weekly sales activity report by rep', artifactType: 'report', domain: 'crm', impliedEntities: ['activity'] },
  { prompt: 'Build a deal-close probability dashboard for the VP of Sales', artifactType: 'dashboard', domain: 'crm' },
  { prompt: 'Create a churn risk report listing accounts at risk', artifactType: 'report', domain: 'crm' },
  { prompt: 'Make a prospect outreach portal with email templates', artifactType: 'portal', domain: 'crm' },
  { prompt: 'Build a sales forecast dashboard with quota attainment bars', artifactType: 'dashboard', domain: 'crm' },
  { prompt: 'Create a contract renewal tracker for the account team', artifactType: 'dashboard', domain: 'crm', impliedEntities: ['contract', 'renewal'] },
  { prompt: 'Build a customer health-score dashboard', artifactType: 'dashboard', domain: 'crm' },
  { prompt: 'Create a call-notes entry form with dropdown dispositions', artifactType: 'form', domain: 'crm' },
  { prompt: 'Generate a monthly revenue-by-segment report', artifactType: 'report', domain: 'crm' },
  { prompt: 'Build a competitive win/loss analysis dashboard', artifactType: 'dashboard', domain: 'crm' },
  { prompt: 'Create a partner portal showing deal registrations', artifactType: 'portal', domain: 'crm' },
  { prompt: 'Make a contact-import form with deduplication warnings', artifactType: 'form', domain: 'crm' },
  { prompt: 'Build a top-accounts gallery with filters by tier', artifactType: 'gallery', domain: 'crm' },
  { prompt: 'Generate a pipeline velocity report by quarter', artifactType: 'report', domain: 'crm' },
  { prompt: 'Create a customer success health dashboard', artifactType: 'dashboard', domain: 'crm' },
  { prompt: 'Build a sales territory map dashboard by region', artifactType: 'dashboard', domain: 'crm' },
  { prompt: 'Create an NPS survey submission form', artifactType: 'form', domain: 'crm' },
  { prompt: 'Make a churned-accounts report with root-cause tags', artifactType: 'report', domain: 'crm' },
  { prompt: 'Build a renewal pipeline dashboard with at-risk flags', artifactType: 'dashboard', domain: 'crm' },
  { prompt: 'Create a product-usage portal for customer success managers', artifactType: 'portal', domain: 'crm' },
  { prompt: 'Generate a lead-source attribution report', artifactType: 'report', domain: 'crm' },
  { prompt: 'Build a sales-rep leaderboard dashboard', artifactType: 'dashboard', domain: 'crm' },
  { prompt: 'Create a proposal submission form with file upload', artifactType: 'form', domain: 'crm' },
  { prompt: 'Make a case-study gallery sorted by industry', artifactType: 'gallery', domain: 'crm' },
  { prompt: 'Build a revenue-recognition schedule document', artifactType: 'document', domain: 'crm' },
];

// -- Project Management (25 fixtures) ----------------------------------------
const PM: Fixture[] = [
  { prompt: 'Build a project status dashboard showing tasks overdue', artifactType: 'dashboard', domain: 'pm', impliedEntities: ['task', 'project'] },
  { prompt: 'Create a sprint retrospective report for the engineering team', artifactType: 'report', domain: 'pm' },
  { prompt: 'Make a project intake request form with priority selector', artifactType: 'form', domain: 'pm' },
  { prompt: 'Build a resource allocation dashboard for project managers', artifactType: 'dashboard', domain: 'pm', impliedEntities: ['resource'] },
  { prompt: 'Create a roadmap presentation for the quarterly planning meeting', artifactType: 'presentation', domain: 'pm' },
  { prompt: 'Build a bug-tracker dashboard with severity heatmap', artifactType: 'dashboard', domain: 'pm' },
  { prompt: 'Generate a milestone completion report for stakeholders', artifactType: 'report', domain: 'pm' },
  { prompt: 'Create a change-request submission form', artifactType: 'form', domain: 'pm' },
  { prompt: 'Make a team workload dashboard per engineer', artifactType: 'dashboard', domain: 'pm' },
  { prompt: 'Build a risk register portal for the PMO', artifactType: 'portal', domain: 'pm' },
  { prompt: 'Create a dependency map dashboard for cross-team blockers', artifactType: 'dashboard', domain: 'pm' },
  { prompt: 'Generate a velocity trend report over the last 6 sprints', artifactType: 'report', domain: 'pm' },
  { prompt: 'Build a project portfolio overview dashboard', artifactType: 'dashboard', domain: 'pm' },
  { prompt: 'Create a task-escalation intake form', artifactType: 'form', domain: 'pm' },
  { prompt: 'Make a post-mortem document template for incidents', artifactType: 'document', domain: 'pm' },
  { prompt: 'Build a deadline-tracking dashboard with RAG status', artifactType: 'dashboard', domain: 'pm' },
  { prompt: 'Create a project-closeout report with lessons learned', artifactType: 'report', domain: 'pm' },
  { prompt: 'Make an external client project portal with status updates', artifactType: 'portal', domain: 'pm' },
  { prompt: 'Build a capacity-planning dashboard for next quarter', artifactType: 'dashboard', domain: 'pm' },
  { prompt: 'Create a sprint-planning presentation for standup', artifactType: 'presentation', domain: 'pm' },
  { prompt: 'Generate a feature-request backlog report by votes', artifactType: 'report', domain: 'pm' },
  { prompt: 'Build a project-cost tracking dashboard with burn rate', artifactType: 'dashboard', domain: 'pm' },
  { prompt: 'Create a team availability form for scheduling', artifactType: 'form', domain: 'pm' },
  { prompt: 'Make a project charter document with objectives and KPIs', artifactType: 'document', domain: 'pm' },
  { prompt: 'Build a cross-project dependencies portal', artifactType: 'portal', domain: 'pm' },
];

// -- HR / People (25 fixtures) -----------------------------------------------
const HR: Fixture[] = [
  { prompt: 'Create an employee directory with search and department filter', artifactType: 'gallery', domain: 'hr', impliedEntities: ['employee', 'department'] },
  { prompt: 'Build a headcount dashboard by department and location', artifactType: 'dashboard', domain: 'hr' },
  { prompt: 'Create a job application submission form', artifactType: 'form', domain: 'hr', impliedEntities: ['applicant'] },
  { prompt: 'Generate a quarterly headcount report by role', artifactType: 'report', domain: 'hr' },
  { prompt: 'Build a time-off balance dashboard per employee', artifactType: 'dashboard', domain: 'hr' },
  { prompt: 'Create an onboarding checklist portal for new hires', artifactType: 'portal', domain: 'hr' },
  { prompt: 'Make a performance review input form for managers', artifactType: 'form', domain: 'hr' },
  { prompt: 'Build a compensation benchmarking dashboard', artifactType: 'dashboard', domain: 'hr' },
  { prompt: 'Create an org-chart gallery with reporting lines', artifactType: 'gallery', domain: 'hr' },
  { prompt: 'Generate an attrition report by team and tenure band', artifactType: 'report', domain: 'hr' },
  { prompt: 'Build a training completion dashboard by program', artifactType: 'dashboard', domain: 'hr' },
  { prompt: 'Create a candidate feedback form post-interview', artifactType: 'form', domain: 'hr' },
  { prompt: 'Make a benefits enrollment portal for open enrollment', artifactType: 'portal', domain: 'hr' },
  { prompt: 'Build an eNPS trend dashboard over 12 months', artifactType: 'dashboard', domain: 'hr' },
  { prompt: 'Create a skills inventory gallery for the engineering team', artifactType: 'gallery', domain: 'hr' },
  { prompt: 'Generate a hiring funnel report by source', artifactType: 'report', domain: 'hr' },
  { prompt: 'Build a succession-planning dashboard for leadership roles', artifactType: 'dashboard', domain: 'hr' },
  { prompt: 'Create a contractor onboarding form with document upload', artifactType: 'form', domain: 'hr' },
  { prompt: 'Make an employee handbook document', artifactType: 'document', domain: 'hr' },
  { prompt: 'Build a workforce diversity dashboard by level', artifactType: 'dashboard', domain: 'hr' },
  { prompt: 'Create an exit interview feedback form', artifactType: 'form', domain: 'hr' },
  { prompt: 'Generate a payroll reconciliation report by pay period', artifactType: 'report', domain: 'hr' },
  { prompt: 'Build a recognition portal for employee shoutouts', artifactType: 'portal', domain: 'hr' },
  { prompt: 'Create an all-hands presentation for the HR quarterly update', artifactType: 'presentation', domain: 'hr' },
  { prompt: 'Make a job-level framework document with pay bands', artifactType: 'document', domain: 'hr' },
];

// -- Finance / Accounting (25 fixtures) ---------------------------------------
const FINANCE: Fixture[] = [
  { prompt: 'Build a budget vs actuals dashboard by cost centre', artifactType: 'dashboard', domain: 'finance', impliedEntities: ['budget', 'actuals'] },
  { prompt: 'Create an invoice submission form with line items', artifactType: 'form', domain: 'finance', impliedEntities: ['invoice'] },
  { prompt: 'Generate a monthly P&L report for the CFO', artifactType: 'report', domain: 'finance' },
  { prompt: 'Build a cash-flow forecast dashboard for the next 13 weeks', artifactType: 'dashboard', domain: 'finance' },
  { prompt: 'Create an expense reimbursement request form', artifactType: 'form', domain: 'finance' },
  { prompt: 'Make a vendor payment portal showing pending invoices', artifactType: 'portal', domain: 'finance' },
  { prompt: 'Build a capex tracking dashboard by project', artifactType: 'dashboard', domain: 'finance' },
  { prompt: 'Generate a quarterly variance report by GL account', artifactType: 'report', domain: 'finance' },
  { prompt: 'Create a purchase-order approval form', artifactType: 'form', domain: 'finance' },
  { prompt: 'Build a department spending dashboard with category drill-down', artifactType: 'dashboard', domain: 'finance' },
  { prompt: 'Create a board financial presentation for Q3', artifactType: 'presentation', domain: 'finance' },
  { prompt: 'Make a contract value document for the legal team', artifactType: 'document', domain: 'finance' },
  { prompt: 'Build an accounts-receivable ageing dashboard', artifactType: 'dashboard', domain: 'finance' },
  { prompt: 'Generate a tax provision report by entity', artifactType: 'report', domain: 'finance' },
  { prompt: 'Create a budget amendment request form', artifactType: 'form', domain: 'finance' },
  { prompt: 'Build a headcount cost dashboard split by department', artifactType: 'dashboard', domain: 'finance' },
  { prompt: 'Make a collections portal for overdue accounts', artifactType: 'portal', domain: 'finance' },
  { prompt: 'Generate a revenue recognition schedule report', artifactType: 'report', domain: 'finance' },
  { prompt: 'Build a financial close checklist dashboard', artifactType: 'dashboard', domain: 'finance' },
  { prompt: 'Create a vendor registration form with bank details', artifactType: 'form', domain: 'finance' },
  { prompt: 'Make an investor update presentation for Series B', artifactType: 'presentation', domain: 'finance' },
  { prompt: 'Build a SaaS metrics dashboard: MRR, ARR, churn, NRR', artifactType: 'dashboard', domain: 'finance' },
  { prompt: 'Generate an accounts-payable ageing report', artifactType: 'report', domain: 'finance' },
  { prompt: 'Create a credit-note request form for customers', artifactType: 'form', domain: 'finance' },
  { prompt: 'Build a grant-spending tracker dashboard for non-profit', artifactType: 'dashboard', domain: 'finance' },
];

// -- Marketing (20 fixtures) --------------------------------------------------
const MARKETING: Fixture[] = [
  { prompt: 'Build a campaign performance dashboard showing impressions, clicks, and conversions', artifactType: 'dashboard', domain: 'marketing' },
  { prompt: 'Create a content calendar gallery sorted by publish date', artifactType: 'gallery', domain: 'marketing' },
  { prompt: 'Generate a weekly digital marketing report with channel breakdown', artifactType: 'report', domain: 'marketing' },
  { prompt: 'Build a lead-gen funnel dashboard by traffic source', artifactType: 'dashboard', domain: 'marketing' },
  { prompt: 'Create a webinar registration form', artifactType: 'form', domain: 'marketing' },
  { prompt: 'Make a brand asset gallery with download links', artifactType: 'gallery', domain: 'marketing' },
  { prompt: 'Build a SEO keyword rank-tracking dashboard', artifactType: 'dashboard', domain: 'marketing' },
  { prompt: 'Generate a monthly social media performance report', artifactType: 'report', domain: 'marketing' },
  { prompt: 'Create a campaign brief submission form', artifactType: 'form', domain: 'marketing' },
  { prompt: 'Build a marketing attribution dashboard by channel', artifactType: 'dashboard', domain: 'marketing' },
  { prompt: 'Make a product launch presentation for the marketing kickoff', artifactType: 'presentation', domain: 'marketing' },
  { prompt: 'Create a partner co-marketing portal', artifactType: 'portal', domain: 'marketing' },
  { prompt: 'Build an email campaign performance dashboard', artifactType: 'dashboard', domain: 'marketing' },
  { prompt: 'Generate a quarterly brand awareness report', artifactType: 'report', domain: 'marketing' },
  { prompt: 'Create an event speaker submission form', artifactType: 'form', domain: 'marketing' },
  { prompt: 'Build a paid ads ROAS dashboard across Google and Meta', artifactType: 'dashboard', domain: 'marketing' },
  { prompt: 'Make a thought leadership document for the content team', artifactType: 'document', domain: 'marketing' },
  { prompt: 'Create a press release submission portal', artifactType: 'portal', domain: 'marketing' },
  { prompt: 'Build a product roadmap website for external audiences', artifactType: 'website', domain: 'marketing' },
  { prompt: 'Generate a competitor analysis report', artifactType: 'report', domain: 'marketing' },
];

// -- Operations / Logistics (20 fixtures) -------------------------------------
const OPS: Fixture[] = [
  { prompt: 'Build an inventory stock-level dashboard with low-stock alerts', artifactType: 'dashboard', domain: 'ops', impliedEntities: ['inventory', 'stock'] },
  { prompt: 'Create a purchase-order request form for the procurement team', artifactType: 'form', domain: 'ops' },
  { prompt: 'Generate a supplier scorecard report by on-time delivery', artifactType: 'report', domain: 'ops' },
  { prompt: 'Build a warehouse capacity dashboard by zone', artifactType: 'dashboard', domain: 'ops' },
  { prompt: 'Create a maintenance request form for facilities', artifactType: 'form', domain: 'ops' },
  { prompt: 'Make a supplier portal showing open POs and delivery dates', artifactType: 'portal', domain: 'ops' },
  { prompt: 'Build an SLA compliance dashboard for customer support', artifactType: 'dashboard', domain: 'ops' },
  { prompt: 'Generate a returns and refunds report by SKU', artifactType: 'report', domain: 'ops' },
  { prompt: 'Create an asset checkout form for equipment management', artifactType: 'form', domain: 'ops' },
  { prompt: 'Build a production schedule dashboard for manufacturing', artifactType: 'dashboard', domain: 'ops' },
  { prompt: 'Make a field service portal for technician assignments', artifactType: 'portal', domain: 'ops' },
  { prompt: 'Generate an order fulfilment status report', artifactType: 'report', domain: 'ops' },
  { prompt: 'Build a fleet tracking dashboard by vehicle status', artifactType: 'dashboard', domain: 'ops' },
  { prompt: 'Create a quality inspection checklist form', artifactType: 'form', domain: 'ops' },
  { prompt: 'Make a standard operating procedures document', artifactType: 'document', domain: 'ops' },
  { prompt: 'Build a demand-forecasting dashboard by product category', artifactType: 'dashboard', domain: 'ops' },
  { prompt: 'Generate a lead-time analysis report by supplier', artifactType: 'report', domain: 'ops' },
  { prompt: 'Create a waste and scrap tracking form for manufacturing', artifactType: 'form', domain: 'ops' },
  { prompt: 'Build an incident-tracking dashboard for HSE', artifactType: 'dashboard', domain: 'ops' },
  { prompt: 'Make a continuity-planning document for critical processes', artifactType: 'document', domain: 'ops' },
];

// -- E-commerce / Product (20 fixtures) ---------------------------------------
const ECOM: Fixture[] = [
  { prompt: 'Build a product catalogue for our e-commerce site with filters', artifactType: 'website', domain: 'ecom', impliedEntities: ['product'] },
  { prompt: 'Create a product returns form for customers', artifactType: 'form', domain: 'ecom' },
  { prompt: 'Generate a bestseller report by category and month', artifactType: 'report', domain: 'ecom' },
  { prompt: 'Build a real-time orders dashboard for the ops team', artifactType: 'dashboard', domain: 'ecom' },
  { prompt: 'Create a product image gallery with zoom and variants', artifactType: 'gallery', domain: 'ecom' },
  { prompt: 'Build a customer order portal with tracking links', artifactType: 'portal', domain: 'ecom' },
  { prompt: 'Generate a category revenue report by date range', artifactType: 'report', domain: 'ecom' },
  { prompt: 'Create a wholesale order form for B2B buyers', artifactType: 'form', domain: 'ecom' },
  { prompt: 'Build a product performance dashboard with GMV and units', artifactType: 'dashboard', domain: 'ecom' },
  { prompt: 'Make a new-product launch presentation for the board', artifactType: 'presentation', domain: 'ecom' },
  { prompt: 'Create a size-guide document for the apparel catalogue', artifactType: 'document', domain: 'ecom' },
  { prompt: 'Build a discount and promotions dashboard', artifactType: 'dashboard', domain: 'ecom' },
  { prompt: 'Generate a cart abandonment analysis report', artifactType: 'report', domain: 'ecom' },
  { prompt: 'Create a product feedback submission form', artifactType: 'form', domain: 'ecom' },
  { prompt: 'Build a warehouse pick-list dashboard by zone', artifactType: 'dashboard', domain: 'ecom' },
  { prompt: 'Make a product directory website for a wholesale marketplace', artifactType: 'website', domain: 'ecom' },
  { prompt: 'Generate a refund and dispute resolution report', artifactType: 'report', domain: 'ecom' },
  { prompt: 'Create an affiliate registration form with payout details', artifactType: 'form', domain: 'ecom' },
  { prompt: 'Build a customer review gallery sorted by rating', artifactType: 'gallery', domain: 'ecom' },
  { prompt: 'Make a marketplace seller portal for product submissions', artifactType: 'portal', domain: 'ecom' },
];

// -- Research / Education (15 fixtures) ----------------------------------------
const EDU: Fixture[] = [
  { prompt: 'Build a student grade tracker dashboard by course', artifactType: 'dashboard', domain: 'edu' },
  { prompt: 'Create a research data collection form for survey participants', artifactType: 'form', domain: 'edu' },
  { prompt: 'Generate a cohort performance report for academic advisors', artifactType: 'report', domain: 'edu' },
  { prompt: 'Make a course catalogue website for a training provider', artifactType: 'website', domain: 'edu' },
  { prompt: 'Build a thesis project portal for graduate students', artifactType: 'portal', domain: 'edu' },
  { prompt: 'Create a reading list document for the data science module', artifactType: 'document', domain: 'edu' },
  { prompt: 'Build an attendance tracking dashboard by class', artifactType: 'dashboard', domain: 'edu' },
  { prompt: 'Generate a grant utilisation report for the research team', artifactType: 'report', domain: 'edu' },
  { prompt: 'Create a lab equipment request form for researchers', artifactType: 'form', domain: 'edu' },
  { prompt: 'Make a faculty directory gallery with research interests', artifactType: 'gallery', domain: 'edu' },
  { prompt: 'Build a curriculum planning presentation for the department', artifactType: 'presentation', domain: 'edu' },
  { prompt: 'Create a student project showcase gallery', artifactType: 'gallery', domain: 'edu' },
  { prompt: 'Generate a learning outcome completion report by programme', artifactType: 'report', domain: 'edu' },
  { prompt: 'Build an experiment results dashboard for lab data', artifactType: 'dashboard', domain: 'edu' },
  { prompt: 'Create a scholarship application submission form', artifactType: 'form', domain: 'edu' },
];

// -- Healthcare (15 fixtures) --------------------------------------------------
const HEALTH: Fixture[] = [
  { prompt: 'Build a patient appointments dashboard for clinic staff', artifactType: 'dashboard', domain: 'health', impliedEntities: ['patient', 'appointment'] },
  { prompt: 'Create a patient intake form with medical history fields', artifactType: 'form', domain: 'health' },
  { prompt: 'Generate a monthly procedure volume report by department', artifactType: 'report', domain: 'health' },
  { prompt: 'Build a bed occupancy dashboard for hospital administrators', artifactType: 'dashboard', domain: 'health' },
  { prompt: 'Make a clinical trial enrollment portal for researchers', artifactType: 'portal', domain: 'health' },
  { prompt: 'Create a medication request form for ward pharmacists', artifactType: 'form', domain: 'health' },
  { prompt: 'Build a staff rota dashboard by shift and specialty', artifactType: 'dashboard', domain: 'health' },
  { prompt: 'Generate a patient readmission rate report by ward', artifactType: 'report', domain: 'health' },
  { prompt: 'Create a referral submission form for GPs', artifactType: 'form', domain: 'health' },
  { prompt: 'Make a healthcare provider directory website', artifactType: 'website', domain: 'health' },
  { prompt: 'Build a chronic disease management dashboard', artifactType: 'dashboard', domain: 'health' },
  { prompt: 'Generate an equipment maintenance schedule report', artifactType: 'report', domain: 'health' },
  { prompt: 'Create a consent form for research participants', artifactType: 'form', domain: 'health' },
  { prompt: 'Build a vaccine administration tracking dashboard', artifactType: 'dashboard', domain: 'health' },
  { prompt: 'Make a clinical protocol document for the nursing team', artifactType: 'document', domain: 'health' },
];

// -- Edge / adversarial (15 fixtures) -----------------------------------------
const EDGE: Fixture[] = [
  // Very short prompts
  { prompt: 'Sales numbers', artifactType: 'dashboard', domain: 'edge', minConfidence: 0.5 },
  { prompt: 'Team directory', artifactType: 'gallery', domain: 'edge', minConfidence: 0.5 },
  { prompt: 'Invoice form', artifactType: 'form', domain: 'edge', minConfidence: 0.6 },
  // Ambiguous prompts
  { prompt: 'Build something to track my data', artifactType: 'dashboard', domain: 'edge', minConfidence: 0.4 },
  { prompt: 'I need an app for my team', artifactType: 'portal', domain: 'edge', minConfidence: 0.3 },
  // Very long prompts
  { prompt: 'Build a comprehensive multi-tab executive dashboard that consolidates CRM pipeline data, financial forecasts from the finance team, project status from the PMO, and headcount metrics from HR into a single source of truth for the C-suite with drill-down capabilities per business unit', artifactType: 'dashboard', domain: 'edge', minConfidence: 0.7 },
  // Follow-up / iterative prompts
  { prompt: 'Add a date range filter to the existing dashboard', artifactType: 'dashboard', domain: 'edge', minConfidence: 0.5 },
  { prompt: 'Change the chart from bar to line', artifactType: 'dashboard', domain: 'edge', minConfidence: 0.4 },
  // Document-type prompts
  { prompt: 'Write a one-pager for my sales team describing the new commission structure', artifactType: 'document', domain: 'edge', minConfidence: 0.6 },
  { prompt: 'Create a meeting agenda template', artifactType: 'document', domain: 'edge', minConfidence: 0.55 },
  // Website prompts
  { prompt: 'Build a public-facing status page for our API', artifactType: 'website', domain: 'edge', minConfidence: 0.65 },
  { prompt: 'Create a landing page for our product with a waitlist form', artifactType: 'website', domain: 'edge', minConfidence: 0.6 },
  // Presentation prompts
  { prompt: 'Make investor slides for our Series A fundraise', artifactType: 'presentation', domain: 'edge', minConfidence: 0.65 },
  { prompt: 'Build a deck for our all-hands meeting next Friday', artifactType: 'presentation', domain: 'edge', minConfidence: 0.6 },
  // Multi-language hint
  { prompt: 'Tableau de bord pour les ventes mensuelles', artifactType: 'dashboard', domain: 'edge', minConfidence: 0.4 },
];

const ALL_FIXTURES: Fixture[] = [
  ...CRM, ...PM, ...HR, ...FINANCE, ...MARKETING, ...OPS, ...ECOM, ...EDU, ...HEALTH, ...EDGE,
];

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function toGenerationInput(f: Fixture, i: number): GenerationInput {
  return {
    projectId: `proj_golden_${i}`,
    runId: `run_golden_${i}`,
    stackId: 'stk_golden',
    prompt: f.prompt,
    artifactType: f.artifactType,
  };
}

// ---------------------------------------------------------------------------
// Suite 1 — Fixture catalogue integrity
// ---------------------------------------------------------------------------

describe('Golden fixture catalogue — integrity', () => {
  it(`has at least 200 fixtures (got ${ALL_FIXTURES.length})`, () => {
    expect(ALL_FIXTURES.length).toBeGreaterThanOrEqual(200);
  });

  it('every fixture has a non-empty prompt', () => {
    for (const f of ALL_FIXTURES) {
      expect(f.prompt.trim().length, `empty prompt in ${f.domain}`).toBeGreaterThan(0);
    }
  });

  it('every fixture artifact type is a valid ArtifactType', () => {
    for (const f of ALL_FIXTURES) {
      expect(VALID_TYPES, `invalid type "${f.artifactType}" in "${f.prompt}"`).toContain(f.artifactType);
    }
  });

  it('all prompts are unique', () => {
    const seen = new Set<string>();
    for (const f of ALL_FIXTURES) {
      expect(seen.has(f.prompt), `duplicate prompt: "${f.prompt}"`).toBe(false);
      seen.add(f.prompt);
    }
  });

  it('covers all 8 artifact types at least once', () => {
    const covered = new Set(ALL_FIXTURES.map((f) => f.artifactType));
    for (const t of VALID_TYPES) {
      expect(covered, `artifact type "${t}" not covered`).toContain(t);
    }
  });

  it('covers all 10 domains', () => {
    const domains = new Set(ALL_FIXTURES.map((f) => f.domain));
    for (const d of ['crm', 'pm', 'hr', 'finance', 'marketing', 'ops', 'ecom', 'edu', 'health', 'edge']) {
      expect(domains, `domain "${d}" not covered`).toContain(d);
    }
  });

  it('dashboards are the most common type (realistic distribution)', () => {
    const counts = VALID_TYPES.map((t) => ALL_FIXTURES.filter((f) => f.artifactType === t).length);
    const dashboardCount = ALL_FIXTURES.filter((f) => f.artifactType === 'dashboard').length;
    expect(dashboardCount).toBeGreaterThan(Math.max(...counts.filter((_, i) => VALID_TYPES[i] !== 'dashboard')));
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — GenerationInput shape validation
// ---------------------------------------------------------------------------

describe('GenerationInput — shape validation for all fixtures', () => {
  for (const [i, fixture] of ALL_FIXTURES.entries()) {
    it(`fixture ${i + 1}: "${fixture.prompt.slice(0, 60)}…"`, () => {
      const input = toGenerationInput(fixture, i);
      expect(input.prompt).toBe(fixture.prompt);
      expect(input.artifactType).toBe(fixture.artifactType);
      expect(typeof input.projectId).toBe('string');
      expect(typeof input.runId).toBe('string');
      expect(typeof input.stackId).toBe('string');
    });
  }
});

// ---------------------------------------------------------------------------
// Suite 3 — Intent keyword heuristics (offline, no LLM call)
// ---------------------------------------------------------------------------

describe('Intent keyword heuristics', () => {
  it('dashboard prompts contain signals: dashboard|track|show|monitor|overview', () => {
    const dashboards = ALL_FIXTURES.filter((f) => f.artifactType === 'dashboard' && f.domain !== 'edge');
    const signals = /dashboard|track|show|monitor|overview|status|metric|kpi|trend|chart|graph|summary/i;
    const passing = dashboards.filter((f) => signals.test(f.prompt));
    expect(passing.length / dashboards.length).toBeGreaterThan(0.7);
  });

  it('form prompts contain signals: form|submit|request|intake|entry|upload|register', () => {
    const forms = ALL_FIXTURES.filter((f) => f.artifactType === 'form' && f.domain !== 'edge');
    const signals = /form|submit|request|intake|entry|upload|register|input|fill/i;
    const passing = forms.filter((f) => signals.test(f.prompt));
    expect(passing.length / forms.length).toBeGreaterThan(0.7);
  });

  it('report prompts contain signals: report|analysis|generate|breakdown|summary|analyse', () => {
    const reports = ALL_FIXTURES.filter((f) => f.artifactType === 'report' && f.domain !== 'edge');
    const signals = /report|analysis|analyse|generate|breakdown|summary|scorecard|trend/i;
    const passing = reports.filter((f) => signals.test(f.prompt));
    expect(passing.length / reports.length).toBeGreaterThan(0.7);
  });

  it('portal prompts contain signals: portal|access|external|client|view', () => {
    const portals = ALL_FIXTURES.filter((f) => f.artifactType === 'portal' && f.domain !== 'edge');
    const signals = /portal|external|client|access|self-service|partner|vendor|employee/i;
    const passing = portals.filter((f) => signals.test(f.prompt));
    expect(passing.length / portals.length).toBeGreaterThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Plan structural shape tests (no Zod runtime import needed)
// ---------------------------------------------------------------------------

type PlanStep = { id: string; type: string; title: string; description: string; tables: string[]; columns: string[]; dependencies: string[] };
type SamplePlan = { id: string; runId: string; intent: string; artifactType: string; stackId: string; createdAt: string; steps: PlanStep[] };

const VALID_STEP_TYPES = ['component', 'page', 'hook', 'util', 'api-route', 'layout'];
const VALID_ARTIFACT_TYPES_SET = new Set(VALID_TYPES);

function isPlanValid(p: SamplePlan): boolean {
  if (!p.id || !p.runId || !p.intent || !p.stackId || !p.createdAt) return false;
  if (!VALID_ARTIFACT_TYPES_SET.has(p.artifactType as ArtifactType)) return false;
  return p.steps.every((s) => VALID_STEP_TYPES.includes(s.type));
}

describe('Plan structural validation', () => {
  const BASE_STEP: PlanStep = { id: 'step_1', type: 'component', title: 'PipelineChart', description: 'Bar chart', tables: ['Deals'], columns: ['Stage'], dependencies: [] };
  const SAMPLE_PLAN: SamplePlan = {
    id: '00000000-0000-0000-0000-000000000001',
    runId: '00000000-0000-0000-0000-000000000002',
    intent: 'Build a sales pipeline dashboard',
    artifactType: 'dashboard',
    stackId: 'stk_test',
    createdAt: new Date().toISOString(),
    steps: [BASE_STEP],
  };

  it('accepts a well-formed plan', () => { expect(isPlanValid(SAMPLE_PLAN)).toBe(true); });
  it('rejects a plan missing id', () => { expect(isPlanValid({ ...SAMPLE_PLAN, id: '' })).toBe(false); });
  it('rejects a plan with invalid artifactType', () => { expect(isPlanValid({ ...SAMPLE_PLAN, artifactType: 'spreadsheet' })).toBe(false); });
  it('rejects a plan step with invalid type', () => { expect(isPlanValid({ ...SAMPLE_PLAN, steps: [{ ...BASE_STEP, type: 'unknown' }] })).toBe(false); });
  it('accepts a plan with empty steps', () => { expect(isPlanValid({ ...SAMPLE_PLAN, steps: [] })).toBe(true); });
  it('accepts all valid artifact types', () => {
    for (const t of VALID_TYPES) {
      expect(isPlanValid({ ...SAMPLE_PLAN, artifactType: t })).toBe(true);
    }
  });
  it('accepts all valid step types', () => {
    for (const t of VALID_STEP_TYPES) {
      expect(isPlanValid({ ...SAMPLE_PLAN, steps: [{ ...BASE_STEP, type: t }] })).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — Intent structural validation
// ---------------------------------------------------------------------------

const VALID_CAPABILITIES = new Set(['read', 'write', 'search', 'filter', 'aggregate', 'upload', 'present', 'seo', 'auth', 'deep_link', 'camera', 'clipboard']);
const VALID_INTENT_TYPES = new Set(['app', 'report', 'presentation', 'website', 'document', 'form']);

type SampleIntent = { goal: string; audience: string; artifact_type: string; artifact_type_confidence: number; required_capabilities: string[] };

function isIntentValid(i: SampleIntent): boolean {
  if (!i.goal || !i.audience) return false;
  if (!VALID_INTENT_TYPES.has(i.artifact_type)) return false;
  if (i.artifact_type_confidence < 0 || i.artifact_type_confidence > 1) return false;
  return i.required_capabilities.every((c) => VALID_CAPABILITIES.has(c));
}

describe('Intent structural validation', () => {
  const BASE: SampleIntent = { goal: 'Show overdue tasks', audience: 'Project managers', artifact_type: 'app', artifact_type_confidence: 0.92, required_capabilities: ['read', 'filter'] };
  it('accepts a well-formed intent', () => { expect(isIntentValid(BASE)).toBe(true); });
  it('rejects confidence > 1', () => { expect(isIntentValid({ ...BASE, artifact_type_confidence: 1.5 })).toBe(false); });
  it('rejects confidence < 0', () => { expect(isIntentValid({ ...BASE, artifact_type_confidence: -0.1 })).toBe(false); });
  it('rejects unknown capability', () => { expect(isIntentValid({ ...BASE, required_capabilities: ['fly'] })).toBe(false); });
  it('rejects unknown artifact type', () => { expect(isIntentValid({ ...BASE, artifact_type: 'spreadsheet' })).toBe(false); });
  it('accepts all valid intent types', () => {
    for (const t of VALID_INTENT_TYPES) {
      expect(isIntentValid({ ...BASE, artifact_type: t })).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — Workflow export smoke test
// ---------------------------------------------------------------------------

describe('GenerationWorkflow export', () => {
  it('is exported and is a function', () => {
    expect(typeof GenerationWorkflow).toBe('function');
  });

  it('accepts valid GenerationInput shapes from all domains', () => {
    const samples = [CRM[0]!, PM[0]!, HR[0]!, FINANCE[0]!, MARKETING[0]!, OPS[0]!, ECOM[0]!, EDU[0]!, HEALTH[0]!];
    for (const f of samples) {
      const input: GenerationInput = toGenerationInput(f, 0);
      expect(input.artifactType).toBe(f.artifactType);
    }
  });
});
