# Voice Recognition Setup

The Chert app now includes a real speech-to-text system using OpenAI's Whisper API for accurate transcription of voice recordings.

## Features

✅ **Real Speech-to-Text**: Uses OpenAI Whisper API for accurate transcription  
✅ **Enhanced Fallback**: Intelligent mock system that analyzes actual audio files  
✅ **Automatic Switching**: Seamlessly switches between real and mock transcription  
✅ **Field-Optimized**: Optimized for archaeological and scientific field work terminology  

## Setup Instructions

### Option 1: Enable Real Speech-to-Text (Recommended)

1. **Get an OpenAI API Key**
   - Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Create an account or sign in
   - Generate a new API key
   - Copy the key (starts with `sk-...`)

2. **Configure the App**
   - Copy `.env.example` to `.env` in the app directory
   - Add your API key: `EXPO_PUBLIC_OPENAI_API_KEY=sk-your-key-here`
   - Restart the Expo development server

3. **Test Voice Recording**
   - Open a project with data columns defined
   - Tap the microphone button to record
   - Speak clearly about your observations
   - The app will transcribe your speech and extract relevant data

### Option 2: Use Enhanced Mock System

If you don't have an OpenAI API key, the app automatically uses an enhanced mock transcription system that:

- Analyzes actual audio file characteristics (size, duration)
- Provides realistic field work transcriptions
- Simulates processing time based on audio quality
- Returns consistent results for the same recording

## How It Works

1. **Recording**: Uses Expo AV to record high-quality audio
2. **Processing**: Sends audio to OpenAI Whisper API (or uses enhanced mock)
3. **Transcription**: Returns accurate text with confidence scores
4. **Data Extraction**: Uses local AI to map speech to project data fields
5. **Storage**: Saves structured data to Firebase

## Supported Audio Formats

- iOS: M4A (default), WAV
- Android: M4A, AAC
- Quality: High quality recording for best transcription results

## Troubleshooting

**Audio not transcribing?**
- Check microphone permissions
- Ensure stable internet connection (for real API)
- Verify OpenAI API key is correct
- Check console logs for error details

**Poor transcription quality?**
- Speak clearly and slowly
- Record in quiet environment
- Hold device close to mouth
- Use shorter recordings (under 30 seconds)

**API costs?**
- Whisper API costs ~$0.006 per minute
- 1 hour of recordings ≈ $0.36
- Enhanced mock is completely free

## Privacy & Security

- Audio files are temporarily processed by OpenAI
- No audio files are permanently stored
- Transcriptions are processed locally after receiving text
- Only structured data is saved to your Firebase database

## Alternative Services

The system is designed to easily support other speech-to-text services:

- **Google Cloud Speech-to-Text**: Enterprise-grade, multiple languages
- **Azure Speech Services**: Microsoft's offering with custom models
- **AWS Transcribe**: Amazon's service with real-time capabilities
- **AssemblyAI**: Specialized for conversation and meeting transcription

Contact the development team if you need integration with a specific service.