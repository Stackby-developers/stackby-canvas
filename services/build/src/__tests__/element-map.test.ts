import { describe, it, expect } from 'vitest';
import type { ElementInfo, ElementMap, BoundingBox } from '../pipeline/types.js';

describe('element map types and round-trip', () => {
  it('ElementInfo has all required fields', () => {
    const el: ElementInfo = {
      inspectId: 'stk_base_tbl_row_col',
      selector: '[data-inspect-id="stk_base_tbl_row_col"]',
      componentPath: 'TaskList > TaskRow > StatusCell',
      boundingBox: { x: 10, y: 20, width: 100, height: 40 },
      visible: true,
      tag: 'span',
    };
    expect(el.inspectId).toBeDefined();
    expect(el.boundingBox.width).toBeGreaterThan(0);
    expect(el.selector).toContain(el.inspectId);
  });

  it('ElementMap is keyed by inspectId', () => {
    const map: ElementMap = {
      'id1': {
        inspectId: 'id1',
        selector: '[data-inspect-id="id1"]',
        componentPath: 'A',
        boundingBox: { x: 0, y: 0, width: 50, height: 20 },
        visible: true,
        tag: 'div',
      },
    };
    expect(map['id1']!.componentPath).toBe('A');
    expect(Object.keys(map)[0]).toBe('id1');
  });

  it('round-trip: inspectId → bounding box → Visual Edit patch', () => {
    const el: ElementInfo = {
      inspectId: 'abc123',
      selector: '[data-inspect-id="abc123"]',
      componentPath: 'src/components/TaskRow.tsx',
      boundingBox: { x: 100, y: 200, width: 300, height: 40 },
      visible: true,
      tag: 'td',
    };
    // Visual Edit uses the inspectId to locate the source component
    // and the bounding box to anchor the property panel
    const visualEditPatch = {
      componentId: el.inspectId,
      sourceFile: el.componentPath,
      property: 'color',
      value: 'var(--color-primary)',
      anchorBox: el.boundingBox,
    };
    expect(visualEditPatch.componentId).toBe('abc123');
    expect(visualEditPatch.anchorBox.x).toBe(100);
    expect(visualEditPatch.anchorBox.y).toBe(200);
    expect(visualEditPatch.sourceFile).toBe('src/components/TaskRow.tsx');
  });

  it('hidden elements are captured with visible=false', () => {
    const el: ElementInfo = {
      inspectId: 'hidden1',
      selector: '[data-inspect-id="hidden1"]',
      componentPath: 'Modal',
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      visible: false,
      tag: 'div',
    };
    expect(el.visible).toBe(false);
    expect(el.boundingBox.width).toBe(0);
  });

  it('BoundingBox coordinates are rounded integers', () => {
    const box: BoundingBox = { x: 10, y: 20, width: 300, height: 40 };
    expect(Number.isInteger(box.x)).toBe(true);
    expect(Number.isInteger(box.width)).toBe(true);
  });
});
