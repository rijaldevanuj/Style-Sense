/**
 * Design system tokens for the Robe editorial / high-fashion brand.
 *
 * These values mirror the custom tokens defined in tailwind.config.js
 * and are exported here for imperative usage (StyleSheet.create, SVG
 * props, status-bar colors, etc.) — anywhere outside of className.
 */

export const BrandColors = {
  primary: "#000000",
  secondary: "#1A1A1A",
  tertiary: "#4D4D4D",
  neutralBg: "#F0F0F0",
  accentDestructive: "#A31D1D",
} as const;

export const BrandFonts = {
  serif: "Noto Serif",
  sans: "Inter",
} as const;

export type BrandColorKey = keyof typeof BrandColors;
export type BrandFontKey = keyof typeof BrandFonts;
