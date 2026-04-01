/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * Gradient color combinations for modern visual effects
 * Each gradient is an array of two hex colors
 */
export const gradients = {
  primary: ['#4f46e5', '#7c3aed'] as const,      // Indigo to violet
  success: ['#10b981', '#059669'] as const,       // Emerald green
  background: ['#f8f7ff', '#eef2ff'] as const,    // Subtle purple tint
  danger: ['#ef4444', '#dc2626'] as const,        // Red gradients
  warning: ['#f59e0b', '#d97706'] as const,      // Orange gradients
};

/**
 * Glass morphism effect configurations
 * Semi-transparent backgrounds with backdrop blur
 */
export const glass = {
  light: {
    background: 'rgba(255, 255, 255, 0.7)' as const,
    border: 'rgba(255, 255, 255, 0.5)' as const,
  },
  dark: {
    background: 'rgba(0, 0, 0, 0.5)' as const,
    border: 'rgba(255, 255, 255, 0.1)' as const,
  },
};

/**
 * Shadow colors for soft, colored shadows
 * Replaces harsh black shadows with colored tints
 */
export const shadowColors = {
  primary: '#4f46e5',
  success: '#10b981',
  card: '#312e81',
};
