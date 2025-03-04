import 'dotenv/config';

export default {
  expo: {
    name: "VisionAssistant",
    slug: "VisionAssistant",
    version: "1.0.0",
    extra: {
      EXPO_PUBLIC_OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || null,
      EXPO_PUBLIC_ELEVEN_LABS_API_KEY: process.env.EXPO_PUBLIC_ELEVEN_LABS_API_KEY || null,
    },
  },
};