// The Unicelerate logo mark: a graduation cap lifted by an upward swoosh.
// Original, made for this project (see docs/CREDITS.md). Drawn on a 24×24
// grid. This file is the single source for the mark: the React component
// (components/brand/logo.tsx) and the icon generator
// (scripts/brand/build-icons.mjs) both read it.

export const MARK_VIEWBOX = "0 0 24 24";

// The cap: one filled shape.
export const MARK_FILL_PATHS = ["M12 3.5 21.5 8 12 12.5 2.5 8Z"];

// The tassel, the swoosh and its arrowhead: round-ended strokes.
export const MARK_STROKE_PATHS: { d: string; width: number }[] = [
  { d: "M18 10v3.5", width: 2 },
  { d: "M3.5 18.5c5 3 10.5 2 15-3", width: 3 },
  { d: "M14.5 15h4.3v4.3", width: 3 },
];

// The whole mark as an SVG string in one colour (for icons and images).
export function markSvg(color: string, { size = 24, background, padding = 0 }: { size?: number; background?: string; padding?: number } = {}): string {
  const inner = 24;
  const box = inner + padding * 2;
  const bg = background ? `<rect width="${box}" height="${box}" rx="${box * 0.22}" fill="${background}"/>` : "";
  const fills = MARK_FILL_PATHS.map((d) => `<path d="${d}" fill="${color}"/>`).join("");
  const strokes = MARK_STROKE_PATHS.map(
    (p) => `<path d="${p.d}" fill="none" stroke="${color}" stroke-width="${p.width}" stroke-linecap="round" stroke-linejoin="round"/>`
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}" width="${size}" height="${size}">${bg}<g transform="translate(${padding} ${padding})">${fills}${strokes}</g></svg>`;
}
