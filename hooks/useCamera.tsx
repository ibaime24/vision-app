import { useRef, useState } from 'react';
import { CameraView, CameraCapturedPicture } from 'expo-camera';

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

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        console.log('[useCamera] Taking picture...');
        const capturedPic = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.2,        // Lower quality (0 to 1)
          imageType: 'jpg',    // Must be 'jpg' or 'png' in expo-camera
          skipProcessing: true // Do not skip additional processing (?)
        });

        if (capturedPic) {
          console.log('[useCamera] Picture captured successfully');
          console.log('[useCamera] Original image size:', calculateSizeInMB(capturedPic.base64).toFixed(2), 'MB');
          
          setPhotoUri(capturedPic.uri);
          
          // NOTE: MAY CAUSE LARGE ISSUES 
          // Reduce the quality of the image by 0.5. this is for processing purposes and should not affect the quality of the image
          const reducedQualityBase64 = capturedPic.base64 ? capturedPic.base64.substring(0, Math.floor(capturedPic.base64.length * 0.5)) : null;
          console.log('[useCamera] Reduced image size:', calculateSizeInMB(reducedQualityBase64).toFixed(2), 'MB');
          
          setPhotoBase64(reducedQualityBase64);

          return { //image and location
            uri: capturedPic.uri,
            base64: reducedQualityBase64
          };
        } else { //fail statement
          console.error('[useCamera] Failed to capture photo: capturedPic is undefined');
        }
      } catch (error) { //if anything goes wrong:
        console.error('[useCamera] Error taking photo:', error);
      }
    }
    return null;
  };

  return { cameraRef, photoUri, photoBase64, takePicture }; //return the cameraRef, photo location, image, and takePicture function
} 