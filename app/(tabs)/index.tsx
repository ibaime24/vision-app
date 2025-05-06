import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Audio } from 'expo-av';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useCamera } from '../../hooks/useCamera';
import { useElevenLabs } from '../../hooks/useElevenLabs';
import { useOpenAI } from '../../hooks/useOpenAI';
import { useWhispersAPI } from '../../hooks/useWhispersAPI';
import { BigCircleAnimated } from '../../components/BigCircleAnimated';
import { BigCircleClosing } from '../../components/BigCircleClosing';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

/**
 * Main screen where user sees a continuous live camera feed.
 * - When the user presses down, a photo is taken.
 * - Audio recording also starts on press.
 * - When the user releases, audio recording stops.
 * - Both photo & audio are then sent to the backend.
 */

// Design constants
const ACCENT_COLOR = '#00C6FF'; // Fresh cyan accent

// First, define the type for the ref 
export default function HomeScreen() {
  const [inputText, setInputText] = useState('');
  const { cameraRef, photoUri, photoBase64, takePicture } = useCamera();
  const { isRecording, hasPermission, startRecording, stopRecording } = useAudioRecorder();
  const { transcribeAudio, status: whisperStatus } = useWhispersAPI();
  const { sendToOpenAI, aiResponse, status: openAIStatus } = useOpenAI();
  const { speakText, status: elevenLabsStatus, getAudioFromElevenLabs, playAudioFile } = useElevenLabs();
  const router = useRouter();
  const circleRef = useRef<{ triggerAnimation: () => void } | null>(null); 
  const tabBarHeight = useBottomTabBarHeight();
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayOpacity = useSharedValue(0); // For background dimming

  // Animated style for background dim
  const dimStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const playRecordedAudio = async (uri: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
        }
      });
    } catch (error) {
      Alert.alert('Playback Error', 'Could not play the recorded audio.');
    }
  };

  const handlePressIn = async () => {
    try {
      // Strong haptic on initial press
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      // Animate dimming overlay in
      overlayOpacity.value = withTiming(0.2, { duration: 300 });

      // Start photo and recording processes **after 250ms**
      captureTimeoutRef.current = setTimeout(async () => {
        // Trigger radial pulse animation right as capture begins
        circleRef.current?.triggerAnimation();
        const photoPromise = takePicture();
        const recordingPromise = startRecording();

        const photo = await photoPromise;
        if (!photo) {
          throw new Error('Failed to capture photo');
        }
        await recordingPromise;
      }, 250);
    } catch (error) {
      Alert.alert('Error', 'Failed to start capture process');
    }
  };

  const handlePressOut = async () => {
    try {
      // If user released before capture started, cancel and reset UI
      if (!isRecording) {
        if (captureTimeoutRef.current) {
          clearTimeout(captureTimeoutRef.current);
          captureTimeoutRef.current = null;
        }
        // Reverse dim overlay
        overlayOpacity.value = withTiming(0, { duration: 300 });
        return; // Nothing else to do
      }
      // Medium haptic on release
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      circleRef.current?.triggerAnimation(); // Correct method call
      
      const startTime = Date.now();
      console.log('[HomeScreen] Starting process...');

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const audioData = await stopRecording();
      console.log(`[HomeScreen] Recording stopped: ${Date.now() - startTime}ms`);

      if (!audioData?.uri) {
        throw new Error('Failed to get audio recording data');
      }

      if (!photoBase64) {
        throw new Error('Missing base64 image data');
      }

      // Playback for debugging
        // console.log('[HomeScreen] Playing recorded audio...');
        // const playbackStart = Date.now();
        // await playRecordedAudio(audioData.uri);
        // console.log(`[HomeScreen] Audio playback complete: ${Date.now() - playbackStart}ms`);

      // Transcribe the audio
      console.log('[HomeScreen] Starting transcription...');
      const transcribeStart = Date.now();
      const transcribedText = await transcribeAudio(audioData.uri);
      console.log(`[HomeScreen] Transcription complete: ${Date.now() - transcribeStart}ms`);
      console.log('[HomeScreen] Transcribed text:', transcribedText);
      
      if (!transcribedText) {
        throw new Error('Failed to transcribe audio');
      }

      // Get the response from OpenAI
      console.log('[HomeScreen] Sending to OpenAI...');
      const openAiStart = Date.now();
      const response = await sendToOpenAI({
        transcribedText,
        base64Image: photoBase64, 
      });
      console.log(`[HomeScreen] OpenAI response received: ${Date.now() - openAiStart}ms`);
      console.log('[HomeScreen] AI Response:', response);
      
      // Use the response with ElevenLabs
      if (response) {
        try {
          // First get the audio file
          console.log('[HomeScreen] Getting audio from ElevenLabs...');
          const elevenLabsStart = Date.now();
          const audioFileUri = await getAudioFromElevenLabs(response);
          console.log(`[HomeScreen] ElevenLabs audio received: ${Date.now() - elevenLabsStart}ms`);
          
          // Soft haptic when audio starts playing
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          console.log('[HomeScreen] Playing ElevenLabs audio...');
          const playStart = Date.now();
          await playAudioFile(audioFileUri);
          
          // After audio is done playing, hide the circle
          circleRef.current?.triggerAnimation(); // Correct method call
          console.log(`[HomeScreen] Audio playback complete: ${Date.now() - playStart}ms`);
        } catch (speechError) {
          console.error('[HomeScreen] ElevenLabs error:', speechError);
          Alert.alert('Speech Error', 'Failed to convert text to speech');
          circleRef.current?.triggerAnimation(); // Correct method call
        }
      }

      const totalTime = Date.now() - startTime;
      console.log(`[HomeScreen] Total process time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`