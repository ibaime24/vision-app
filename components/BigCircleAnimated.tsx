import React, { forwardRef, useImperativeHandle } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

interface BigCircleAnimatedProps {
  // Optional ability to configure the circle's color and animation duration
  color?: string;
  duration?: number;
  fadeDelay?: number; // How long to wait before fading out
}

/**
 * This component creates a full-screen circle that can be animated on demand.
 * We use forwardRef + useImperativeHandle so the parent can call triggerAnimation().
 */
export const BigCircleAnimated = forwardRef(function BigCircleAnimated(
  { color = 'white', duration = 500, fadeDelay = 2000 }: BigCircleAnimatedProps,
  ref: React.Ref<{ triggerAnimation: () => void }>
) {
  const { width, height } = Dimensions.get('window');
  // Use the larger dimension to ensure circle fully covers screen
  const size = Math.max(width, height) * 2;
  
  // The circle starts with a scale + opacity of 0 (invisible)
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  // Expose a method to trigger the animation from the parent
  useImperativeHandle(ref, () => ({
    triggerAnimation() {
      // Expand and become visible
      scale.value = withTiming(1, { duration });
      
      // Set to visible immediately
      opacity.value = 1;
      
      // After delay, fade out
      setTimeout(() => {
        opacity.value = withTiming(0, { duration });
      }, fadeDelay);
    },
  }));

  // The animated style that grows our circle
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2, // Makes it a perfect circle
          // Center the circle
          left: -(size - width) / 2,
          top: -(size - height) / 2,
        },
        animatedStyle,
      ]}
    />
  );
});