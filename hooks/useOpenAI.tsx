import { useState } from 'react';
import OpenAI from "openai";
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

// Get the OpenAI API key from Constants
const OPENAI_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OpenAI configuration is missing');
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
  sendToOpenAI: (params: SendToOpenAIParams) => Promise<string>;
}

export function useOpenAI(): UseOpenAIReturn {
  const [status, setStatus] = useState<OpenAIStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const sendToOpenAI = async ({ transcribedText, base64Image }: SendToOpenAIParams) => {
    try {
      setStatus('loading');
      setError(null);

      if (!base64Image) {
        throw new Error('No image data provided');
      }

      // Save base64 to temporary file
      const tempFilePath = `${FileSystem.cacheDirectory}temp_image.jpg`;
      await FileSystem.writeAsStringAsync(tempFilePath, base64Image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Read file info to verify
      const fileInfo = await FileSystem.getInfoAsync(tempFilePath);
      if (!fileInfo.exists) {
        throw new Error('Failed to create temporary image file');
      }
      console.log('[useOpenAI] Image file size:', fileInfo.size / 1024 / 1024, 'MB');

      // Read file back as base64
      const imageBase64 = await FileSystem.readAsStringAsync(tempFilePath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const imageUrl = `data:image/jpeg;base64,${imageBase64}`;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system' as const,
          content: "You are Son, a concise yet informative vision assistant for the visually impaired. Answer the user's question and absolutely nothing more"
        },
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: transcribedText || 'What do you see in this image?' },
            {
              type: 'image_url' as const,
              image_url: {
                url: imageUrl,
                detail: 'low' as const
              }
            }
          ]
        }
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 300,
      });

      console.log('[useOpenAI] Response received:', response);

      const choice = response.choices?.[0];
      if (!choice?.message?.content) {
        throw new Error('OpenAI response missing content');
      }

      console.log('[useOpenAI] AI response content:', choice.message.content);
      if (!choice?.message?.content) {
        throw new Error('no response ');
      }
      else{
        console.log('response', choice.message.content)
      }

      setAiResponse(choice.message.content);
      setStatus('success');
      return choice.message.content;
    } catch (err) {
      console.error('[useOpenAI] Error:', err);
      setStatus('error');
      throw err;
    }
  };

  return {
    status,
    error,
    aiResponse,
    sendToOpenAI,
  };
}