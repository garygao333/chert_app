import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

export interface VoiceRecordingResult {
  transcript: string;
  confidence: number;
  duration: number;
}

export class VoiceService {
  private static recording: Audio.Recording | null = null;
  private static isRecording = false;

  /**
   * Start voice recording
   */
  static async startRecording(): Promise<boolean> {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required for voice recording. Please enable it in your device settings.'
        );
        return false;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Start recording
      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await this.recording.startAsync();
      
      this.isRecording = true;
      console.log('Voice recording started');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start voice recording. Please try again.');
      return false;
    }
  }

  /**
   * Stop voice recording and get the audio file
   */
  static async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording || !this.isRecording) {
        console.warn('No recording in progress');
        return null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      this.recording = null;
      this.isRecording = false;
      
      console.log('Voice recording stopped, file:', uri);
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop voice recording.');
      return null;
    }
  }

  /**
   * Check if currently recording
   */
  static getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Process recorded audio file to text (mock implementation)
   * In a real app, you'd send this to a speech-to-text service like Google Speech API,
   * Azure Speech Services, or AWS Transcribe
   */
  static async processAudioToText(audioUri: string): Promise<VoiceRecordingResult> {
    try {
      // This is a mock implementation
      // In reality, you would:
      // 1. Upload the audio file to a speech-to-text service
      // 2. Get the transcription result
      // 3. Return the transcript with confidence score
      
      console.log('Processing audio file:', audioUri);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock response - in reality this would come from the speech service
      const mockTranscripts = [
        "Found ceramic fragment at depth 25 centimeters in grid square B4, red clay material, 4 centimeter diameter, good condition",
        "Soil sample from location A3, sandy texture, pH level 7.5, moisture content high",
        "Stone tool discovered, limestone material, sharp cutting edge, length 12 centimeters, width 3 centimeters",
        "Bone fragment located at grid C2, depth 18 centimeters, well preserved condition, approximately 8 centimeters long",
        "Metal artifact found, copper material, corroded surface, circular shape, diameter 5 centimeters"
      ];
      
      const randomTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
      
      return {
        transcript: randomTranscript,
        confidence: 0.85 + Math.random() * 0.1, // Mock confidence between 0.85-0.95
        duration: 3.5 + Math.random() * 2 // Mock duration between 3.5-5.5 seconds
      };
      
    } catch (error) {
      console.error('Error processing audio:', error);
      throw new Error('Failed to process voice recording');
    }
  }

  /**
   * Speak text using text-to-speech (for feedback)
   */
  static async speakText(text: string): Promise<void> {
    try {
      await Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  }

  /**
   * Stop any ongoing speech
   */
  static async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  /**
   * Clean up resources
   */
  static async cleanup(): Promise<void> {
    try {
      if (this.isRecording && this.recording) {
        await this.stopRecording();
      }
      await Speech.stop();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Get available speech-to-text services configuration
   * This would be used to configure actual speech services
   */
  static getSTTConfig() {
    return {
      // Example configuration for different services
      google: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_SPEECH_API_KEY,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
      },
      azure: {
        subscriptionKey: process.env.EXPO_PUBLIC_AZURE_SPEECH_KEY,
        region: process.env.EXPO_PUBLIC_AZURE_SPEECH_REGION,
        language: 'en-US',
      },
      aws: {
        accessKeyId: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY,
        region: process.env.EXPO_PUBLIC_AWS_REGION,
        languageCode: 'en-US',
      }
    };
  }
}

// Note: To implement real speech-to-text, you would:
// 1. Choose a service (Google Speech-to-Text, Azure Speech Services, AWS Transcribe, etc.)
// 2. Set up API keys in your environment variables
// 3. Replace the mock processAudioToText function with actual API calls
// 4. Handle different audio formats and quality settings
// 5. Add error handling for network issues and API limits