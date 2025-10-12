
import { useState } from 'react';
import { createAudioPlayer } from 'expo-audio';
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

  // Modified to return base64 data URL
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

  // Modified to use data URL directly
  const playAudioFile = async (dataUrl: string): Promise<void> => {
    const player = createAudioPlayer({ uri: dataUrl });
    await player.play();
    player.release();
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