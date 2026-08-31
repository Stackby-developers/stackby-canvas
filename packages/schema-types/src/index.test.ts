import { describe, it, expect } from 'vitest';
import {
  StackbySchemaGraphSchema,
  DataBindingSchema,
  FileOperationSchema,
  RunEventSchema,
  ArtifactTypeSchema,
  StudioErrorSchema,
  READ_ONLY_COLUMN_TYPES,
  IntentSchema,
  CapabilitySchema,
  IntentArtifactTypeSchema,
  SchemaAnalysisSchema,
  CandidateBindingSchema,
  ClarifierOutputSchema,
  PlannerOutputSchema,
  SectionKindSchema,
  DesignerOutputSchema,
  TokenSetSchema,
  CodeGenOutputSchema,
  CodeGenOperationSchema,
  VisualVerifierOutputSchema,
  VerifierMessagePartSchema,
  FixerOutputSchema,
  SummariserOutputSchema,
  VisualEditInputSchema,
  VisualEditOutputSchema,
  AnnotationEditOutputSchema,
  AnnotationSchema,
  validateAnnotationCoverage,
  StackGeneratorOutputSchema,
  StackGenColumnTypeSchema,
  TemplateRemapOutputSchema,
  MappingRoleSchema,
  MappingBasisSchema,
} from './index.js';

describe('schema-types smoke tests', () => {
  it('ArtifactTypeSchema parses all variants', () => {
    expect(ArtifactTypeSchema.parse('dashboard')).toBe('dashboard');
    expect(ArtifactTypeSchema.parse('portal')).toBe('portal');
  });

  it('StudioErrorSchema validates correctly', () => {
    const err = StudioErrorSchema.parse({
      code: 'INTERNAL',
      message: 'internal error',
      httpStatus: 500,
      retryable: false,
      userMessage: 'Something went wrong',
    });
    expect(err.retryable).toBe(false);
  });

  it('FileOperationSchema discriminates on op', () => {
    const write = FileOperationSchema.parse({ op: 'write', path: '/foo.ts', content: 'hello' });
    expect(write.op).toBe('write');
    const del = FileOperationSchema.parse({ op: 'delete', path: '/foo.ts' });
    expect(del.op).toBe('delete');
  });

  it('RunEventSchema parses ready event', () => {
    const ev = RunEventSchema.parse({
      type: 'ready',
      runId: '00000000-0000-0000-0000-000000000001',
      ts: Date.now(),
      data: { previewUrl: 'https://preview.stackby.com/abc' },
    });
    expect(ev.type).toBe('ready');
  });

  it('READ_ONLY_COLUMN_TYPES includes formula', () => {
    expect(READ_ONLY_COLUMN_TYPES.has('formula')).toBe(true);
    expect(READ_ONLY_COLUMN_TYPES.has('text')).toBe(false);
  });

  it('StackbySchemaGraphSchema validates a minimal stack', () => {
    const graph = StackbySchemaGraphSchema.parse({
      stackId: 'stk_1',
      stackName: 'My Stack',
      tables: [
        {
          id: 'tbl_1',
          name: 'Tasks',
          primaryColumnId: 'col_1',
          columns: [{ id: 'col_1', name: 'Name', type: 'text' }],
        },
      ],
      fetchedAt: new Date().toISOString(),
    });
    expect(graph.tables).toHaveLength(1);
  });

  it('DataBindingSchema validates a binding', () => {
    const binding = DataBindingSchema.parse({
      componentId: 'cmp_1',
      tableId: 'tbl_1',
      tableName: 'Tasks',
      columnIds: ['col_1', 'col_2'],
    });
    expect(binding.columnIds).toHaveLength(2);
  });

  it('IntentArtifactTypeSchema accepts user-facing types', () => {
    for (const t of ['app', 'report', 'presentation', 'website', 'document', 'form'] as const) {
      expect(IntentArtifactTypeSchema.parse(t)).toBe(t);
    }
  });

  it('IntentArtifactTypeSchema rejects planner-level types', () => {
    expect(() => IntentArtifactTypeSchema.parse('dashboard')).toThrow();
    expect(() => IntentArtifactTypeSchema.parse('portal')).toThrow();
    expect(() => IntentArtifactTypeSchema.parse('gallery')).toThrow();
  });

  it('CapabilitySchema accepts all declared capabilities', () => {
    const caps = [
      'read', 'write', 'search', 'filter', 'aggregate', 'upload',
      'present', 'seo', 'auth', 'deep_link', 'camera', 'clipboard',
    ] as const;
    for (const cap of caps) {
      expect(CapabilitySchema.parse(cap)).toBe(cap);
    }
  });

  it('IntentSchema parses a complete intent', () => {
    const intent = IntentSchema.parse({
      goal: 'Show open invoices grouped by client',
      audience: 'finance team',
      artifact_type: 'report',
      artifact_type_confidence: 1.0,
      required_capabilities: ['read', 'aggregate'],
      explicit_constraints: ['group by client'],
      implied_entities: ['invoices', 'clients'],
      tone_signals: ['corporate'],
      ambiguities: [],
    });
    expect(intent.artifact_type).toBe('report');
    expect(intent.required_capabilities).toContain('aggregate');
  });

  it('CandidateBindingSchema enforces 5000-row cap', () => {
    const base = {
      purpose: 'all rows',
      table_id: 'tbl_1',
      view_id: null,
      columns: ['col_1'],
      filter: null,
      sort: null,
      aggregation: null,
      cache_ttl_s: 30,
    };
    expect(() => CandidateBindingSchema.parse({ ...base, estimated_rows: 5000 })).not.toThrow();
    expect(() => CandidateBindingSchema.parse({ ...base, estimated_rows: 5001 })).toThrow();
  });

  it('SchemaAnalysisSchema accepts empty unanswerable and warnings', () => {
    const analysis = SchemaAnalysisSchema.parse({
      table_roles: [],
      semantic_profile: {},
      candidate_bindings: [],
      data_quality_warnings: [],
      unanswerable: [],
    });
    expect(analysis.unanswerable).toHaveLength(0);
  });

  it('ClarifierOutputSchema enforces exactly one recommended option per question', () => {
    const makeOutput = (recommendedCount: number) => ({
      questions: [
        {
          id: 'q1',
          question: 'Read-only or editable?',
          why_it_matters: 'determines write capability',
          options: Array.from({ length: 2 }, (_, i) => ({
            label: `Option ${i}`,
            detail: `detail ${i}`,
            recommended: i < recommendedCount,
          })),
          allow_free_text: true as const,
        },
      ],
      assumptions: [],
    });
    expect(() => ClarifierOutputSchema.parse(makeOutput(1))).not.toThrow();
    expect(() => ClarifierOutputSchema.parse(makeOutput(0))).toThrow();
    expect(() => ClarifierOutputSchema.parse(makeOutput(2))).toThrow();
  });

  it('ClarifierOutputSchema accepts zero questions', () => {
    const result = ClarifierOutputSchema.parse({
      questions: [],
      assumptions: [{ statement: 'read-only by default', confidence: 0.85 }],
    });
    expect(result.questions).toHaveLength(0);
    expect(result.assumptions[0]?.confidence).toBe(0.85);
  });

  it('SectionKindSchema accepts all declared kinds', () => {
    const kinds = [
      'hero', 'kpi_row', 'table', 'card_grid', 'chart', 'timeline',
      'detail_sheet', 'form', 'filter_bar', 'nav', 'footer', 'slide',
      'feature_strip', 'quote', 'cta',
    ] as const;
    for (const k of kinds) {
      expect(SectionKindSchema.parse(k)).toBe(k);
    }
  });

  it('TokenSetSchema requires exactly 8 chart colours', () => {
    const base = {
      color: {
        bg: '#fff', surface: '#f9f', 'surface-alt': '#f3f', text: '#111',
        'text-muted': '#6b7', accent: '#256', 'accent-fg': '#fff',
        border: '#e5e', success: '#16a', warning: '#d97', danger: '#dc2',
        chart: ['#a','#b','#c','#d','#e','#f','#g','#h'],
      },
      font: { display: 'Inter', body: 'Inter', mono: 'Mono', weights: {}, tracking: {} },
      size: { xs: '1px' }, space: { '0': '0' },
      radius: { none: '0' as const, sm: '2px', md: '4px', lg: '8px', full: '9999px' as const },
      shadow: { sm: 'none', md: 'none', lg: 'none' },
      motion: { fast: '100ms', base: '200ms', slow: '300ms', easing: 'ease' },
    };
    expect(() => TokenSetSchema.parse(base)).not.toThrow();
    expect(() => TokenSetSchema.parse({ ...base, color: { ...base.color, chart: ['#a','#b'] } })).toThrow();
  });

  it('DesignerOutputSchema rejects empty contrast_report', () => {
    const makeDesignerOutput = (contrast_report: unknown[]) => ({
      tokens: {
        color: {
          bg: '#fff', surface: '#f9f', 'surface-alt': '#f3f', text: '#111',
          'text-muted': '#6b7', accent: '#256', 'accent-fg': '#fff',
          border: '#e5e', success: '#16a', warning: '#d97', danger: '#dc2',
          chart: ['#a','#b','#c','#d','#e','#f','#g','#h'],
        },
        font: { display: 'Inter', body: 'Inter', mono: 'Mono', weights: {}, tracking: {} },
        size: { xs: '1px' }, space: { '0': '0' },
        radius: { none: '0' as const, sm: '2px', md: '4px', lg: '8px', full: '9999px' as const },
        shadow: { sm: 'none', md: 'none', lg: 'none' },
        motion: { fast: '100ms', base: '200ms', slow: '300ms', easing: 'ease' },
      },
      dark_mode: {
        color: {
          bg: '#000', surface: '#111', 'surface-alt': '#222', text: '#fff',
          'text-muted': '#aaa', accent: '#66f', 'accent-fg': '#000',
          border: '#333', success: '#0a0', warning: '#a70', danger: '#c00',
          chart: ['#a','#b','#c','#d','#e','#f','#g','#h'],
        },
        font: { display: 'Inter', body: 'Inter', mono: 'Mono', weights: {}, tracking: {} },
        size: { xs: '1px' }, space: { '0': '0' },
        radius: { none: '0' as const, sm: '2px', md: '4px', lg: '8px', full: '9999px' as const },
        shadow: { sm: 'none', md: 'none', lg: 'none' },
        motion: { fast: '100ms', base: '200ms', slow: '300ms', easing: 'ease' },
      },
      layout_grammar: {
        container_max: '1280px', grid_columns: 12, gutter: '24px',
        section_rhythm: '64px', breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 },
      },
      component_style_notes: {
        card: 'card style', table: 'table style', kpi_tile: 'kpi style',
        button: 'button style', input: 'input style',
      },
      contrast_report,
    });
    expect(() => DesignerOutputSchema.parse(makeDesignerOutput([{ pair: 'text on bg', ratio: 15.8, passes_aa: true }]))).not.toThrow();
    expect(() => DesignerOutputSchema.parse(makeDesignerOutput([]))).toThrow();
  });

  it('CodeGenOperationSchema discriminates on op', () => {
    const write = CodeGenOperationSchema.parse({ op: 'write', path: 'foo.tsx', content: 'x' });
    expect(write.op).toBe('write');
    const patch = CodeGenOperationSchema.parse({ op: 'patch', path: 'foo.tsx', find: 'x', replace: 'y' });
    expect(patch.op).toBe('patch');
    const del = CodeGenOperationSchema.parse({ op: 'delete', path: 'foo.tsx' });
    expect(del.op).toBe('delete');
  });

  it('CodeGenOutputSchema rejects path traversal', () => {
    expect(() =>
      CodeGenOutputSchema.parse([{ op: 'write', path: '../../secrets.env', content: '' }]),
    ).toThrow();
  });

  it('CodeGenOutputSchema rejects deleting stackby.config.json', () => {
    expect(() =>
      CodeGenOutputSchema.parse([{ op: 'delete', path: 'stackby.config.json' }]),
    ).toThrow();
  });

  it('VerifierMessagePartSchema discriminates text and screenshot', () => {
    const text = VerifierMessagePartSchema.parse({ kind: 'text', text: 'hello' });
    expect(text.kind).toBe('text');
    const shot = VerifierMessagePartSchema.parse({ kind: 'screenshot', breakpoint: 375, path: '/tmp/a.png' });
    expect(shot.kind).toBe('screenshot');
  });

  it('VerifierMessagePartSchema rejects invalid breakpoint', () => {
    expect(() =>
      VerifierMessagePartSchema.parse({ kind: 'screenshot', breakpoint: 1024, path: '/tmp/a.png' }),
    ).toThrow();
  });

  it('VisualVerifierOutputSchema rejects pass with blocker', () => {
    const bad = {
      verdict: 'pass',
      one_line: 'Looks fine.',
      defects: [{ severity: 'blocker', class: 'overflow', breakpoint: 375, where: 'header', evidence: 'x', fix_hint: 'y' }],
      plan_coverage: [{ section_id: 's1', present: true, note: '' }],
    };
    expect(() => VisualVerifierOutputSchema.parse(bad)).toThrow();
  });

  it('VisualVerifierOutputSchema accepts pass with no defects and full coverage', () => {
    const good = {
      verdict: 'pass',
      one_line: 'The app is clean at all three widths.',
      defects: [],
      plan_coverage: [{ section_id: 's1', present: true, note: '' }],
    };
    expect(() => VisualVerifierOutputSchema.parse(good)).not.toThrow();
  });

  it('FixerOutputSchema rejects resolved+unresolved overlap', () => {
    expect(() =>
      FixerOutputSchema.parse({
        operations: [],
        resolved: ['d0'],
        unresolved: [{ id: 'd0', why: 'Cannot fix' }],
      }),
    ).toThrow();
  });

  it('FixerOutputSchema accepts empty operations with unresolved items', () => {
    expect(() =>
      FixerOutputSchema.parse({
        operations: [],
        resolved: [],
        unresolved: [{ id: 'd1', why: 'Contrast locked by design system' }],
      }),
    ).not.toThrow();
  });

  it('SummariserOutputSchema enforces 8-word headline limit', () => {
    const base = {
      steps: [{ label: 'Generated files', detail: null, artifact_uri: null }],
      verdict_line: 'Looks good.',
      what_changed: [],
      suggested_next: [],
    };
    expect(() => SummariserOutputSchema.parse({ ...base, headline: 'Ticket tracker built' })).not.toThrow();
    expect(() => SummariserOutputSchema.parse({ ...base, headline: 'This headline has more than eight words right here' })).toThrow();
  });

  it('VisualEditInputSchema rejects inverted sourceRange', () => {
    expect(() =>
      VisualEditInputSchema.parse({
        elementPath: 'Root > Card',
        componentFile: 'components/Card.tsx',
        sourceRange: { start: 20, end: 10 },
        property: 'color',
        oldValue: '#fff',
        newValue: '#000',
        availableTokens: {},
        hasDesignSystem: false,
      }),
    ).toThrow();
  });

  it('VisualEditOutputSchema rejects token_used and token_proposed both non-null', () => {
    expect(() =>
      VisualEditOutputSchema.parse({
        operations: [],
        token_used: 'accent',
        token_proposed: { name: 'x', value: '#fff', css_var: '--x' },
        responsive_adjustments: [],
        explanation: 'conflict',
      }),
    ).toThrow();
  });

  it('VisualEditOutputSchema accepts null/null for tokens', () => {
    expect(() =>
      VisualEditOutputSchema.parse({
        operations: [],
        token_used: null,
        token_proposed: null,
        responsive_adjustments: [],
        explanation: 'Written literal to tokens.css.',
      }),
    ).not.toThrow();
  });

  it('AnnotationSchema accepts all three author roles', () => {
    for (const role of ['owner', 'editor', 'viewer'] as const) {
      expect(() =>
        AnnotationSchema.parse({
          annotationId: 'a1',
          anchor: { componentPath: 'c.tsx', elementPath: 'Root', breakpoint: 768, coordinates: { x: 0, y: 0 } },
          body: 'fix this',
          authorRole: role,
        }),
      ).not.toThrow();
    }
  });

  it('AnnotationEditOutputSchema rejects duplicate ids', () => {
    expect(() =>
      AnnotationEditOutputSchema.parse({
        operations: [],
        per_annotation: [
          { id: 'a1', status: 'applied', note: 'done' },
          { id: 'a1', status: 'needs_input', note: 'again?' },
        ],
      }),
    ).toThrow();
  });

  it('StackGenColumnTypeSchema accepts all declared types', () => {
    const types = [
      'text', 'multilineText', 'number', 'select', 'multiSelect', 'date',
      'checkbox', 'url', 'email', 'phone', 'rating', 'progress', 'duration',
      'currency', 'percent', 'attachment', 'collaborator',
      'link', 'lookup', 'rollup', 'count', 'formula',
    ] as const;
    for (const t of types) {
      expect(StackGenColumnTypeSchema.parse(t)).toBe(t);
    }
  });

  it('StackGeneratorOutputSchema rejects forward linkToTableKey reference', () => {
    expect(() =>
      StackGeneratorOutputSchema.parse({
        name: 'Test', icon: '📋', color: '#000000',
        tables: [
          { key: 'a', name: 'A', columns: [{ name: 'Ref', columnType: 'link', linkToTableKey: 'b' }], rows: [] },
          { key: 'b', name: 'B', columns: [{ name: 'X', columnType: 'text' }], rows: [] },
          { key: 'c', name: 'C', columns: [{ name: 'Y', columnType: 'text' }], rows: [] },
        ],
      }),
    ).toThrow();
  });

  it('MappingRoleSchema accepts all declared roles', () => {
    for (const role of ['title', 'status', 'date', 'owner', 'measure', 'image', 'link'] as const) {
      expect(MappingRoleSchema.parse(role)).toBe(role);
    }
  });

  it('MappingBasisSchema accepts all declared bases', () => {
    for (const basis of ['name', 'type', 'semantic_role', 'sample_values'] as const) {
      expect(MappingBasisSchema.parse(basis)).toBe(basis);
    }
  });

  it('TemplateRemapOutputSchema rejects create_column with null proposed_column', () => {
    expect(() =>
      TemplateRemapOutputSchema.parse({
        mappings: [],
        unmapped_required: [{ template_field: 'due_date', suggestion: 'create_column', proposed_column: null }],
        questions: [],
      }),
    ).toThrow();
  });

  it('TemplateRemapOutputSchema rejects more than 3 questions', () => {
    expect(() =>
      TemplateRemapOutputSchema.parse({
        mappings: [],
        unmapped_required: [],
        questions: [
          { id: 'q1', question: 'Q1?', options: ['A'] },
          { id: 'q2', question: 'Q2?', options: ['B'] },
          { id: 'q3', question: 'Q3?', options: ['C'] },
          { id: 'q4', question: 'Q4?', options: ['D'] },
        ],
      }),
    ).toThrow();
  });

  it('StackGeneratorOutputSchema rejects 7-digit hex color', () => {
    expect(() =>
      StackGeneratorOutputSchema.parse({
        name: 'Test', icon: '📋', color: '#0000000',
        tables: [
          { key: 'a', name: 'A', columns: [{ name: 'X', columnType: 'text' }], rows: [] },
          { key: 'b', name: 'B', columns: [{ name: 'X', columnType: 'text' }], rows: [] },
          { key: 'c', name: 'C', columns: [{ name: 'X', columnType: 'text' }], rows: [] },
        ],
      }),
    ).toThrow();
  });

  it('validateAnnotationCoverage detects missing and extra ids', () => {
    const output = {
      operations: [],
      per_annotation: [
        { id: 'a1', status: 'applied' as const, note: 'done' },
        { id: 'a3', status: 'applied' as const, note: 'done' },
      ],
    };
    const { missing, extra } = validateAnnotationCoverage(['a1', 'a2'], output);
    expect(missing).toContain('a2');
    expect(extra).toContain('a3');
  });

  it('SummariserOutputSchema rejects more than 2 suggested_next items', () => {
    expect(() =>
      SummariserOutputSchema.parse({
        headline: 'Tracker built',
        steps: [{ label: 'Done', detail: null, artifact_uri: null }],
        verdict_line: 'All good.',
        what_changed: [],
        suggested_next: ['A', 'B', 'C'],
      }),
    ).toThrow();
  });

  it('CodeGenOutputSchema rejects write+delete on same path', () => {
    expect(() =>
      CodeGenOutputSchema.parse([
        { op: 'write', path: 'components/X.tsx', content: 'x' },
        { op: 'delete', path: 'components/X.tsx' },
      ]),
    ).toThrow();
  });

  it('PlannerOutputSchema validates binding_ref cross-reference', () => {
    const plan = {
      version: 0,
      title: 'Ticket Tracker',
      summary: 'Shows open tickets. Two sentences.',
      artifact_type: 'app',
      pages: [{
        id: 'p1', route: '/', name: 'Home', purpose: 'overview',
        sections: [{
          id: 's1', name: 'Table', kind: 'table', purpose: 'list tickets',
          binding_ref: 'cb_missing',
          fields_shown: ['Name'], empty_state: 'none', interactions: [],
        }],
      }],
      bindings: [],
      visual_direction: {
        source: 'default', design_system_id: null,
        mood: 'clean', layout_grammar: '12-col', typography: 'Inter',
        density: 'comfortable', style_cards: [],
      },
      assumptions: [], data_notes: [], out_of_scope: [],
      estimated_files: 2, estimated_credits: 3,
    };
    expect(() => PlannerOutputSchema.parse(plan)).toThrow(/does not match any binding id/);
  });
});
