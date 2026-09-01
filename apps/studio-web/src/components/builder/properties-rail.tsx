'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@stackby/ui';
import type { RunEvent, RunPhase } from '@/src/hooks/use-run-events';
import { PropertyEditor } from './property-editor';
import { TokenBrowser } from './token-browser';
import { AnnotationPanel } from './annotation-panel';

interface PlanStep {
  id: string;
  type: string;
  title: string;
  description: string;
  tables: string[];
  columns: string[];
  dependencies: string[];
  estimatedLines?: number;
}

interface Plan {
  id: string;
  runId: string;
  intent: string;
  artifactType: string;
  stackId: string;
  steps: PlanStep[];
  estimatedDurationMs?: number;
}

interface PropertiesRailProps {
  projectId: string;
  runId: string | null;
  events: RunEvent[];
  phase: RunPhase;
}

export function PropertiesRail({ projectId, runId, events, phase }: PropertiesRailProps) {
  const planEvent = [...events].reverse().find((e) => e.type === 'plan');
  const plan = planEvent ? (planEvent.data as unknown as Plan) : null;

  return (
    <div className="w-80 shrink-0 border-l border-border bg-bg-elevated flex flex-col overflow-hidden">
      <div className="border-b border-border px-3 py-2">
        <p className="text-xs font-semibold text-text-muted">Properties</p>
      </div>

      <Tabs defaultValue="properties" className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border px-2 pt-1">
          <TabsList className="h-7 w-full gap-0 rounded-none bg-transparent p-0">
            {(['properties', 'tokens', 'annotations'] as const).map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="h-7 flex-1 rounded-none border-b-2 border-transparent text-[11px] capitalize data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                {tab === 'properties' ? 'Properties' : tab === 'tokens' ? 'Tokens' : 'Annotations'}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="properties" className="flex-1 overflow-hidden mt-0">
          <PropertyEditor plan={plan} projectId={projectId} runId={runId} phase={phase} />
        </TabsContent>

        <TabsContent value="tokens" className="flex-1 overflow-hidden mt-0">
          <TokenBrowser />
        </TabsContent>

        <TabsContent value="annotations" className="flex-1 overflow-hidden mt-0">
          <AnnotationPanel plan={plan} projectId={projectId} runId={runId} phase={phase} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
