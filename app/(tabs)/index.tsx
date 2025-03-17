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

/**
 * Main screen where user sees a continuous live camera feed.
 * - When the user presses down, a photo is taken.
 * - Audio recording also starts on press.
 * - When the user releases, audio recording stops.
 * - Both photo & audio are then sent to the backend.
 */


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
  const [showRedScreen, setShowRedScreen] = useState(false); // State to control red screen visibility

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
      setShowRedScreen(true); // Show red screen immediately

      // Start photo and recording processes after a small delay
      setTimeout(async () => {
        const photoPromise = takePicture();
        const recordingPromise = startRecording();

        const photo = await photoPromise;
        if (!photo) {
          throw new Error('Failed to capture photo');
        }
        await recordingPromise;
      }, 50);
    } catch (error) {
      Alert.alert('Error', 'Failed to start capture process');
    }
  };

  const handlePressOut = async () => {
    try {
      // Medium haptic on release
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      circleRef.current?.triggerAnimation(); // Correct method call
      
      const startTime = Date.now();
      console.log('[HomeScreen] Starting process...');

      if (!isRecording) {
        throw new Error('Recording was not properly started');
      }

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
      console.log(`[HomeScreen] Total process time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);

    } catch (error) {
      console.error('[HomeScreen] Error in handlePressOut:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
      circleRef.current?.triggerAnimation(); // Correct method call
    } finally {
      // After either success or failure, hide the red screen
      setShowRedScreen(false); // Hide red screen
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
      />

      {/* Red screen overlay */}
      {showRedScreen && (
        <View style={styles.redScreen} />
      )}

      {/* UI Elements */}
      {photoUri && (
        <View style={[styles.previewContainer, { zIndex: 2 }]}>  
          <Image 
            source={{ uri: photoUri }}
            style={styles.preview}
          />
        </View>
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
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.3)',
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255,255,255,0.3)',
    zIndex: 2,
  },
  recordingButton: {
    backgroundColor: 'rgba(255,0,0,0.3)',
  },
  recordText: {
    color: '#fff',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  redScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 0, 0, 0.8)', // Semi-transparent red
    zIndex: 2, // Above everything else
  },
});