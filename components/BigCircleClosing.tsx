import React, { forwardRef, useImperativeHandle } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface BigCircleClosingProps {
  color?: string;      // Color of the ring
  duration?: number;   // Animation duration
  edgeDistance?: number;  // Distance from screen edge
}

/**
 * This component starts as a large ring that covers the entire screen,
 * with a transparent hole in the center. When triggerClose is called,
 * the ring shrinks down into the center, revealing the screen behind it.
 */
export const BigCircleClosing = forwardRef(function BigCircleClosing(
  {
    color = 'white',
    duration = 1200,
    edgeDistance = 20,  // Default edge distance
  }: BigCircleClosingProps,
  ref: React.Ref<{ 
    showEdges: () => void; 
    converge: () => void; 
    hide: () => void 
  }>
) {
  const { width, height } = Dimensions.get('window');
  
  // Calculate the size needed for the ring to be edgeDistance pixels from screen edges
  const ringDiameter = Math.sqrt(
    Math.pow(width - (edgeDistance * 2), 2) +
    Math.pow(height - (edgeDistance * 2), 2)
  );
  
  // Start with larger scale to make ring appear to come from outside
  const scale = useSharedValue(1.5);  // Start bigger than needed
  const opacity = useSharedValue(1);
  const thickness = useSharedValue(edgeDistance * 2);

  // Define the animation functions BEFORE useImperativeHandle
  const showEdges = () => {
    // Each animated value gets its own withTiming
    scale.value = withTiming(1, { duration: 100 });
    opacity.value = withTiming(1, { duration: 100 });
    thickness.value = edgeDistance * 2;
  };

  const converge = () => {
    // Sequence the animations
    thickness.value = withTiming(ringDiameter / 2, { duration: duration / 2 });
    scale.value = withTiming(0, { duration });
  };

  const hide = () => {
    // Specify which value to animate
    opacity.value = withTiming(0, { duration: 300 });
  };

  // Now we can safely use the functions in useImperativeHandle
  useImperativeHandle(ref, () => ({
    showEdges,
    converge,
    hide
  }));

  // As scale goes down, the ring appears to close in on the center
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    borderWidth: thickness.value,
  }));

  return (
    <Animated.View
      style={[
        styles.absoluteFill,
        {
          width: ringDiameter,
          height: ringDiameter,
          borderRadius: ringDiameter / 2,
          // We draw a ring (edge) by setting a border on a transparent circle
          backgroundColor: 'transparent',
          borderColor: color,
          // Center the ring over the screen
          left: -(ringDiameter - width) / 2,
          top: -(ringDiameter - height) / 2,
          zIndex: -10, // ensure on top
          pointerEvents: 'none', // Allow touches to pass through
        },
        animatedStyle,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  absoluteFill: {
    position: 'absolute',
  },
});
