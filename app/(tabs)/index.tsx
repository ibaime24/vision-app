import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { CameraView } from 'expo-camera';
import { useCamera } from '../../hooks/useCamera';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useWhispersAPI } from '../../hooks/useWhispersAPI';
import { useOpenAI } from '../../hooks/useOpenAI';
import { useElevenLabs } from '../../hooks/useElevenLabs';

/**
 * Main screen where user sees a continuous live camera feed.
 * - When the user presses down, a photo is taken.
 * - Audio recording also starts on press.
 * - When the user releases, audio recording stops.
 * - Both photo & audio are then sent to the backend.
 */
export default function HomeScreen() {
  const [inputText, setInputText] = useState('');
  const { cameraRef, photoUri, photoBase64, takePicture } = useCamera();
  const { isRecording, hasPermission, startRecording, stopRecording } = useAudioRecorder();
  const { transcribeAudio, status: whisperStatus } = useWhispersAPI();
  const { sendToOpenAI, aiResponse, status: openAIStatus } = useOpenAI();
  const { speakText, status: elevenLabsStatus } = useElevenLabs();
  const router = useRouter();

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
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const photo = await takePicture();
      if (!photo) {
        throw new Error('Failed to capture photo');
      }
      await startRecording();
    } catch (error) {
      Alert.alert('Error', 'Failed to start capture process');
    }
  };

  const handlePressOut = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const audioData = await stopRecording();

      if (!photoBase64) {
        throw new Error('Missing base64 image data');
      }
      if (!audioData?.uri) {
        throw new Error('Missing audio recording');
      }

      // Playback for debugging
      await playRecordedAudio(audioData.uri);

      // Transcribe the audio
      const transcribedText = await transcribeAudio(audioData.uri);
      console.log('[HomeScreen] Transcribed text:', transcribedText);
      
      if (!transcribedText) {
        throw new Error('Failed to transcribe audio');
      }

      // Get the response directly from sendToOpenAI
      const response = await sendToOpenAI({
        transcribedText,
        base64Image: photoBase64, 
      });

      console.log('[HomeScreen] AI Response before speech:', response);
      
      // Use the response directly
      if (response) {
        try {
          await speakText(response);
        } catch (speechError) {
          console.error('[HomeScreen] ElevenLabs error:', speechError);
          Alert.alert('Speech Error', 'Failed to convert text to speech');
        }
      }

    } catch (error) {
      console.error('[HomeScreen] Error in handlePressOut:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
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
    <View style={styles.container}>
      {/* Always-on live camera feed. */}
      <CameraView
        style={styles.camera}
        ref={cameraRef}
      />

      {/* Image Preview */}
      {photoUri && (
        <View style={styles.previewContainer}>
          <Image 
            source={{ uri: photoUri }}
            style={styles.preview}
          />
        </View>
      )}

      {/* Pressable area for capturing photo & audio */}
      <Pressable
        style={[
          styles.recordButton,
          isRecording && styles.recordingButton,
          !hasPermission && styles.disabledButton
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Text style={styles.recordText}>
          {getStatusText()}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerCentered: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 10,
  },
  camera: {
    flex: 1,
  },
  recordButton: {
    position: 'absolute',
    bottom: 400,
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    backgroundColor: 'red',
    borderRadius: 10,
  },
  recordingButton: {
    backgroundColor: '#ff4444',
    transform: [{ scale: 1.1 }],
  },
  recordText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
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
  },
  preview: {
    width: 120,
    height: 160,
  },
});