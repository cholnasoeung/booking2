import React, { useCallback } from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { animations } from "@/constants/animations";

export interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scale?: number;
  opacity?: number;
}

export const AnimatedPressable = React.forwardRef<
  React.Component,
  AnimatedPressableProps
>(
  (
    {
      children,
      style,
      onPress,
      scale = 0.96,
      opacity = 0.8,
      ...props
    },
    _ref
  ) => {
    const scaleValue = useSharedValue(1);
    const opacityValue = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scaleValue.value }],
      opacity: opacityValue.value,
    }));

    const handlePressIn = useCallback(() => {
      scaleValue.value = withSpring(scale, {
        damping: animations.spring.damping,
        mass: animations.spring.mass,
        stiffness: animations.spring.stiffness,
      });
      opacityValue.value = withSpring(opacity, {
        damping: animations.spring.damping,
        mass: animations.spring.mass,
        stiffness: animations.spring.stiffness,
      });
    }, [scale, opacity]);

    const handlePressOut = useCallback(() => {
      scaleValue.value = withSpring(1, {
        damping: animations.spring.damping,
        mass: animations.spring.mass,
        stiffness: animations.spring.stiffness,
      });
      opacityValue.value = withSpring(1, {
        damping: animations.spring.damping,
        mass: animations.spring.mass,
        stiffness: animations.spring.stiffness,
      });
    }, []);

    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...props}
      >
        <Animated.View style={[style, animatedStyle]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }
);

AnimatedPressable.displayName = "AnimatedPressable";
