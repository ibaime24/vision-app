import 'dotenv/config';

export default {
  expo: {
    name: "VisionAssistant",
    slug: "VisionAssistant",
    version: "1.0.0",
    extra: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      ELEVEN_LABS_API_KEY: process.env.ELEVEN_LABS_API_KEY,
    },
  },
};