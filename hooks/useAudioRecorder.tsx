import { useState, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';

interface AudioRecorderOptions {
  onTranscriptionComplete?: (text: string) => void;
  onError?: (error: Error) => void;
}

export function useAudioRecorder(options?: AudioRecorderOptions) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    (async () => {
      try {
        const permission = await Audio.requestPermissionsAsync();
        setHasPermission(permission.status === 'granted');
      } catch (error) {
        console.error('Permission error:', error);
        setHasPermission(false);
      }
    })();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [hasPermission]);

  const stopRecording = useCallback(async () => {
    try {
      if (!recording) {
        throw new Error('No active recording');
      }

      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      const uri = recording.getURI();
      if (!uri) {
        throw new Error('Recording URI is null');
      }

      setRecording(null);
      return { uri };
    } catch (error) {
      console.error('Error stopping recording:', error);
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }, [recording]);

  const handleError = useCallback((error: Error) => {
    const errorMessage = error.message || 'An error occurred';
    if (Platform.OS === 'web') {
      window.alert(errorMessage);
    } else {
      Alert.alert('Error', errorMessage);
    }
    options?.onError?.(error);
  }, [options]);

  return {
    isRecording,
    loading,
    hasPermission,
    startRecording,
    stopRecording,
    handleError,
  };
}

