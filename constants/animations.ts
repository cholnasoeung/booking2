/**
 * Animation configuration constants
 * Centralized timing and spring values for consistent animations across the app
 */

export const animations = {
  duration: {
    fast: 200,      // Quick interactions (button press, toggle)
    normal: 300,    // Standard transitions (screen changes, modals)
    slow: 500,      // Deliberate animations (page loads, success states)
  },

  spring: {
    // Natural, bouncy spring for UI elements
    damping: 15,     // How quickly oscillations decay (lower = bouncier)
    stiffness: 150,  // How stiff the spring is (higher = snappier)
    mass: 0.5,       // Weight of object (lower = lighter feel)
  },

  stagger: {
    delay: 50,       // Milliseconds between list item animations
  },

  shimmer: {
    duration: 1500,  // Milliseconds for one shimmer cycle
  },

  success: {
    duration: 2000,  // Milliseconds to show success overlay
  },
};

export type AnimationConfig = typeof animations;
