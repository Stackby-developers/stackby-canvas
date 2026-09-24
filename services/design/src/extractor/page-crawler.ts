import { chromium } from 'playwright';
import type { ExtractedData, ExtractionProgress, FontSample, LogoCandidate } from './types.js';
import { DOM_EXTRACTION_SCRIPT } from './dom-script.js';
import type { DomScriptResult } from './dom-script.js';
import { parseSamples } from './color-cluster.js';

export interface CrawlOptions {
  maxPages: number;
  pageTimeoutMs: number;
  signal?: AbortSignal;
  onProgress?: (progress: Omit<ExtractionProgress, 'ts'>) => void;
  /** Forwarded into progress events. */
  jobId?: string;
  /** Forwarded into progress events. */
  designSystemId?: string;
}

export async function crawlSite(url: string, opts: CrawlOptions): Promise<ExtractedData> {
  const jobId = opts.jobId ?? '';
  const designSystemId = opts.designSystemId ?? '';

  const emit = (
    step: ExtractionProgress['step'],
    pagesVisited: number,
    pagesTotal: number,
    message: string,
  ) => opts.onProgress?.({ jobId, designSystemId, step, pagesVisited, pagesTotal, message });

  let baseOrigin: string;
  try {
    baseOrigin = new URL(url).origin;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  const allRawColors: DomScriptResult['colors'] = [];
  const allRawFonts: DomScriptResult['fonts'] = [];
  const logoMap = new Map<string, LogoCandidate>();
  const spacingSet = new Set<number>();
  const radiusSet = new Set<number>();

  const visited = new Set<string>();
  const queue: string[] = [url];

  try {
    emit('starting', 0, opts.maxPages, `Starting extraction of ${url}`);

    const context = await browser.newContext({ ignoreHTTPSErrors: true, javaScriptEnabled: true });

    try {
      const page = await context.newPage();

      try {
        while (queue.length > 0 && visited.size < opts.maxPages) {
          if (opts.signal?.aborted) {
            emit('cancelled', visited.size, opts.maxPages, 'Extraction cancelled');
            break;
          }

          const pageUrl = queue.shift()!;
          if (visited.has(pageUrl)) continue;
          visited.add(pageUrl);

          const totalEstimate = Math.min(visited.size + queue.length, opts.maxPages);
          emit('crawling', visited.size, totalEstimate, `Crawling ${pageUrl}`);

          try {
            await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: opts.pageTimeoutMs });
          } catch {
            continue;
          }

          let result: DomScriptResult | null = null;
          try {
            result = await page.evaluate(DOM_EXTRACTION_SCRIPT) as DomScriptResult;
          } catch {
            continue;
          }

          if (result) {
            allRawColors.push(...result.colors);
            allRawFonts.push(...result.fonts);
            for (const v of result.spacingValues) spacingSet.add(v);
            for (const v of result.radiusValues) radiusSet.add(v);

            for (const logo of result.logos) {
              if (!logoMap.has(logo.src)) {
                const loc = logo.location === 'footer' ? 'footer' : logo.location === 'nav' ? 'nav' : 'header';
                logoMap.set(logo.src, {
                  src: logo.src,
                  type: logo.type,
                  score: logo.filenameScore,
                  location: loc,
                  width: logo.width,
                  height: logo.height,
                });
              }
            }
          }

          // BFS: collect same-origin links
          if (visited.size < opts.maxPages) {
            try {
              const hrefs = await page.$$eval('a[href]', (els) =>
                els.map((a) => (a as HTMLAnchorElement).href),
              );
              for (const href of hrefs) {
                try {
                  const parsed = new URL(href);
                  if (parsed.protocol === 'mailto:' || parsed.protocol === 'tel:') continue;
                  if (parsed.origin !== baseOrigin) continue;
                  parsed.hash = '';
                  const normalized = parsed.href;
                  if (!visited.has(normalized) && !queue.includes(normalized)) {
                    queue.push(normalized);
                  }
                } catch {
                  // invalid URL — skip
                }
              }
            } catch {
              // $$eval failed — skip link collection for this page
            }
          }

          emit('crawling', visited.size, Math.min(visited.size + queue.length, opts.maxPages), `Processed ${pageUrl}`);
        }
      } finally {
        await page.close();
      }
    } finally {
      await context.close();
    }

    emit('analyzing_colors', visited.size, visited.size, 'Analysing colors');
    const colorSamples = parseSamples(allRawColors);

    emit('analyzing_fonts', visited.size, visited.size, 'Analysing fonts');
    const fontSamples: FontSample[] = allRawFonts.map((f) => ({
      fontFamily: f.fontFamily.split(',')[0]?.replace(/['"]/g, '').trim() ?? f.fontFamily,
      fontSize: parseFloat(f.fontSize) || 16,
      fontWeight: f.fontWeight,
      lineHeight: f.lineHeight,
      letterSpacing: f.letterSpacing,
      weightedArea: f.pixelArea,
      role: f.role as FontSample['role'],
    }));

    emit('complete', visited.size, visited.size, 'Extraction complete');

    return {
      url,
      colors: colorSamples,
      fonts: fontSamples,
      logos: [...logoMap.values()].sort((a, b) => b.score - a.score),
      spacingValues: [...spacingSet].sort((a, b) => a - b),
      radiusValues: [...radiusSet].sort((a, b) => a - b),
      extractedAt: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}
