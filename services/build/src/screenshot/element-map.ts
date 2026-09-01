import { chromium } from 'playwright';
import type { ElementMap, ElementInfo } from '../pipeline/types.js';

const INSPECT_ATTR = 'data-inspect-id';

interface RawElement {
  inspectId: string;
  selector: string;
  componentPath: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  visible: boolean;
  tag: string;
}

/**
 * Extract all elements with `data-inspect-id` attributes from the live page,
 * capturing their bounding boxes. This powers the Visual Edit click-to-select
 * and Annotate anchoring features.
 */
export async function buildElementMap(url: string, timeoutMs: number): Promise<ElementMap> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto(url, { timeout: timeoutMs, waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    // page.evaluate runs in the browser context where DOM globals are available.
    // The function is serialised as a string so TypeScript does not check browser APIs.
    const elements: RawElement[] = await page.evaluate(`
      (function extractElements(attr) {
        const results = [];
        const nodes = document.querySelectorAll('[' + attr + ']');
        nodes.forEach(function(el) {
          const inspectId = el.getAttribute(attr) || '';
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0;
          let selector = el.tagName.toLowerCase();
          if (el.id) {
            selector += '#' + el.id;
          } else if (el.className && typeof el.className === 'string') {
            const first = el.className.split(' ')[0];
            if (first) selector += '.' + first;
          }
          const dataComp = el.getAttribute('data-component');
          const parentComp = el.closest('[data-component]');
          const componentPath = dataComp ||
            (parentComp ? parentComp.getAttribute('data-component') : null) ||
            selector;
          results.push({
            inspectId,
            selector: '[' + attr + '="' + inspectId + '"]',
            componentPath,
            boundingBox: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            visible,
            tag: el.tagName.toLowerCase()
          });
        });
        return results;
      })('${INSPECT_ATTR}')
    `) as RawElement[];

    const map: ElementMap = {};
    for (const el of elements) {
      map[el.inspectId] = el as ElementInfo;
    }
    return map;
  } finally {
    await browser.close();
  }
}
