// mobile/bookingapp/hooks/animations/use-slide-up.ts

import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { animations } from '@/constants/animations';

interface UseSlideUpOptions {
  duration?: number;
  delay?: number;
  distance?: number;
  initialValue?: number;
}

/**
 * Slide-up animation hook for list items and cards
 * Elements slide up from bottom while fading in
 *
 * @param options - Animation configuration
 * @returns Animated values for translateY and opacity
 */
export function useSlideUp(options: UseSlideUpOptions = {}) {
  const {
    duration = animations.duration.normal,
    delay = 0,
    distance = 20,
    initialValue = 1,
  } = options;

  const translateY = useRef(new Animated.Value(distance)).current;
  const opacity = useRef(new Animated.Value(initialValue)).current;

  const start = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity, duration, delay]);

  useEffect(() => {
    start();
  }, [start]);

  return { translateY, opacity, start };
}

/**
 * Hook for staggered list animations
 * Each item animates with increasing delay
 */
export function useStaggeredSlideUp(
  index: number,
  options: Omit<UseSlideUpOptions, 'delay'> = {}
) {
  const staggerDelay = index * animations.stagger.delay;
  return useSlideUp({ ...options, delay: staggerDelay });
}
