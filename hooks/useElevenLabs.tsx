
import { useState } from 'react';
import { createAudioPlayer, AudioModule } from 'expo-audio';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

interface UseElevenLabsReturn {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: Error | null;
  speakText: (text: string) => Promise<void>;
  getAudioFromElevenLabs: (text: string) => Promise<string>;
  playAudioFile: (dataUrl: string) => Promise<void>;
}

const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export function useElevenLabs(): UseElevenLabsReturn {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);

  const apiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_ELEVEN_LABS_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXPO_PUBLIC_ELEVEN_LABS_API_KEY');
  }

  // Get audio and persist to a file; return file:// URI for native playback reliability
  const getAudioFromElevenLabs = async (text: string): Promise<string> => {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    // Convert response directly to data URL
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return dataUrl;
  };

  // Play from a file:// URI
  const playAudioFile = async (fileUri: string): Promise<void> => {
    // Ensure playback routes to loud speaker and works in silent mode on iOS
    if (Platform.OS === 'ios') {
      await AudioModule.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true
      });
    }
    const player = createAudioPlayer({ uri: fileUri });
    
    // Wait for playback to complete before releasing
    return new Promise<void>((resolve, reject) => {
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.didJustFinish) {
          player.release();
          resolve();
        }
      });
      
      try {
        player.play();
      } catch (error) {
        player.release();
        reject(error);
      }
    });
  };

  const speakText = async (text: string): Promise<void> => {
    try {
      setStatus('loading');
      setError(null);

      const dataUrl = await getAudioFromElevenLabs(text);
      await playAudioFile(dataUrl);

      setStatus('success');
    } catch (err) {
      console.error('Error with ElevenLabs API:', err);
      setStatus('error');
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  return {
    status,
    error,
    speakText,
    getAudioFromElevenLabs,
    playAudioFile,
  };
}