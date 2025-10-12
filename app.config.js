import 'dotenv/config';

export default {
  expo: {
    name: "VisionAssistant",
    slug: "VisionAssistant",
    version: "1.0.0",
    ios: {
      bundleIdentifier: "com.anonymous.VisionAssistant",
      supportsTablet: true
    },
    android: {
      package: "com.anonymous.VisionAssistant",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    plugins: [
      "expo-font",
      "expo-router",
      "expo-web-browser"
    ],
    extra: {
      EXPO_PUBLIC_OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || null,
      EXPO_PUBLIC_ELEVEN_LABS_API_KEY: process.env.EXPO_PUBLIC_ELEVEN_LABS_API_KEY || null,
    },
  },
};