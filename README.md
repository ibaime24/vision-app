# Vision Assistant - AI-Powered Vision Assistance

A powerful, cost-effective vision assistance tool designed for visually impaired users and their families. This project provides real-time visual information through natural language processing, making it easier to understand and interact with the world.

## 🌟 Features

- **Simple Interaction**: Press and hold to ask questions about your surroundings
- **Natural Language**: Ask questions in plain English
- **Real-time Processing**: Get immediate responses about what you're looking at
- **Cost Effective**: Only $0.78 per week for 100+ uses
- **Accessible Design**: Built with visually impaired users in mind, designed to feel as if you have a full time assistant

## 💡 Use Cases

- Identifying objects and people
- Checking food freshness
- Finding items
- Understanding surroundings
- Educational assistance

## ‼️ Warning 

This product uses AI tools as the core driver of its intelligence. AI tools make mistakes. **Never use this tool to check anything related to your personal safety**. Do not use it on medicine labels, to check for food allergens in food, to cross the street, or anything else that could cause serious bodily harm. If anything could impact your health, independently verify it before moving forward. In short: if you wouldn't (or shouldn't) trust ChatGPT to do it, do not trust Son to do it.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or pnpm
- Expo Go app on your mobile device
- API keys for:
  - OpenAI
  - ElevenLabs
  - Whisper

### Installation

1. Clone the repository
   ```bash
   git clone [repository-url]
   cd vision-assistant
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   ```
   Fill in your OpenAI and ElevenLabs API keys in the `.env` file

4. Start the app
   ```bash
   npx expo start
   ```

5. Scan the QR code with your mobile device using the Expo Go app

## 💰 Cost Estimation

- Average cost per use: $0.0078
- Weekly cost (100+ uses): ~$0.78
- Monthly cost: ~$3.12
- Annual cost: ~$37.44

## 🎯 How to Use

1. Open the app on your device
2. Press and hold anywhere on the screen
3. Ask your question while holding
4. Release to process
5. Wait for the audio response

Example questions:
- "Is this banana ripe?"
- "What book is this?"
- "Is there someone in this room?"
- "What color is this shirt?"

## 🔧 Technical Details

### Architecture
- React Native with Expo
- TypeScript for type safety
- Multiple AI service integration
- Real-time audio processing
- Sophisticated animation system

### API Integration
- OpenAI for image and text processing
- Whisper for audio transcription
- ElevenLabs for natural speech synthesis

### Performance
- Optimized for real-time processing
- Efficient resource management
- Background processing support
- Memory optimization

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with love for visually impaired users
- Inspired by the need for accessible technology
- Made possible by the open-source community

## 📞 Support

For support, please:
1. Check the [documentation](docs/)
2. Open an issue
3. Join our community

## 🔐 Privacy

- All processing happens on your device
- No data is stored permanently
- API calls are made securely
- Your privacy is our priority

