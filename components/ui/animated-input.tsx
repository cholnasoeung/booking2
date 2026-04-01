import React, { useCallback, useState } from "react";
import {
  StyleProp,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { animations } from "@/constants/animations";

export interface AnimatedInputProps extends TextInputProps {
  containerStyle?: StyleProp<ViewStyle>;
  focusedBorderColor?: string;
  defaultBorderColor?: string;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export const AnimatedInput = React.forwardRef<
  TextInput,
  AnimatedInputProps
>(
  (
    {
      containerStyle,
      focusedBorderColor = "#4f46e5",
      defaultBorderColor = "#dbe2f0",
      onFocus,
      onBlur,
      style,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const focusAnimValue = useSharedValue(0);

    const handleFocus = useCallback(
      (e: any) => {
        setIsFocused(true);
        focusAnimValue.value = withTiming(1, {
          duration: animations.duration.fast,
        });
        onFocus?.(e);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (e: any) => {
        setIsFocused(false);
        focusAnimValue.value = withTiming(0, {
          duration: animations.duration.fast,
        });
        onBlur?.(e);
      },
      [onBlur]
    );

    const animatedBorderStyle = useAnimatedStyle(() => ({
      borderColor: interpolateColor(
        focusAnimValue.value,
        [0, 1],
        [defaultBorderColor, focusedBorderColor]
      ),
    }));

    return (
      <View style={containerStyle}>
        <AnimatedTextInput
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            {
              borderWidth: 1,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: "#0f172a",
              backgroundColor: "#f8fafc",
            },
            animatedBorderStyle,
            style,
          ]}
          placeholderTextColor="#94a3b8"
          {...props}
        />
      </View>
    );
  }
);

AnimatedInput.displayName = "AnimatedInput";
