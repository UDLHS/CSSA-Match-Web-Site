/** Pure WCAG color math — shared by the Zod team-color check and the UI. */

export function relativeLuminance(hex: string): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two #rrggbb colors (1–21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

export const isValidHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s);

/** Team colors sit behind white text → must clear 4.5:1 (design-spec). */
export const passesTeamContrast = (hex: string) =>
  isValidHex(hex) && contrastRatio(hex, "#ffffff") >= 4.5;
