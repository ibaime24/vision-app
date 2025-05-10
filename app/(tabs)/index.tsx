import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Audio } from 'expo-av';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View, Platform } from 'react-native';
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

// Preload earcon modules (place your own wav/mp3 files in assets/sounds)
const earcons = {
  press: require('../../assets/sounds/press.wav'),       // finger down
  done: require('../../assets/sounds/done.wav'),         // recording finished
  processing: require('../../assets/sounds/processing.wav'), // periodic tick while processing
  result: require('../../assets/sounds/result.wav'),     // just before speech plays
};

async function playEarcon(type: keyof typeof earcons) {
  try {
    const { sound } = await Audio.Sound.createAsync(earcons[type]);
    await sound.playAsync();
    // Unload after playback to free resources
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded && status.didJustFinish) {
        await sound.unloadAsync();
      }
    });
  } catch (e) {
    console.warn('Earcon error', e);
  }
}

export async function playSystemClick() {
  if (Platform.OS === 'ios') {
    // iOS: 1104 is "Tock", 1156 is "Peek"
    const { sound } = await Audio.Sound.createAsync(
      { uri: 'system://com.apple.UIKit:1104' }    // needs RN 0.79 / iOS 17+
    );
    await sound.playAsync();
  } else {
    // Android: just use Haptic feedback (there's no public audio API)
    Haptics.selectionAsync();
  }
}

// 200 ms, 880 Hz sine "beep"
const BEEP_BASE64 =
  'UklGRqYAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YWqYA...';

export async function playBeep() {
  const { sound } = await Audio.Sound.createAsync({
    uri: `data:audio/wav;base64,${BEEP_BASE64}`,
  });
  await sound.playAsync();
  sound.setOnPlaybackStatusUpdate(async s => {
    if (s.isLoaded && s.didJustFinish) await sound.unloadAsync();
  });
}

// First, define the type for the ref 
export default function HomeScreen() {
  const [inputText, setInputText] = useState('');
  const [isPlayingResult, setIsPlayingResult] = useState(false);
  const { cameraRef, photoUri, photoBase64, takePicture } = useCamera();
  const { isRecording, hasPermission, startRecording, stopRecording } = useAudioRecorder();
  const { transcribeAudio, status: whisperStatus } = useWhispersAPI();
  const { sendToOpenAI, aiResponse, status: openAIStatus } = useOpenAI();
  const { speakText, status: elevenLabsStatus, getAudioFromElevenLabs, playAudioFile } = useElevenLabs();
  const router = useRouter();
  const circleRef = useRef<{ triggerAnimation: () => void } | null>(null); 
  const tabBarHeight = useBottomTabBarHeight();
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayOpacity = useSharedValue(0);          // default 0
  const processingIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

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
      circleRef.current?.triggerAnimation(); // Correct method call
      // Animate dimming overlay in
      overlayOpacity.value = withTiming(0.1, { duration: 300 });

      // Start photo and recording processes **after 250ms**
      captureTimeoutRef.current = setTimeout(async () => {
        const photoPromise = takePicture();
        const photo = await photoPromise;
        if (!photo) {
          throw new Error('Failed to capture photo');
        }
        playEarcon('press'); // Play press sound when recording starts
        await startRecording();
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
      playEarcon('done'); // Play done sound when recording stops
      const audioData = await stopRecording();
      console.log(`[HomeScreen] Recording stopped: ${Date.now() - startTime}ms`);

      if (!audioData?.uri) {
        throw new Error('Failed to get audio recording data');
      }

      if (!photoBase64) {
        throw new Error('Missing base64 image data');
      }

      // Start playing processing sound after 2 seconds and repeat every 2 seconds
      setTimeout(() => {
        playEarcon('processing');
        processingIntervalRef.current = setInterval(() => {
          playEarcon('processing');
        }, 2000);
      }, 2000);

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
          if (processingIntervalRef.current) {
            clearInterval(processingIntervalRef.current);
            processingIntervalRef.current = null;
          }
          playEarcon('result');
          // Add 200ms delay before playing the actual audio
          await new Promise(resolve => setTimeout(resolve, 200));
          setIsPlayingResult(true);
          await playAudioFile(audioFileUri);
          setIsPlayingResult(false);
          
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
      console.log(`[HomeScreen] Total process time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);

    } catch (error) {
      console.error('[HomeScreen] Error in handlePressOut:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
      circleRef.current?.triggerAnimation(); // Correct method call
    } finally {
      // After either success or failure, reverse dim overlay
      overlayOpacity.value = withTiming(0, { duration: 300 });
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }
    }
  };

  // Status text for UI
  const getStatusText = () => {
    if (!hasPermission) return 'Microphone Access Required';
    if (isRecording) return 'Recording...';
    if (whisperStatus === 'uploading') return 'Transcribing...';
    if (openAIStatus === 'loading') return 'Processing AI...';
    if (elevenLabsStatus === 'loading') return 'Speaking...';
    return 'Hold to Record';
  };

  return (
    <View style={styles.main}>
      {/* Camera layer */}
      <CameraView
        style={styles.camera}
        ref={cameraRef}
      />

      {/* Blur overlay */}
      {/* optional: <BlurView ... intensity={5} />  // barely visible */}

      {/* Dim overlay (animated) */}
      <Animated.View pointerEvents="none" style={[styles.dimOverlay, dimStyle]} />

      {/* Full screen pressable area - above camera, below UI */}
      <Pressable
        style={[
          StyleSheet.absoluteFill,
          { 
            zIndex: 1,  // Above camera, below UI
            marginBottom: tabBarHeight, // Add space for tab bar
          }
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isPlayingResult}
      />

      {/* Radial pulse */}
      <BigCircleAnimated ref={circleRef} color={ACCENT_COLOR} duration={800} fadeDelay={600} />

      {/* UI Elements */}
      {photoUri && (
        <BlurView style={[styles.previewContainer, { zIndex: 2 }]} intensity={40} tint="default">
          <Image 
            source={{ uri: photoUri }}
            style={styles.preview}
          />
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#000', // Dark background for camera view
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  previewContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)', // Frosted glass look
    zIndex: 2,
  },
  preview: {
    width: 120,
    height: 160,
  },
  pressableArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1, // Above camera, below UI
  },
  // Add any other styles used in your component
  recordButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    padding: 20,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    zIndex: 2,
  },
  recordingButton: {
    backgroundColor: 'rgba(0,198,255,0.4)',
  },
  recordText: {
    color: '#fff',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
});