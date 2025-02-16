import { useState } from 'react';
import { ElevenLabsClient } from "elevenlabs";
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import process from 'process';

const ELEVEN_LABS_API_KEY = Constants.expoConfig?.extra?.ELEVEN_LABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;

if (!ELEVEN_LABS_API_KEY) {
  throw new Error('Missing ELEVEN_LABS_API_KEY in environment variables');
}

type ElevenLabsStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseElevenLabsReturn {
  status: ElevenLabsStatus;
  error: Error | null;
  speakText: (text: string) => Promise<void>;
}

export function useElevenLabs(): UseElevenLabsReturn {
  const [status, setStatus] = useState<ElevenLabsStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  
  const client = new ElevenLabsClient({
    apiKey: ELEVEN_LABS_API_KEY,
  });

  const speakText = async (text: string): Promise<void> => {
    try {
      setStatus('loading');
      setError(null);

      const audioData = await client.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
        text,
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
      });

      // Convert the audio data to buffer first
      const chunks: Buffer[] = [];
      for await (const chunk of audioData) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);
      const base64Audio = buffer.toString('base64');
      const uri = `data:audio/mp3;base64,${base64Audio}`;

      // Play using expo-av
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      // Optional: Clean up when done
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });

      setStatus('success');
    } catch (err) {
      console.error('Error with ElevenLabs API:', err);
      setStatus('error');
      setError(err as Error);
    }
  };

  return {
    status,
    error,
    speakText,
  };
}
