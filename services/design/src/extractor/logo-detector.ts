import type { LogoCandidate } from './types.js';

export interface RawLogo {
  src: string;
  type: 'img' | 'svg';
  width: number;
  height: number;
  location: string;
  inHeaderOrFooter: boolean;
  filenameScore: number;
}

export function rankLogos(raw: RawLogo[]): LogoCandidate[] {
  return raw
    .filter((l) => l.inHeaderOrFooter && l.width >= 20 && l.height >= 20)
    .map((l) => ({
      src: l.src,
      type: l.type,
      score: l.filenameScore,
      location: (l.location === 'footer' ? 'footer' : 'header') as LogoCandidate['location'],
      width: l.width,
      height: l.height,
    }))
    .sort((a, b) => b.score - a.score);
}
