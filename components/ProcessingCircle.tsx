import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

type AnimationPhase = 'idle' | 'appear' | 'processing' | 'complete';
type AnimationCallback = () => void;

interface ProcessingCircleProps {
  size?: number;
  style?: object;
  onAnimationComplete?: () => void;
}

export interface ProcessingCircleRef {
  triggerAppear: (cb?: AnimationCallback) => void;
  triggerProcessing: (cb?: AnimationCallback) => void;
  triggerComplete: (cb?: AnimationCallback) => void;
  triggerReset: (cb?: AnimationCallback) => void;
}

const ProcessingCircle = forwardRef<ProcessingCircleRef, ProcessingCircleProps>(
  ({ size = 100, style }, ref) => {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const pulse = useSharedValue(1);
    const status = useSharedValue<AnimationPhase>('idle');

    // Base animation configuration
    const config = {
      appear: {
        scale: { to: 1, duration: 300, easing: Easing.out(Easing.cubic) },
        opacity: { to: .85, duration: 200 }
      },
      processing: {
        pulse: { min: 0.8, max: 1.3, duration: 2000 },
        opacity: { to: 1, duration: 150 }
      },
      complete: {
        scale: { to: 1.4, duration: 400 },
        opacity: { to: 0, duration: 400 },
      },
      reset: {
        scale: { to: 0, duration: 300 },
        opacity: { to: 0, duration: 200 }
      }
    };

    const animate = (phase: AnimationPhase, cb?: AnimationCallback) => {
      status.value = phase;
      
      switch (phase) {
        case 'appear':
          scale.value = withTiming(config.appear.scale.to, {
            duration: config.appear.scale.duration,
            easing: config.appear.scale.easing
          });
          opacity.value = withTiming(config.appear.opacity.to, {
            duration: config.appear.opacity.duration
          }, () => cb && runOnJS(cb)());
          break;

        case 'processing':
          pulse.value = withRepeat(
            withTiming(config.processing.pulse.max, {
              duration: config.processing.pulse.duration,
              easing: Easing.inOut(Easing.sin)
            }),
            -1,
            true
          );
          opacity.value = withTiming(config.processing.opacity.to, {
            duration: config.processing.opacity.duration
          });
          break;

        case 'complete':
          scale.value = withTiming(config.complete.scale.to, {
            duration: config.complete.scale.duration
          });
          opacity.value = withTiming(config.complete.opacity.to, {
            duration: config.complete.opacity.duration
          }, () => cb && runOnJS(cb)());
          break;

        case 'idle':
          scale.value = withTiming(config.reset.scale.to, {
            duration: config.reset.scale.duration
          });
          opacity.value = withTiming(config.reset.opacity.to, {
            duration: config.reset.opacity.duration
          }, () => cb && runOnJS(cb)());
          pulse.value = 1;
          break;
      }
    };

    // Expose animation controls
    useImperativeHandle(ref, () => ({
      triggerAppear: (cb) => animate('appear', cb),
      triggerProcessing: (cb) => animate('processing', cb),
      triggerComplete: (cb) => animate('complete', cb),
      triggerReset: (cb) => animate('idle', cb)
    }));

    // Combined animated styles
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: scale.value * pulse.value },
      ],
      opacity: opacity.value,
      width: size,
      height: size,
      borderRadius: size / 2,
    }));

    return (
      <Animated.View style={[styles.container, style, animatedStyle]}>
        <Animated.View style={[styles.innerCircle, { borderRadius: size / 2 }]} />
        <Animated.View style={[styles.outerGlow, { borderRadius: size / 2 }]} />
      </Animated.View>
    );
  }
);

// Animation and style constants
const COLORS = {
  circle: {
    fill: '#FFFFFF',  // Pure white using hex
    glow: 'rgba(255, 255, 255, 0.2)',  // White glow with transparency
    border: '#FFFFFF',  // Pure white border
  },
} as const;

const BORDERS = {
  glow: 3,
  radius: (size: number) => size / 2,
} as const;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 20,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  innerCircle: { //the circle
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.circle.fill,
  },
  outerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.circle.glow,
    borderWidth: BORDERS.glow,
    borderColor: COLORS.circle.border,
  },
});

export default ProcessingCircle;