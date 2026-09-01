/** Result serialised from the browser context */
export interface DomScriptResult {
  colors: Array<{
    value: string;
    role: string;
    pixelArea: number;
    tagName: string;
    property: string;
  }>;
  fonts: Array<{
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
    letterSpacing: string;
    pixelArea: number;
    tagName: string;
    role: string;
  }>;
  logos: Array<{
    src: string;
    type: 'img' | 'svg';
    width: number;
    height: number;
    location: string;
    inHeaderOrFooter: boolean;
    filenameScore: number;
  }>;
  spacingValues: number[];
  radiusValues: number[];
}

/**
 * Source of the script injected into the page via page.evaluate().
 *
 * INVARIANT: reads ONLY window.getComputedStyle(). Never touches:
 * - document.styleSheets
 * - CSS custom properties (getPropertyValue('--*'))
 * - innerHTML of <style> elements
 *
 * This guarantees declared-but-unused CSS variables never enter the palette.
 */
export const DOM_EXTRACTION_SCRIPT = /* javascript */ `
(function extractRenderedStyles() {
  const MIN_AREA = 4;
  const TRANSPARENT = 'rgba(0, 0, 0, 0)';

  const colors = [];
  const fonts = [];
  const logoMap = new Map();
  const spacingSet = new Set();
  const radiusSet = new Set();

  function isVisible(el, styles) {
    const rect = el.getBoundingClientRect();
    return (
      rect.width >= 1 && rect.height >= 1 &&
      styles.display !== 'none' &&
      styles.visibility !== 'hidden' &&
      styles.opacity !== '0'
    );
  }

  function classifyRole(el, property) {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role') || '';
    if (property === 'backgroundColor') {
      if (tag === 'body' || tag === 'html') return 'background';
      if (tag === 'button' || role === 'button') return 'buttonBg';
      if (tag === 'header' || tag === 'nav' || tag === 'footer') return 'surface';
      return 'surface';
    }
    if (property === 'color') {
      if (tag === 'button' || role === 'button') return 'buttonText';
      if (tag === 'a') return 'link';
      if (/^h[1-6]$/.test(tag)) return 'headingText';
      return 'bodyText';
    }
    return 'border';
  }

  function classifyFontRole(el) {
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'code' || tag === 'pre' || tag === 'kbd') return 'mono';
    if (tag === 'button' || tag === 'input' || tag === 'label') return 'ui';
    return 'body';
  }

  function scoreLogo(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return 0;
    const inBanner = !!el.closest('header, [role="banner"], nav, footer');
    const src = el.getAttribute('src') || el.getAttribute('href') || '';
    const alt = (el.getAttribute('alt') || '').toLowerCase();
    const filenameScore = /logo|brand|mark|icon/.test(src + alt) ? 0.4 : 0;
    const positionScore = rect.top < 200 ? 0.4 : 0.1;
    const sizeScore = Math.min(rect.width * rect.height, 10000) / 10000 * 0.2;
    return inBanner ? (filenameScore + positionScore + sizeScore) : 0;
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null);
  let node;

  while ((node = walker.nextNode())) {
    const el = node;
    const rect = el.getBoundingClientRect();
    const pixelArea = rect.width * rect.height;
    if (pixelArea < MIN_AREA) continue;

    const styles = window.getComputedStyle(el);
    if (!isVisible(el, styles)) continue;

    const colorProps = [
      ['color', styles.color],
      ['backgroundColor', styles.backgroundColor],
      ['borderColor', styles.borderTopColor],
    ];
    for (const [property, value] of colorProps) {
      if (!value || value === TRANSPARENT || value === 'transparent') continue;
      colors.push({
        value,
        role: classifyRole(el, property),
        pixelArea,
        tagName: el.tagName.toLowerCase(),
        property,
      });
    }

    const textContent = el.textContent && el.textContent.trim();
    if (textContent && textContent.length > 0 && el.children.length === 0) {
      fonts.push({
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        lineHeight: styles.lineHeight,
        letterSpacing: styles.letterSpacing,
        pixelArea,
        tagName: el.tagName.toLowerCase(),
        role: classifyFontRole(el),
      });
    }

    if (el.tagName === 'IMG' || el.tagName === 'SVG') {
      const score = scoreLogo(el);
      if (score > 0.2) {
        const src = el.getAttribute('src') || 'inline-svg';
        logoMap.set(src, {
          src,
          type: el.tagName.toLowerCase(),
          width: rect.width,
          height: rect.height,
          location: el.closest('footer') ? 'footer' : 'header',
          inHeaderOrFooter: !!el.closest('header, footer, nav'),
          filenameScore: score,
        });
      }
    }

    const padding = parseFloat(styles.paddingTop);
    const gap = parseFloat(styles.gap);
    const radius = parseFloat(styles.borderTopLeftRadius);
    if (padding > 0 && padding < 200) spacingSet.add(Math.round(padding));
    if (gap > 0 && gap < 200) spacingSet.add(Math.round(gap));
    if (radius > 0 && radius < 100) radiusSet.add(Math.round(radius));
  }

  return {
    colors,
    fonts,
    logos: [...logoMap.values()],
    spacingValues: [...spacingSet].sort((a, b) => a - b),
    radiusValues: [...radiusSet].sort((a, b) => a - b),
  };
})()
`;
