export function hexToRgb(hex) {
  const cleanHex = hex.replace("#", "");
  const bigint = parseInt(cleanHex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export function rgbToHex(r, g, b) {
  const toHex = (val) => {
    const hex = Math.max(0, Math.min(255, Math.round(val))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function adjustColor(hex, percent) {
  const { r, g, b } = hexToRgb(hex);

  const amount = Math.round(2.55 * percent);

  const newR = r + amount;
  const newG = g + amount;
  const newB = b + amount;

  return rgbToHex(newR, newG, newB);
}

export function generateColorVariants(baseColor) {
  return {
    light: adjustColor(baseColor, 35),
    base: baseColor,
    dark: adjustColor(baseColor, -25),
  };
}

export function getColorForTheme(baseColor, theme) {
  const variants = generateColorVariants(baseColor);
  return theme === "dark" ? variants.dark : variants.light;
}
