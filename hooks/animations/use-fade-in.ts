import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { animations } from '@/constants/animations';

interface UseFadeInOptions {
  duration?: number;
  delay?: number;
  fromValue?: number;
}

/**
 * Fade-in animation hook
 * Provides animated value and helper for fade-in effects
 *
 * @param options - Animation configuration
 * @returns Animated.Value for opacity and start function
 */
export function useFadeIn(options: UseFadeInOptions = {}) {
  const {
    duration = animations.duration.normal,
    delay = 0,
    fromValue = 0,
  } = options;

  const opacity = useRef(new Animated.Value(fromValue)).current;

  const start = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [opacity, duration, delay]);

  useEffect(() => {
    start();
  }, [start]);

  return { opacity, start };
}
