import { describe, it, expect } from 'vitest';
import { GenerationWorkflow } from '../workflows/generation.js';
import type { GenerationInput } from '../workflows/shared/workflow-types.js';
import type { ArtifactType } from '@stackby/schema-types';

const GOLDEN_FIXTURES: Array<{ prompt: string; artifactType: ArtifactType }> = [
  { prompt: 'Build a task dashboard showing overdue items', artifactType: 'dashboard' },
  { prompt: 'Create an employee directory with search and filters', artifactType: 'gallery' },
  { prompt: 'Make a project status portal for external clients', artifactType: 'portal' },
  { prompt: 'Build a budget tracker with monthly totals', artifactType: 'dashboard' },
  { prompt: 'Create a contact form that saves to Stackby', artifactType: 'form' },
  { prompt: 'Generate a weekly CRM activity report', artifactType: 'report' },
  { prompt: 'Build a product catalogue for our e-commerce site', artifactType: 'website' },
  { prompt: 'Create an invoice document for clients', artifactType: 'document' },
];

const VALID_ARTIFACT_TYPES: ArtifactType[] = [
  'dashboard', 'portal', 'report', 'form', 'gallery', 'website', 'document', 'presentation',
];

describe('GenerationWorkflow — golden fixtures (unit)', () => {
  it('workflow function is exported and is a function', () => {
    expect(typeof GenerationWorkflow).toBe('function');
  });

  it('all golden fixture artifact types are valid ArtifactType values', () => {
    for (const fixture of GOLDEN_FIXTURES) {
      expect(VALID_ARTIFACT_TYPES).toContain(fixture.artifactType);
    }
  });

  it('GenerationInput type accepts all golden fixtures', () => {
    for (const fixture of GOLDEN_FIXTURES) {
      const input: GenerationInput = {
        projectId: 'proj_1',
        runId: `run_${fixture.artifactType}`,
        stackId: 'stk_test',
        prompt: fixture.prompt,
        artifactType: fixture.artifactType,
      };
      expect(input.prompt).toBe(fixture.prompt);
      expect(input.artifactType).toBe(fixture.artifactType);
    }
  });

  it('all 8 fixtures cover unique prompts', () => {
    const prompts = GOLDEN_FIXTURES.map((f) => f.prompt);
    const unique = new Set(prompts);
    expect(unique.size).toBe(GOLDEN_FIXTURES.length);
  });
});
