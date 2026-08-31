/** Minimal data-inspector provenance registry for the DataInspector overlay. */

export interface ProvenanceEntry {
  id: string;
  stackId: string;
  tableId: string;
  rowId: string;
  columnId?: string;
}

const registry = new Map<string, ProvenanceEntry>();

export function mountProvenance(entry: ProvenanceEntry): void {
  registry.set(entry.id, entry);
}

export function unmountProvenance(id: string): void {
  registry.delete(id);
}

export function getProvenanceEntries(): ProvenanceEntry[] {
  return [...registry.values()];
}
