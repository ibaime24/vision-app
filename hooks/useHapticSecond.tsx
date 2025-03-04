import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';

export function useHapticBeep(pressed: boolean) {
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (pressed) {
      intervalId = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 500);
    } else if (intervalId) {
      clearInterval(intervalId);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pressed]);
}
