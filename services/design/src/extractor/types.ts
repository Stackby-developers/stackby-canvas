/** An RGBA color sampled from a rendered element's computed style */
export interface ColorSample {
  r: number; g: number; b: number; a: number;
  role: ColorRole;
  /** Pixel area of the element that contributed this sample */
  pixelArea: number;
  frequency: number;
}

export type ColorRole =
  | 'background'
  | 'surface'
  | 'bodyText'
  | 'headingText'
  | 'link'
  | 'buttonBg'
  | 'buttonText'
  | 'border'
  | 'accent';

export interface FontSample {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  weightedArea: number;
  role: 'heading' | 'body' | 'mono' | 'ui';
}

export interface LogoCandidate {
  src: string;
  type: 'img' | 'svg';
  score: number;
  location: 'header' | 'footer' | 'nav';
  width: number;
  height: number;
}

export interface ExtractedData {
  url: string;
  colors: ColorSample[];
  fonts: FontSample[];
  logos: LogoCandidate[];
  spacingValues: number[];
  radiusValues: number[];
  extractedAt: string;
}

export interface ExtractionProgress {
  jobId: string;
  designSystemId: string;
  step: ExtractionStep;
  pagesVisited: number;
  pagesTotal: number;
  message: string;
  ts: number;
}

export type ExtractionStep =
  | 'starting'
  | 'crawling'
  | 'analyzing_colors'
  | 'analyzing_fonts'
  | 'detecting_logos'
  | 'building_tokens'
  | 'generating_output'
  | 'complete'
  | 'cancelled'
  | 'failed';
