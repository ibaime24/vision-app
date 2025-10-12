import { useRef, useState } from 'react';
import { CameraView, CameraCapturedPicture } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';

interface CameraResult {
  uri: string;
  base64: string | null;
}

const calculateSizeInMB = (base64String: string | null | undefined): number => {
  if (!base64String) return 0;
  // Calculate size in bytes: (base64 length * 3) / 4 gives approximate bytes
  const bytes = (base64String.length * 3) / 4;
  // Convert to MB
  return bytes / (1024 * 1024);
};

export function useCamera() {
  const cameraRef = useRef<CameraView | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const takePicture = async (): Promise<CameraResult | null> => {
    if (cameraRef.current) {
      try {
        console.log('[useCamera] Taking picture...');
        const capturedPic = await cameraRef.current.takePictureAsync({
          quality: 0.2,
          imageType: 'jpg',
        });

        if (capturedPic) {
          console.log('[useCamera] Picture captured successfully');
          
          // Save image to temp directory with compression
          const tempFilePath = `${FileSystem.cacheDirectory}temp_capture.jpg`;
          await FileSystem.copyAsync({
            from: capturedPic.uri,
            to: tempFilePath,
          });

          // Get file info for logging
          const fileInfo = await FileSystem.getInfoAsync(tempFilePath);
          if (fileInfo.exists) {
            console.log('[useCamera] Saved image size:', fileInfo.size / 1024 / 1024, 'MB');
          } else {
            console.log('[useCamera] File not found at:', tempFilePath);
          }

          // Read as base64
          const base64 = await FileSystem.readAsStringAsync(tempFilePath, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Remove the "data:image/jpeg;base64," prefix if it exists
          const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

          console.log('[useCamera] Base64 length:', cleanBase64.length);

          setPhotoUri(tempFilePath);
          setPhotoBase64(cleanBase64);

          console.log('[useCamera] Temp file path:', tempFilePath);

          return {
            uri: tempFilePath,
            base64: cleanBase64
          };
        }
      } catch (error) {
        console.error('[useCamera] Error taking photo:', error);
        throw error;
      }
    }
    return null;
  };
  return { 
    cameraRef, 
    photoUri, 
    photoBase64, 
    takePicture 
  };
} 