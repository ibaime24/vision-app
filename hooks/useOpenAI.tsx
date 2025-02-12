import { useState } from 'react';
import OpenAI from "openai";
import Constants from 'expo-constants';

// Get the OpenAI API key from environment variables
const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY in environment variables');
}

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export type OpenAIStatus = 'idle' | 'loading' | 'success' | 'error';

interface SendToOpenAIParams {
  transcribedText?: string;
  base64Image?: string;
}

interface UseOpenAIReturn {
  status: OpenAIStatus;
  error: Error | null;
  aiResponse: string | null;
  sendToOpenAI: (params: SendToOpenAIParams) => Promise<void>;
}

export function useOpenAI(): UseOpenAIReturn {
  const [status, setStatus] = useState<OpenAIStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const sendToOpenAI = async ({ transcribedText, base64Image }: SendToOpenAIParams) => {
    try {
      setStatus('loading');
      setError(null);

      // Clean up the image string
      const cleanBase64 = base64Image?.replace(/\s/g, '') || '';
      const imageUrl = cleanBase64.startsWith('data:image/jpeg;base64,')
        ? cleanBase64
        : `data:image/jpeg;base64,${cleanBase64}`;

      // Construct the full messages array
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: "You are Son, a concise yet informative vision assistant for the visually impaired. Start descriptions with 'I see'",
        },
      ];

      // Add user message
      // If only text is provided
      if (transcribedText && !base64Image) {
        messages.push({
          role: 'user',
          content: transcribedText,
        });
      }
      // If only image is provided
      else if (!transcribedText && base64Image) {
        messages.push({
          role: 'user',
          content: `Here is an image to describe: ${imageUrl}`,
        });
      }
      // If both are provided
      else if (transcribedText && base64Image) {
        messages.push({
          role: 'user',
          content: `Text: ${transcribedText}\nImage: ${imageUrl}`,
        });
      } 
      // If nothing provided
      else {
        throw new Error('No input (text or image) provided');
      }

      // Call OpenAI
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 300,
      });

      const choice = response.choices?.[0];
      if (!choice || !choice.message?.content) {
        throw new Error('OpenAI response missing content');
      }

      setAiResponse(choice.message.content);
      setStatus('success');
    } catch (err) {
      console.error('[useOpenAI] Error:', err);
      setStatus('error');
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  return {
    status,
    error,
    aiResponse,
    sendToOpenAI,
  };
}