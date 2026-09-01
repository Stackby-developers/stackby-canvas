export function buildSpacingScale(values: number[]): Record<string, string> {
  const unique = [...new Set(values)].sort((a, b) => a - b);
  const NAMES = ['1', '2', '3', '4', '5', '6', '8', '10', '12', '16'];
  const scale: Record<string, string> = {};
  unique.slice(0, NAMES.length).forEach((v, i) => {
    scale[NAMES[i]!] = `${v}px`;
  });
  return scale;
}

export function buildRadiusScale(values: number[]): Record<string, string> {
  const unique = [...new Set(values)].sort((a, b) => a - b);
  const keys = ['sm', 'md', 'lg', 'xl', 'full'];
  const scale: Record<string, string> = { none: '0px', DEFAULT: '4px' };
  unique.slice(0, keys.length).forEach((v, i) => {
    scale[keys[i]!] = v >= 9999 ? '9999px' : `${v}px`;
  });
  return scale;
}
