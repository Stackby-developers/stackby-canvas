import type { Metadata } from 'next';
import { DocsLayout } from '@/components/DocsLayout';

export const metadata: Metadata = { title: 'Studio SDK' };

export default function SdkPage() {
  return (
    <DocsLayout>
      <h1>Studio SDK</h1>
      <p>The <code>@stackby/studio-sdk</code> package provides React hooks for data-bound components inside generated artifacts. All data flows through the Studio Data Gateway — never directly to Stackby.</p>

      <div className="callout">
        The SDK is automatically included in every generated artifact. You don't install it manually unless you're building a custom artifact outside Studio.
      </div>

      <h2>useRows</h2>
      <pre>{`import { useRows } from '@stackby/studio-sdk';

const { rows, loading, error } = useRows({
  stackId: 'your-stack-id',
  tableId: 'tbl_abc123',
  columns: ['Name', 'Status', 'Due Date'],
  filter: { Status: ['In Progress', 'Overdue'] },
  sort: [{ columnId: 'Due Date', direction: 'asc' }],
  viewId: 'viw_optional',   // optional: restrict to a view
});`}</pre>
      <p>Returns <code>rows</code> (array of objects keyed by column name), <code>loading</code> boolean, and <code>error</code> string or null. Rows are cached by the gateway with a 30-second TTL.</p>

      <h2>useRecord</h2>
      <pre>{`const { record, loading, error } = useRecord({
  stackId: 'your-stack-id',
  tableId: 'tbl_abc123',
  recordId: 'rec_xyz',
  columns: ['Name', 'Owner', 'Notes'],
});`}</pre>

      <h2>useCreateRow / useUpdateRow / useDeleteRow</h2>
      <pre>{`const { mutate, loading, error } = useCreateRow({ stackId, tableId });
await mutate({ Name: 'New item', Status: 'Open' });

const { mutate: update } = useUpdateRow({ stackId, tableId, recordId });
await update({ Status: 'Done' });

const { mutate: remove } = useDeleteRow({ stackId, tableId });
await remove(recordId);`}</pre>
      <p>All write operations are chunked to ≤10 records per upstream call and require an Idempotency-Key (generated automatically by the SDK).</p>

      <h2>useView</h2>
      <pre>{`const { view, loading } = useView({ stackId, tableId, viewId });
// view.columns — array of visible column definitions in view order`}</pre>

      <h2>DataInspector</h2>
      <pre>{`import { DataInspector } from '@stackby/studio-sdk';

<DataInspector stackId={stackId} tableId={tableId} recordId={recordId} />`}</pre>
      <p>Renders a read-only panel showing every field of a record. Used in the builder's data inspector panel to verify live data.</p>

      <h2>useMutation</h2>
      <p>Lower-level hook for custom write operations. Accepts an array of row objects and an operation type (<code>create</code>, <code>update</code>, <code>delete</code>).</p>

      <h2>Read-only column types</h2>
      <p>Certain Stackby column types are structurally read-only — the SDK never sends writes for these:</p>
      <pre>{`const READ_ONLY_COLUMN_TYPES = new Set([
  'formula', 'rollup', 'lookup', 'count',
  'auto_number', 'created_time', 'last_modified_time',
  'created_by', 'last_modified_by',
]);`}</pre>
    </DocsLayout>
  );
}
