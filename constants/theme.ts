import { Platform } from "react-native";

const tintColorLight = "#5b4df7";
const tintColorDark = "#dbeafe";

const lightPalette = {
  text: "#0f172a",
  background: "#f4f5fb",
  surface: "#ffffff",
  border: "#e6e8ff",
  muted: "#64748b",
  icon: "#4338ca",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  accent: "#f97316",
  highlight: "#eef2ff",
};

const darkPalette = {
  text: "#f8fafc",
  background: "#0f172a",
  surface: "#111827",
  border: "#1f1b33",
  muted: "#94a3b8",
  icon: "#a5b4fc",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
  accent: "#f472b6",
  highlight: "#1e1b47",
};

export const Colors = {
  light: {
    ...lightPalette,
    tint: tintColorLight,
    tabIconDefault: "#9aa1d5",
    tabIconSelected: tintColorLight,
  },
  dark: {
    ...darkPalette,
    tint: tintColorDark,
    tabIconDefault: "#c7d2fe",
    tabIconSelected: tintColorDark,
  },
};

export const gradients = {
  hero: ["#4c1d95", "#7c3aed"] as const,
  accent: ["#f97316", "#ef4444"] as const,
  soft: ["#eef2ff", "#f5f3ff"] as const,
  info: ["#dcfce7", "#bbf7d0"] as const,
};

export const glass = {
  light: {
    background: "rgba(255, 255, 255, 0.9)" as const,
    border: "rgba(255, 255, 255, 0.5)" as const,
  },
  dark: {
    background: "rgba(17, 24, 39, 0.6)" as const,
    border: "rgba(255, 255, 255, 0.12)" as const,
  },
};

export const shadowColors = {
  primary: "#7c3aed",
  success: "#34d399",
  card: "#312e81",
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
