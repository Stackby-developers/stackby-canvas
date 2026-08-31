import type { FilterCondition } from './types.js';

/** Serialise a filter condition to a plain JSON-safe object for the gateway. */
export function serializeFilter(filter: FilterCondition): unknown {
  return filter; // Already JSON-safe; gateway deserializes it
}
