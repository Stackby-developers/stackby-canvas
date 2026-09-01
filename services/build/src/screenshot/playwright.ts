import { chromium } from 'playwright';
import type { Screenshot } from '../pipeline/types.js';

const BREAKPOINTS = [375, 768, 1440] as const;

export async function captureScreenshots(
  url: string,
  _buildId: string,
  timeoutMs: number,
): Promise<Screenshot[]> {
  const browser = await chromium.launch({ headless: true });
  const screenshots: Screenshot[] = [];

  try {
    for (const width of BREAKPOINTS) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        userAgent: 'Stackby-Studio-Build/1.0',
      });
      const page = await context.newPage();
      await page.goto(url, { timeout: timeoutMs, waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const buffer = await page.screenshot({ fullPage: true, type: 'png' });
      const size = page.viewportSize();

      screenshots.push({
        breakpoint: width,
        dataUrl: buffer.toString('base64'),
        width: size?.width ?? width,
        height: size?.height ?? 900,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  return screenshots;
}

export interface ConsoleCapture {
  errors: string[];
  warnings: string[];
  failedRequests: string[];
}

export async function captureConsole(url: string, timeoutMs: number): Promise<ConsoleCapture> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors: string[] = [];
  const warnings: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
  });
  page.on('requestfailed', (req) => failedRequests.push(req.url()));

  try {
    await page.goto(url, { timeout: timeoutMs, waitUntil: 'networkidle' });
  } finally {
    await browser.close();
  }

  return { errors, warnings, failedRequests };
}
