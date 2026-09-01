/**
 * Page crawler stub — documents the full Playwright extraction flow.
 *
 * PRODUCTION WIRING REQUIRED:
 * 1. Install Playwright Chromium: `npx playwright install chromium`
 * 2. Launch a persistent browser context with a fresh profile per job
 * 3. Navigate to homepage, wait for networkidle
 * 4. Inject DOM_EXTRACTION_SCRIPT via page.evaluate()
 * 5. Collect up to MAX_CRAWL_PAGES-1 internal links and repeat
 * 6. Emit ExtractionProgress events to Redis Stream after each page
 * 7. Check AbortSignal before each page — cancellation releases the browser
 * 8. On cancellation: browser.close(), emit 'cancelled' progress event
 *
 * The cancellable pattern:
 *   const ac = new AbortController();
 *   cancelMap.set(jobId, ac);
 *   await crawlSite(url, { signal: ac.signal, onProgress });
 *   cancelMap.delete(jobId);
 */

import type { ExtractedData, ExtractionProgress } from './types.js';

export interface CrawlOptions {
  maxPages: number;
  pageTimeoutMs: number;
  signal?: AbortSignal;
  onProgress?: (progress: Omit<ExtractionProgress, 'ts'>) => void;
}

export async function crawlSite(
  _url: string,
  _opts: CrawlOptions,
): Promise<ExtractedData> {
  throw new Error(
    'crawlSite is not implemented. See src/extractor/page-crawler.ts for production wiring instructions. ' +
    'Run `npx playwright install chromium` and implement the browser launch logic.',
  );
}
