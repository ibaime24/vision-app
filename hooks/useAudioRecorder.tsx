import { useState, useCallback, useEffect } from 'react';
import { useAudioRecorder as useExpoAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';

interface AudioRecorderOptions {
  onTranscriptionComplete?: (text: string) => void;
  onError?: (error: Error) => void;
}

export function useAudioRecorder(options?: AudioRecorderOptions) {
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    (async () => {
      try {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        setHasPermission(permission.status === 'granted');
      } catch (error) {
        console.error('Permission error:', error);
        setHasPermission(false);
      }
    })();

    // Cleanup when component unmounts
    return () => {
      // recorder is auto-released by hook on unmount
    };
  }, []);

  
  const startRecording = useCallback(async () => {
    try {
      if (!hasPermission) {
        throw new Error('Microphone permission not granted');
      }

      // iOS requires explicitly enabling recording mode before starting
      if (Platform.OS === 'ios') {
        await AudioModule.setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        }); 
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [hasPermission, recorder]);

  const stopRecording = useCallback(async () => {
    try {
      setIsRecording(false);
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        throw new Error('Recording URI is null');
      }
      return { uri };
    } catch (error) {
      console.error('Error stopping recording:', error);
      options?.onError?.(error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }, [recorder]);

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

