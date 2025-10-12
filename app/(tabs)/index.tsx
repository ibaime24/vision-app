import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { createAudioPlayer } from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import { Alert, Image, Pressable, StyleSheet, View, Platform, Text } from 'react-native';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useCamera } from '../../hooks/useCamera';
import { useElevenLabs } from '../../hooks/useElevenLabs';
import { useOpenAI } from '../../hooks/useOpenAI';
import { useWhispersAPI } from '../../hooks/useWhispersAPI';
import ProcessingCircle, { ProcessingCircleRef } from '../../components/ProcessingCircle';
import { BlurView } from 'expo-blur';
import Animated, { 
  useSharedValue, 
  withTiming, 
  useAnimatedStyle,
  runOnJS 
} from 'react-native-reanimated';

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
    const player = createAudioPlayer(earcons[type]);
    await player.play();
    player.release();
  } catch (e) {
    console.warn('Earcon error', e);
  }
}

// First, define the type for the ref 
export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isPlayingResult, setIsPlayingResult] = useState(false);
  const pressStartTimeRef = useRef<number | null>(null);
  const { cameraRef, photoUri, photoBase64, takePicture } = useCamera();
  const { isRecording, hasPermission, startRecording, stopRecording } = useAudioRecorder();
  const { transcribeAudio, status: whisperStatus } = useWhispersAPI();
  const { sendToOpenAI, aiResponse, status: openAIStatus } = useOpenAI();
  const { speakText, status: elevenLabsStatus, getAudioFromElevenLabs, playAudioFile } = useElevenLabs();
  const router = useRouter();
  // = useBottomTabBarHeight(); not needed for now
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayOpacity = useSharedValue(0);
  const processingIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const processingCircleRef = useRef<ProcessingCircleRef>(null);

  // Request camera permissions if not granted
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Show error if permissions are denied
  if (permission?.status === 'denied') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Camera permission is required to use this app.
          Please enable it in your device settings.
        </Text>
      </View>
    );
  }

  // Animated style for background dim
  const dimStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const playRecordedAudio = async (uri: string) => {
    try {
      const player = createAudioPlayer({ uri });
      await player.play();
      player.release();
    } catch (error) {
      Alert.alert('Playback Error', 'Could not play the recorded audio.');
    }
  };

  const handlePressIn = async () => {
    try {
      // Record the start time
      pressStartTimeRef.current = Date.now(); // starts the process for making sure program doesn't go early
    } catch (error) {
      Alert.alert('Error', 'Failed to start capture process');
    }
  };

  const handlePressOut = async () => {
    try {
      // If no start time was recorded, do nothing
      if (!pressStartTimeRef.current) {
        return;
      }

      // Calculate how long the press was held
      const pressDuration = Date.now() - pressStartTimeRef.current;
      pressStartTimeRef.current = null;

      // If press wasn't held long enough, do nothing
      if (pressDuration < 250) {
        return;
      }

      // If user released before capture started, cancel and reset UI
      if (!isRecording) {
        // Reverse dim overlay
        overlayOpacity.value = withTiming(0, { duration: 300 });
        return;
      }

      // Medium haptic on release
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const startTime = Date.now();
      console.log('[HomeScreen] Starting process...');

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      playEarcon('done');
      const audioData = await stopRecording();
      console.log(`[HomeScreen] Recording stopped: ${Date.now() - startTime}ms`);

      if (!audioData?.uri) {
        throw new Error('Failed to get audio recording data');
      }

      if (!photoBase64) {
        throw new Error('Missing base64 image data');
      }

      // Start PROCESSING animation
      console.log('[HomeScreen] Starting PROCESSING animation');
      processingCircleRef.current?.triggerProcessing();

      // Start playing processing sound after 3 seconds and repeat every 2 seconds
      setTimeout(() => {
        playEarcon('processing');
        processingIntervalRef.current = setInterval(() => {
          playEarcon('processing');
        }, 2000);
      }, 3000);

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
           
          // Start COMPLETE animation
          console.log('[HomeScreen] Starting COMPLETE animation');
          processingCircleRef.current?.triggerComplete();
          
          playEarcon('result');
          // Add 200ms delay before playing the actual audio
          await new Promise(resolve => setTimeout(resolve, 200));
          setIsPlayingResult(true);
          await playAudioFile(audioFileUri);
          setIsPlayingResult(false);
          
          console.log(`[HomeScreen] Audio playback complete: ${Date.now() - playStart}ms`);
        } catch (speechError) {
          console.error('[HomeScreen] ElevenLabs error:', speechError);
          Alert.alert('Speech Error', 'Failed to convert text to speech');
        }
        const handleProcessingCircleComplete = () => {
          console.log('[HomeScreen] Processing circle animation complete');
          processingCircleRef.current?.triggerReset();
        };
      }

      const totalTime = Date.now() - startTime;
      console.log(`[HomeScreen] Total process time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);

    } catch (error) {
      console.error('[HomeScreen] Error in handlePressOut:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
      // Reset the animation on error
      processingCircleRef.current?.triggerReset();
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }
    } finally {
      // After either success or failure, reverse dim overlay
      overlayOpacity.value = withTiming(0, { duration: 300 });
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }
    }
  };

  const handleProcessingCircleComplete = () => {
    console.log('[HomeScreen] Processing circle animation complete');
    processingCircleRef.current?.triggerReset();
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

  // Add effect to start process when press duration is valid
  useEffect(() => {
    if (pressStartTimeRef.current) {
      const checkPressDuration = () => {
        if (!pressStartTimeRef.current) return;
        
        const pressDuration = Date.now() - pressStartTimeRef.current;
        if (pressDuration >= 250) {
          // Reset animation states and wait for completion before starting APPEAR
          processingCircleRef.current?.triggerReset(() => {
            console.log('[HomeScreen] RESET complete, starting APPEAR');
            processingCircleRef.current?.triggerAppear();
          });
          
          // Strong haptic on initial press
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          playEarcon('press');
          
          // Animate dimming overlay in
          overlayOpacity.value = withTiming(0.1, { duration: 300 });

          // Take photo and start recording
          takePicture().then(photo => {
            if (!photo) {
              throw new Error('Failed to capture photo');
            }
            return startRecording();
          }).catch(error => {
            Alert.alert('Error', 'Failed to start capture process');
          });
        } else {
          // Check again in a short while
          setTimeout(checkPressDuration, 50);
        }
      };

      // Start checking press duration
      checkPressDuration();
    }
  }, [pressStartTimeRef.current]);

  return (
    <View style={styles.main}>
      {/* Camera layer */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        active={true}
      />

      {/* Dim overlay (animated) */}
      <Animated.View pointerEvents="none" style={[styles.dimOverlay, dimStyle]} />

      {/* Full screen pressable area - above camera, below UI */}
      <Pressable
        style={styles.pressableArea}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isPlayingResult}
      />

      {/* Processing Circle */}
      <ProcessingCircle
        ref={processingCircleRef}
        onAnimationComplete={handleProcessingCircleComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    position: 'relative',
  },

  camera: {
    flex: 1,
  },
  
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    zIndex: 1,
  },

  pressableArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1, // Above camera, below UI
    margin: 25, // Creates a 25px border around the edges so users don't accidentally trigger process by holding phone
  },
  
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});