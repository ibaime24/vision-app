# Cognition v1.0

An AI-powered vision assistant app designed to help visually impaired users understand their surroundings through voice interaction and image recognition.

## Overview

Cognition uses your device's camera and microphone to let you ask questions about what you see. Simply point your camera at something and ask a question - the app will:
1. Capture an image of what you're looking at
2. Record and transcribe your question
3. Send both to AI for analysis
4. Speak the answer back to you

## Features

- Real-time camera view with image capture
- Speech recognition for natural question asking
- GPT-4o Vision AI for image understanding
- High-quality text-to-speech responses
- Haptic feedback for improved accessibility
- Works on both iOS and Android devices

## Prerequisites

- Node.js (LTS version)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- API Keys:
  - OpenAI API key
  - ElevenLabs API key

## Installation

1. Clone the repository
   ```
   git clone [repository-url]
   cd Cognition
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your API keys
   ```
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key_here
   EXPO_PUBLIC_ELEVEN_LABS_API_KEY=your_elevenlabs_key_here
   ```

## Running the App

### Development Mode

1. Start the Expo development server
   ```
   npm start
   ```

2. Run on a physical device:
   - Install the Expo Go app on your iOS or Android device
   - Make sure your phone and computer are on the same WiFi network
   - On iOS: Scan the QR code with your device's camera
   - On Android: Scan the QR code with the Expo Go app
   - The app will open in Expo Go

3. Run on simulators:
   - iOS Simulator: Press `i` in the terminal
   - Android Emulator: Press `a` in the terminal

### Using the App

1. Grant camera and microphone permissions when prompted
2. Point your camera at an object or scene
3. Press and hold the screen
4. Ask your question while holding
5. Release to get your answer

## Building for Production

### Using Expo EAS

1. Install EAS CLI
   ```
   npm install -g eas-cli
   ```

2. Log in to your Expo account
   ```
   eas login
   ```

3. Configure your build
   ```
   eas build:configure
   ```

4. Build for iOS and/or Android
   ```
   eas build --platform ios
   eas build --platform android
   ```

5. Submit to stores
   ```
   eas submit --platform ios
   eas submit --platform android
   ```

## Technologies Used

- React Native
- Expo
- OpenAI API (GPT-4o Vision and Whisper)
- ElevenLabs API
- TypeScript

## Important Notes

- API usage may incur costs based on your OpenAI and ElevenLabs account plans
- The app requires camera and microphone permissions to function
- Best experience is on a physical device rather than simulators

## Troubleshooting

- If the app doesn't connect, ensure your phone and computer are on the same network
- Check your API keys if AI features aren't working
- For audio issues, check device volume and permissions

## License

[Your chosen license]


