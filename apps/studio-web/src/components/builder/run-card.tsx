'use client';

import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import type { RunEvent } from '@/src/hooks/use-run-events';

const STEP_LABELS: Record<string, string> = {
  intent: 'Analyzing intent',
  schema_analyzed: 'Schema analyzed',
  clarification: 'Clarification needed',
  plan: 'Plan ready',
  plan_approved: 'Plan approved',
  codegen: 'Generating code',
  build_progress: 'Building',
  verify: 'Verifying',
  fix: 'Fixing',
  ready: 'Built',
  error: 'Error',
};

function StepDetail({ event }: { event: RunEvent }) {
  switch (event.type) {
    case 'build_progress': {
      const progress = typeof event.data['progress'] === 'number' ? event.data['progress'] : 0;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <div style={{ flex: 1, height: '3px', background: '#2E2E2E', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#2D7FF9', transition: 'width 300ms' }} />
          </div>
          <span style={{ fontSize: '12px', color: '#8A8A8A', fontVariantNumeric: 'tabular-nums' }}>{progress}%</span>
        </div>
      );
    }
    case 'verify': {
      const pass = event.data['pass'];
      const issues = event.data['issues'];
      return (
        <div style={{ marginTop: '4px' }}>
          <p style={{ fontSize: '13px', color: pass ? '#3ECF8E' : '#ef4444' }}>
            {pass ? '✓ Passed' : '✗ Issues found'}
          </p>
          {Array.isArray(issues) && issues.map((issue, i) => (
            <p key={i} style={{ fontSize: '13px', color: '#8A8A8A', paddingLeft: '12px', borderLeft: '2px solid rgba(239,68,68,0.4)' }}>
              {String(issue)}
            </p>
          ))}
        </div>
      );
    }
    case 'fix': {
      const attempt = event.data['attempt'];
      const issue = event.data['issue'];
      return (
        <p style={{ fontSize: '13px', color: '#8A8A8A', marginTop: '2px' }}>
          Attempt {typeof attempt === 'number' ? attempt : '?'} — {typeof issue === 'string' ? issue : ''}
        </p>
      );
    }
    case 'error': {
      const code = event.data['code'];
      const message = event.data['message'];
      return (
        <p style={{ fontSize: '13px', color: '#ef4444', marginTop: '2px' }}>
          {typeof code === 'string' ? code : 'ERROR'}{typeof message === 'string' ? ` — ${message}` : ''}
        </p>
      );
    }
    default:
      return null;
  }
}

interface RunCardProps {
  event: RunEvent;
  isLatest: boolean;
}

export function RunCard({ event, isLatest }: RunCardProps) {
  const [expanded, setExpanded] = useState(false);
  const label = STEP_LABELS[event.type] ?? event.type;
  const hasDetail = ['build_progress', 'verify', 'fix', 'error'].includes(event.type);

  if (event.type === 'ready') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Built step row */}
        <button
          onClick={() => setExpanded((o) => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            height: '48px', padding: '0 14px', borderRadius: '10px',
            background: '#1F1F1F', border: '1px solid #2E2E2E',
            fontSize: '16px', color: '#EDEDED', cursor: 'pointer', width: '100%',
          }}
        >
          <Check strokeWidth={1.6} style={{ width: '18px', height: '18px', color: '#8A8A8A', flexShrink: 0 }} />
          <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
          <ChevronRight strokeWidth={1.6} style={{ width: '16px', height: '16px', color: '#8A8A8A', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
        </button>
        {/* Rating widget */}
        <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '10px', background: '#232323', borderRadius: '10px', padding: '9px 14px', fontSize: '14px', color: '#EDEDED' }}>
          How was this result?
          <span style={{ letterSpacing: '2px', color: '#6B6B6B' }}>★★★★★</span>
        </div>
      </div>
    );
  }

  if (event.type === 'intent' || event.type === 'schema_analyzed' || event.type === 'plan_approved') {
    const detail = event.type === 'schema_analyzed'
      ? `${typeof event.data['tableCount'] === 'number' ? event.data['tableCount'] : '?'} tables · ${typeof event.data['columnCount'] === 'number' ? event.data['columnCount'] : '?'} columns`
      : event.type === 'intent' && typeof event.data['intent'] === 'string'
        ? event.data['intent']
        : null;
    return (
      <div style={{ padding: '4px 0' }}>
        {detail && <p style={{ fontSize: '16px', lineHeight: 1.5, color: '#EDEDED' }}>{detail}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => hasDetail && setExpanded((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          height: '48px', padding: '0 14px', borderRadius: '10px',
          background: '#1F1F1F', border: '1px solid #2E2E2E',
          fontSize: '16px', color: isLatest ? '#EDEDED' : '#8A8A8A',
          cursor: hasDetail ? 'pointer' : 'default', width: '100%',
        }}
      >
        <Check strokeWidth={1.6} style={{ width: '18px', height: '18px', color: '#8A8A8A', flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        {hasDetail && (
          <ChevronRight strokeWidth={1.6} style={{ width: '16px', height: '16px', color: '#8A8A8A', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
        )}
      </button>
      {expanded && hasDetail && (
        <div style={{ paddingLeft: '14px', paddingTop: '4px' }}>
          <StepDetail event={event} />
        </div>
      )}
    </div>
  );
}
