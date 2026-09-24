import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExtractionProgress } from '../extractor/types.js';

// --- Playwright mock ---
const mockPageClose = vi.fn().mockResolvedValue(undefined);
const mockGoto = vi.fn().mockResolvedValue(undefined);
const mockEvalLinks = vi.fn().mockResolvedValue([]);
const mockEvaluate = vi.fn().mockResolvedValue({
  colors: [{ value: 'rgb(255, 255, 255)', role: 'background', pixelArea: 5000, tagName: 'body', property: 'backgroundColor' }],
  fonts: [{ fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400', lineHeight: '1.5', letterSpacing: '0px', pixelArea: 100, tagName: 'p', role: 'body' }],
  logos: [],
  spacingValues: [8, 16],
  radiusValues: [4],
});

const mockPageObj = () => ({
  goto: mockGoto,
  evaluate: mockEvaluate,
  $$eval: mockEvalLinks,
  close: mockPageClose,
});

const mockContextClose = vi.fn().mockResolvedValue(undefined);
const mockNewPage = vi.fn();
const mockContextObj = () => ({
  newPage: mockNewPage,
  close: mockContextClose,
});

const mockBrowserClose = vi.fn().mockResolvedValue(undefined);
const mockNewContext = vi.fn();
const mockBrowserObj = () => ({
  newContext: mockNewContext,
  close: mockBrowserClose,
});

const mockLaunch = vi.fn();

vi.mock('playwright', () => ({
  chromium: { launch: mockLaunch },
}));

describe('crawlSite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGoto.mockResolvedValue(undefined);
    mockPageClose.mockResolvedValue(undefined);
    mockContextClose.mockResolvedValue(undefined);
    mockBrowserClose.mockResolvedValue(undefined);
    mockLaunch.mockResolvedValue(mockBrowserObj());
    mockNewContext.mockResolvedValue(mockContextObj());
    mockNewPage.mockResolvedValue(mockPageObj());
    mockEvaluate.mockResolvedValue({
      colors: [{ value: 'rgb(255, 255, 255)', role: 'background', pixelArea: 5000, tagName: 'body', property: 'backgroundColor' }],
      fonts: [{ fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '400', lineHeight: '1.5', letterSpacing: '0px', pixelArea: 100, tagName: 'p', role: 'body' }],
      logos: [],
      spacingValues: [8, 16],
      radiusValues: [4],
    });
    mockEvalLinks.mockResolvedValue([]);
  });

  it('calls chromium.launch with headless + no-sandbox args', async () => {
    const { crawlSite } = await import('../extractor/page-crawler.js');
    await crawlSite('https://example.com', { maxPages: 1, pageTimeoutMs: 5000 });
    expect(mockLaunch).toHaveBeenCalledWith({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  it('respects maxPages — only navigates once when maxPages=1', async () => {
    mockEvalLinks.mockResolvedValue([
      'https://example.com/about',
      'https://example.com/pricing',
    ]);
    const { crawlSite } = await import('../extractor/page-crawler.js');
    await crawlSite('https://example.com', { maxPages: 1, pageTimeoutMs: 5000 });
    expect(mockGoto).toHaveBeenCalledTimes(1);
    expect(mockGoto).toHaveBeenCalledWith('https://example.com', expect.objectContaining({ waitUntil: 'networkidle' }));
  });

  it('calls onProgress at least once per crawled page', async () => {
    const onProgress = vi.fn();
    const { crawlSite } = await import('../extractor/page-crawler.js');
    await crawlSite('https://example.com', { maxPages: 1, pageTimeoutMs: 5000, onProgress });
    expect(onProgress).toHaveBeenCalled();
  });

  it('emits step=cancelled when AbortSignal is already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    const onProgress = vi.fn();
    const { crawlSite } = await import('../extractor/page-crawler.js');
    await crawlSite('https://example.com', { maxPages: 5, pageTimeoutMs: 5000, signal: ac.signal, onProgress });
    expect(mockGoto).not.toHaveBeenCalled();
    const steps = onProgress.mock.calls.map((c: [Omit<ExtractionProgress, 'ts'>]) => c[0].step);
    expect(steps).toContain('cancelled');
  });

  it('returns ExtractedData with correct url and extractedAt', async () => {
    const { crawlSite } = await import('../extractor/page-crawler.js');
    const result = await crawlSite('https://example.com', { maxPages: 1, pageTimeoutMs: 5000 });
    expect(result.url).toBe('https://example.com');
    expect(result.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Array.isArray(result.colors)).toBe(true);
    expect(Array.isArray(result.fonts)).toBe(true);
    expect(Array.isArray(result.logos)).toBe(true);
    expect(Array.isArray(result.spacingValues)).toBe(true);
    expect(Array.isArray(result.radiusValues)).toBe(true);
  });

  it('closes browser in finally block even when navigation throws', async () => {
    mockGoto.mockRejectedValue(new Error('Navigation timeout'));
    const { crawlSite } = await import('../extractor/page-crawler.js');
    await crawlSite('https://example.com', { maxPages: 1, pageTimeoutMs: 5000 });
    expect(mockBrowserClose).toHaveBeenCalled();
  });

  it('emits step=complete after successful crawl', async () => {
    const onProgress = vi.fn();
    const { crawlSite } = await import('../extractor/page-crawler.js');
    await crawlSite('https://example.com', { maxPages: 1, pageTimeoutMs: 5000, onProgress });
    const steps = onProgress.mock.calls.map((c: [Omit<ExtractionProgress, 'ts'>]) => c[0].step);
    expect(steps).toContain('complete');
  });

  it('filters out external links when collecting BFS queue', async () => {
    mockEvalLinks.mockResolvedValue([
      'https://other.com/page',  // different origin — should not be queued
      'https://example.com/about', // same origin — should be queued
    ]);
    const { crawlSite } = await import('../extractor/page-crawler.js');
    await crawlSite('https://example.com', { maxPages: 2, pageTimeoutMs: 5000 });
    const urls = mockGoto.mock.calls.map((c: unknown[]) => c[0]);
    expect(urls).not.toContain('https://other.com/page');
    expect(urls.some((u: unknown) => typeof u === 'string' && u.includes('/about'))).toBe(true);
  });
});
