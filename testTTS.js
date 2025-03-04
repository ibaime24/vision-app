require('dotenv').config(); // Load environment variables from .env
const fs = require('fs');

async function speakTest() {
  try {
    const voiceId = "21m00Tcm4TlvDq8ikWAM";
    const apiKey = process.env.ELEVEN_LABS_API_KEY;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'hey test',
        voice_settings: {
          stability: 0.5,        // Adjust these settings as desired
          similarity_boost: 0.5, // Adjust these settings as desired
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    // Get the response as an ArrayBuffer and convert it to a Node Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Write the audio data to a file (output.mp3)
    fs.writeFileSync('output.mp3', buffer);
    console.log('Audio saved as output.mp3');
  } catch (error) {
    console.error('Error during ElevenLabs TTS:', error);
  }
}

speakTest();

const { Audio } = require('expo-av');

async function playAudio() {
  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: 'file://output.mp3' },
      { shouldPlay: true }
    );

    // Optional: Clean up when done
    sound.setOnPlaybackStatusUpdate(status => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });

    console.log('Playing output.mp3');
  } catch (error) {
    console.error('Error playing audio:', error);
  }
}

playAudio();

