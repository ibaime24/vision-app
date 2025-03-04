import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const OPENAI_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('Missing EXPO_PUBLIC_OPENAI_API_KEY in environment variables');
}

export type WhisperStatus = 'idle' | 'uploading' | 'success' | 'error';

interface FileInfo {
  uri: string;
  name: string;
  type: string;
}

interface WhisperResponse {
  text: string;
  [key: string]: any;
}

export function useWhispersAPI() {
  const [status, setStatus] = useState<WhisperStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);

  const transcribeAudio = useCallback(async (audioUri: string): Promise<string | null> => {
    try {
      console.log('[useWhispersAPI] Starting transcription process');
      setStatus('uploading');
      setError(null);
      setTranscribedText(null);

      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error('Audio file not found on device');
      }

      const processedUri = Platform.OS === 'ios' ? audioUri.replace('file://', '') : audioUri;
      const parts = processedUri.split('/');
      const fileName = parts.pop() || 'audio.mp3';
      
      let mimeType: string = 'audio/mpeg';
      if (fileName.endsWith('.m4a')) {
        mimeType = 'audio/mp4';
      } else if (fileName.endsWith('.mp3')) {
        mimeType = 'audio/mpeg';
      } else if (fileName.endsWith('.wav')) {
        mimeType = 'audio/wav';
      }

      const fileData: FileInfo = {
        uri: processedUri,
        name: fileName,
        type: mimeType,
      };

      const formData = new FormData();
      formData.append('file', fileData as unknown as Blob);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      console.log('[useWhispersAPI] Sending request to Whisper API with file:', {
        ...fileData,
        uri: fileData.uri.substring(0, 50) + '...' // Truncate URI for logging
      });

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('[useWhispersAPI] API Error:', response.status, responseText);
        throw new Error(`API Error (${response.status}): ${responseText}`);
      }

      const data = JSON.parse(responseText) as WhisperResponse;
      if (!data.text) {
        throw new Error('API response missing transcription text');
      }

      console.log('[useWhispersAPI] Transcription successful:', data.text);
      setTranscribedText(data.text);
      setStatus('success');
      return data.text;
    } catch (err) {
      console.error('[useWhispersAPI] Error:', err);
      setStatus('error');
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  }, []);

  return {
    status,
    error,
    transcribedText,
    transcribeAudio,
  };
}