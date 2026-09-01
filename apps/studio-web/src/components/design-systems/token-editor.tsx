'use client';

import { useState } from 'react';
import { ChevronRight, Link2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Button, Spinner } from '@stackby/ui';
import { ColorEditor } from './color-editor';
import { TypographyEditor } from './typography-editor';
import { SimpleTokenEditor } from './simple-token-editor';
import { ExtractDialog } from './extract-dialog';
import type { DesignSystemRecord, DesignTokens } from '@/src/lib/design-system-types';

interface TokenEditorProps {
  ds: DesignSystemRecord;
  onSave: (tokens: DesignTokens) => Promise<void>;
}

function defaultTokens(ds: DesignSystemRecord): DesignTokens {
  return {
    id: ds.id,
    workspaceId: ds.workspaceId,
    name: ds.name,
    colors: {},
    typography: {},
    spacing: {},
    radii: {},
    shadows: {},
    version: ds.version,
    updatedAt: new Date().toISOString(),
  };
}

export function TokenEditor({ ds, onSave }: TokenEditorProps) {
  const [tokens, setTokens] = useState<DesignTokens>(ds.tokens ?? defaultTokens(ds));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [extractOpen, setExtractOpen] = useState(false);

  function update(patch: Partial<DesignTokens>) {
    setTokens((prev) => {
      const next = { ...prev, updatedAt: new Date().toISOString() };
      for (const key of Object.keys(patch) as Array<keyof DesignTokens>) {
        const val = patch[key];
        if (val === undefined) {
          delete next[key];
        } else {
          // Safe assignment — values are compatible per key
          (next as Record<string, unknown>)[key] = val;
        }
      }
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    await onSave(tokens);
    setSaving(false);
    setDirty(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-text">{ds.name}</h1>
          <div className="flex items-center gap-1 text-xs text-text-faint">
            <span>Workspace defaults</span>
            <ChevronRight className="h-3 w-3" />
            <span>Project overrides</span>
            <ChevronRight className="h-3 w-3" />
            <span>Component defaults</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExtractOpen(true)}
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            Extract from URL
          </Button>
          <Button
            size="sm"
            disabled={!dirty || saving}
            onClick={() => void handleSave()}
          >
            {saving ? <Spinner size="sm" className="mr-1.5" /> : null}
            {dirty ? 'Save ●' : 'Saved'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="colors">
        <TabsList>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="spacing">Spacing</TabsTrigger>
          <TabsTrigger value="radii">Radii</TabsTrigger>
          <TabsTrigger value="shadows">Shadows</TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="pt-4">
          <ColorEditor
            colors={tokens.colors ?? {}}
            onChange={(colors) => update({ colors })}
          />
        </TabsContent>

        <TabsContent value="typography" className="pt-4">
          <TypographyEditor
            typography={tokens.typography}
            onChange={(typography) => {
              setTokens((prev) => {
                const next = { ...prev, updatedAt: new Date().toISOString() };
                if (typography !== undefined) next.typography = typography;
                else delete next.typography;
                return next;
              });
              setDirty(true);
            }}
          />
        </TabsContent>

        <TabsContent value="spacing" className="pt-4">
          <SimpleTokenEditor
            label="spacing"
            tokens={tokens.spacing ?? {}}
            onChange={(spacing) => update({ spacing })}
            placeholder="0.5rem"
          />
        </TabsContent>

        <TabsContent value="radii" className="pt-4">
          <SimpleTokenEditor
            label="radius"
            tokens={tokens.radii ?? {}}
            onChange={(radii) => update({ radii })}
            placeholder="0.375rem"
          />
        </TabsContent>

        <TabsContent value="shadows" className="pt-4">
          <SimpleTokenEditor
            label="shadow"
            tokens={tokens.shadows ?? {}}
            onChange={(shadows) => update({ shadows })}
            placeholder="0 1px 3px rgba(0,0,0,0.1)"
          />
        </TabsContent>
      </Tabs>

      <ExtractDialog
        designSystemId={ds.id}
        open={extractOpen}
        onOpenChange={setExtractOpen}
        onComplete={() => setExtractOpen(false)}
      />
    </div>
  );
}
