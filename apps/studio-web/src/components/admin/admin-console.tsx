'use client';

import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@stackby/ui';
import { CreditsTab } from './credits-tab';
import { ArtifactsTab } from './artifacts-tab';
import { PolicyTab } from './policy-tab';
import { AuditTab } from './audit-tab';

export function AdminConsole() {
  return (
    <div className="h-full overflow-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Admin Console</h1>
          <p className="mt-1 text-sm text-text-muted">Workspace governance and usage monitoring</p>
        </div>
        <Badge variant="warning">dev-workspace</Badge>
      </div>

      <Tabs defaultValue="credits">
        <TabsList>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="policy">Policy</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="credits" className="mt-6">
          <CreditsTab />
        </TabsContent>
        <TabsContent value="artifacts" className="mt-6">
          <ArtifactsTab />
        </TabsContent>
        <TabsContent value="policy" className="mt-6">
          <PolicyTab />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <AuditTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
