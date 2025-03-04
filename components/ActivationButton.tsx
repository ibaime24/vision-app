import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ActivationButtonProps {
  isRecording: boolean;
  hasPermission: boolean;
  onPressIn: () => Promise<void>;
  onPressOut: () => Promise<void>;
  statusText: string;
}

export const ActivationButton: React.FC<ActivationButtonProps> = ({
  isRecording,
  hasPermission,
  onPressIn,
  onPressOut,
  statusText,
}) => {
  const handlePressIn = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onPressIn();
  };

  const handlePressOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressOut();
  };

  return (
    <Pressable
      style={[
        styles.recordButton,
        isRecording && styles.recordingButton,
        !hasPermission && styles.disabledButton
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!hasPermission}
    >
      <Text style={styles.recordText}>
        {statusText}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  recordButton: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 50,
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
    transform: [{ scale: 0.95 }],
  },
  disabledButton: {
    backgroundColor: '#999999',
    opacity: 0.5,
  },
  recordText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 