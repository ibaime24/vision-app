# Son - AI-Powered Vision Assistance

I originally made this as a post grad project designed to help my visually impaired dad (also why I call it "Son"). However, seeing that functionally adjacent products are either being teased and never released or several hundred dollars, I decided to open source this. This product is designed to feel as if you have a real vision assistant with you at all times. For people who are visually competent, it's also a pretty easy and fun way to interface with AI tools. Meta's AI-powered glasses are currently going for upwards of nearly $400. If you use Son full-time (100 uses per week), this product will cost about $3 dollars per month. With Project Astra nowhere on the horizon, this tool can serve as a cheap and easy way to let visually impaired people interact with the world.

Please feel free to plug in your API keys and set this up on a friend or family member's phone! 

## Warning 

This product uses AI tools as the core driver of its intelligence. AI tools make mistakes and hallucinates. **Never use this tool to check anything related to your personal safety**. Do not use it on medicine labels, to check for food allergens in food, to cross the street, or anything else that could cause serious bodily harm. If anything could impact your health, independently verify it before moving forward. In short: if you wouldn't (or shouldn't) trust ChatGPT to do it, do not trust Son to do it.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or pnpm
- Expo Go app on your mobile device
- API keys for:
  - OpenAI
  - ElevenLabs

### Installation

1. Clone the repository
   ```bash
   git clone [https://github.com/ibaime24/vision-app]
   cd vision-assistant
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Set up environment variables

   Fill in your OpenAI and ElevenLabs API keys in the `.env` file (check env.example)

4. Start the app
   ```bash
   npx expo start
   ```

5. Scan the QR code with your mobile device using the Expo Go app

## How to Use

1. Open the app on your device
2. Press and hold anywhere on the screen
3. Ask your question while holding
4. Release to process
5. Wait for the audio response

## Cost Estimation

- Average cost per use: $0.0078
- Weekly cost (100+ uses): ~$0.78
- Monthly cost: ~$3.12
- Annual cost: ~$37.44

Example questions:
- "Is this banana ripe?"
- "What book is this?"
- "Is my shirt misbuttoned?"
- "Is my jacket blue?"

## Technical Details

This project uses Typescript, React Native, Expo, along with OpenAI and Elevenlabs APIs (Whisper and 4o-mini). This project is currently up to date with Expo 53, which released in early May 2025. This will continue to be updated, but issues may arise with newer releases. This project has only been physically tested on iPhones, so be cautious when using on Android devices.


## License

This project is licensed under the MIT License.


