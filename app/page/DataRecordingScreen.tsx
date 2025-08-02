import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, RecordMetadata } from '../types';
import { ApiService } from '../services/api';

type DataRecordingNavigationProp = StackNavigationProp<RootStackParamList>;
type DataRecordingRouteProp = RouteProp<RootStackParamList, 'DataRecording'>;

interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    suggestedFields?: string[];
    audioFile?: string;
    imageFiles?: string[];
  };
}

interface DataField {
  name: string;
  value: string;
  confidence: number;
  source: 'voice' | 'image' | 'manual';
}

export default function DataRecordingScreen() {
  const navigation = useNavigation<DataRecordingNavigationProp>();
  const route = useRoute<DataRecordingRouteProp>();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hi! I\'m your AI archaeological assistant. I can help you record field data through voice, photos, or text. What would you like to document today?',
      timestamp: new Date(),
    }
  ]);
  const [currentRecord, setCurrentRecord] = useState<DataField[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [workflowPlan, setWorkflowPlan] = useState<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const { projectId, tableName } = route.params;

  // Initialize audio permissions and test backend connection
  useEffect(() => {
    (async () => {
      // Test backend connection first
      try {
        const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://10.31.38.209:8000';
        console.log('Testing backend connection to:', API_URL);
        
        const response = await fetch(`${API_URL}/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Backend connected successfully:', data);
        
        // Add system message about backend status
        const backendMessage: ConversationMessage = {
          id: 'backend-status',
          type: 'system',
          content: `🔗 Backend connected successfully!\n\nServer: ${API_URL}\nStatus: ${data.status}\n\n✅ Voice AI agent is ready for mobile use!`,
          timestamp: new Date(),
        };
        setConversation(prev => [...prev, backendMessage]);
      } catch (error) {
        console.error('Backend connection failed:', error);
        
        const errorMessage: ConversationMessage = {
          id: 'backend-error',
          type: 'system',
          content: `❌ Backend connection failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n💡 Troubleshooting:\n• Make sure the backend server is running\n• Check if your device is on the same WiFi network\n• Try restarting the Expo development server`,
          timestamp: new Date(),
        };
        setConversation(prev => [...prev, errorMessage]);
      }

      // Request audio permissions
      try {
        console.log('Requesting audio permissions...');
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Audio recording permission is required for voice input.');
        }
      } catch (error) {
        console.error('Audio permission error:', error);
      }
    })();
  }, []);

  const updateCurrentRecord = (extractedData: any, confidence: number) => {
    setCurrentRecord(prev => {
      const merged = [...prev];
      
      Object.entries(extractedData).forEach(([key, value]) => {
        if (value && value !== '') {
          const existingIndex = merged.findIndex(field => field.name === key);
          const field: DataField = {
            name: key,
            value: String(value),
            confidence,
            source: 'voice'
          };
          
          if (existingIndex >= 0) {
            merged[existingIndex] = field;
          } else {
            merged.push(field);
          }
        }
      });
      return merged;
    });
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      
      // Animate recording button
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      console.log('Starting audio recording...');
      
      // Check current permissions status first
      const { status: currentStatus } = await Audio.getPermissionsAsync();
      console.log('🔐 Current audio permissions:', currentStatus);
      
      if (currentStatus !== 'granted') {
        console.log('🔐 Requesting audio permissions...');
        const { status: newStatus } = await Audio.requestPermissionsAsync();
        console.log('🔐 Audio permissions after request:', newStatus);
        
        if (newStatus !== 'granted') {
          throw new Error('Audio recording permission not granted');
        }
      }
      
      // Configure audio recording with minimal settings for maximum compatibility
      console.log('🔧 Setting minimal audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      console.log('✅ Audio mode set successfully');

      // Use the most basic recording options - no customization
      console.log('🔧 Using basic LOW_QUALITY preset...');
      const recordingOptions = Audio.RecordingOptionsPresets.LOW_QUALITY;

      console.log('🔧 Recording options:', JSON.stringify(recordingOptions, null, 2));
      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(newRecording);
      
      // Get recording status immediately after creation
      try {
        const status = await newRecording.getStatusAsync();
        console.log('📊 Recording status after creation:', JSON.stringify(status, null, 2));
      } catch (error) {
        console.warn('Could not get recording status:', error);
      }

      console.log('🎤 Recording started successfully!');
    } catch (error) {
      console.error('Recording start failed:', error);
      setIsRecording(false);
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
      Alert.alert('Recording Error', `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      console.warn('No recording to stop');
      return;
    }

    try {
      setIsRecording(false);
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
      setIsProcessing(true);

      console.log('Stopping recording...');
      
      // Check recording status before stopping
      try {
        const statusBeforeStop = await recording.getStatusAsync();
        console.log('📊 Recording status before stop:', JSON.stringify(statusBeforeStop, null, 2));
      } catch (error) {
        console.warn('Could not get recording status before stop:', error);
      }
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        console.log('✅ Recording URI:', uri);
        
        // Process the audio with mobile-compatible file handling
        try {
          console.log('📁 Processing audio file for mobile...');
          
          // Create a mobile-compatible file object
          const fileInfo = {
            uri: uri,
            type: 'audio/m4a',
            name: 'recording.m4a',
          };
          
          console.log('📤 Sending audio file to backend...');
          console.log('📁 File info:', fileInfo);
          
          // Process with voice agent using mobile file object
          const result = await ApiService.processVoiceInputMobile(fileInfo, projectId);
          
          const userMessage: ConversationMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: result.transcription,
            timestamp: new Date(),
            metadata: {
              confidence: result.confidence,
              audioFile: uri
            }
          };
          
          setConversation(prev => [...prev, userMessage]);
          
          // Always show the LLM response if we have reasoning
          let assistantContent = '';
          
          if (result.reasoning && result.reasoning.trim()) {
            // Use the LLM's reasoning/response as the main content
            assistantContent = result.reasoning;
          } else if (result.extracted_data && Object.keys(result.extracted_data).length > 0) {
            // Fallback to showing extracted data if no reasoning provided
            assistantContent = `I extracted: ${Object.entries(result.extracted_data).map(([key, value]) => `${key}: ${value}`).join(', ')}`;
          } else {
            // Fallback message
            assistantContent = 'I received your message but couldn\'t extract any data or provide a specific response.';
          }
          
          const assistantMessage: ConversationMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: assistantContent,
            timestamp: new Date(),
            metadata: {
              confidence: result.confidence,
              suggestedFields: result.extracted_data ? Object.keys(result.extracted_data) : []
            }
          };
          
          setConversation(prev => [...prev, assistantMessage]);
          
          // Update current record only if we have extracted data
          if (result.extracted_data && Object.keys(result.extracted_data).length > 0) {
            updateCurrentRecord(result.extracted_data, result.confidence);
          }
        } catch (error) {
          console.error('Audio processing failed:', error);
          Alert.alert('Processing Error', `Failed to process audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.error('❌ No URI returned from recording');
        Alert.alert('Recording Error', 'No audio file was created during recording.');
      }
    } catch (error) {
      console.error('Stop recording failed:', error);
      Alert.alert('Recording Error', `Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setRecording(null);
    setIsProcessing(false);
  };

  const sendTextMessage = async () => {
    if (!textInput.trim()) return;
    
    const message = textInput.trim();
    setTextInput('');
    setIsProcessing(true);
    
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date(),
    };
    
    setConversation(prev => [...prev, userMessage]);
    
    try {
      // Process text through the backend
      const result = await ApiService.processTextInput(message, projectId);
      
      // Always show the LLM response if we have reasoning
      let assistantContent = '';
      
      if (result.reasoning && result.reasoning.trim()) {
        // Use the LLM's reasoning/response as the main content
        assistantContent = result.reasoning;
      } else if (result.extracted_data && Object.keys(result.extracted_data).length > 0) {
        // Fallback to showing extracted data if no reasoning provided
        assistantContent = `I extracted: ${Object.entries(result.extracted_data).map(([key, value]) => `${key}: ${value}`).join(', ')}`;
      } else {
        // Fallback message
        assistantContent = 'I received your message but couldn\'t extract any data or provide a specific response.';
      }
      
      const assistantMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        metadata: {
          confidence: result.confidence,
          suggestedFields: result.extracted_data ? Object.keys(result.extracted_data) : []
        }
      };
      
      setConversation(prev => [...prev, assistantMessage]);
      
      // Update current record only if we have extracted data
      if (result.extracted_data && Object.keys(result.extracted_data).length > 0) {
        updateCurrentRecord(result.extracted_data, result.confidence);
      }
    } catch (error) {
      console.error('Text processing failed:', error);
      Alert.alert('Processing Error', `Failed to process text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsProcessing(false);
  };

  const addPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const photoMessage: ConversationMessage = {
          id: Date.now().toString(),
          type: 'user',
          content: '📷 Photo added',
          timestamp: new Date(),
          metadata: {
            imageFiles: [result.assets[0].uri]
          }
        };
        
        setConversation(prev => [...prev, photoMessage]);
      }
    } catch (error) {
      console.error('Photo error:', error);
      Alert.alert('Photo Error', 'Failed to add photo');
    }
  };

  const commitRecord = () => {
    if (currentRecord.length === 0) {
      Alert.alert('No Data', 'Please record some data before committing.');
      return;
    }

    Alert.alert(
      'Commit Record',
      `Commit ${currentRecord.length} fields to the database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Commit',
          onPress: async () => {
            try {
              console.log('Committing record:', currentRecord);
              
              const metadata: RecordMetadata = {
                recordingMethod: 'voice',
                reasoning: `Processed ${currentRecord.length} fields from user input`,
              };
              
              console.log('Record committed with metadata:', metadata);
              
              const successMessage: ConversationMessage = {
                id: Date.now().toString(),
                type: 'system',
                content: `✅ Record committed successfully! Saved ${currentRecord.length} fields to ${tableName}.`,
                timestamp: new Date(),
              };
              
              setConversation(prev => [...prev, successMessage]);
              
              // Clear current record
              setCurrentRecord([]);
              
              // Navigate back after a short delay
              setTimeout(() => {
                navigation.goBack();
              }, 1500);
            } catch (error) {
              console.error('Commit error:', error);
              Alert.alert('Error', 'Failed to commit record. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getGPSLocation = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required to add GPS coordinates.');
        return;
      }

      setIsProcessing(true);
      const location = await Location.getCurrentPositionAsync({});
      
      const gpsMessage: ConversationMessage = {
        id: Date.now().toString(),
        type: 'system',
        content: `📍 GPS location recorded: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`,
        timestamp: new Date(),
      };
      
      setConversation(prev => [...prev, gpsMessage]);
      
      // Add GPS coordinates to current record
      const gpsField: DataField = {
        name: 'gps_coordinates',
        value: `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`,
        confidence: 1.0,
        source: 'manual'
      };
      
      setCurrentRecord(prev => [...prev, gpsField]);
      setIsProcessing(false);
    } catch (error) {
      console.error('GPS error:', error);
      Alert.alert('GPS Error', 'Failed to get current location');
      setIsProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FF9800';
    return '#F44336';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['rgba(239, 145, 68, 0.9)', 'rgba(254, 126, 66, 0.7)']}
        style={styles.header}
      >
        <Text style={styles.title}>Record Data</Text>
        <Text style={styles.subtitle}>Speak naturally or type your observations</Text>
      </LinearGradient>

      {/* Conversation */}
      <ScrollView style={styles.conversation} showsVerticalScrollIndicator={false}>
        {conversation.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.type === 'user' ? styles.userMessage : styles.assistantMessage
            ]}
          >
            <Text style={[
              styles.messageText,
              message.type === 'user' ? styles.userMessageText : styles.assistantMessageText
            ]}>
              {message.content}
            </Text>
            {message.metadata?.confidence && (
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceText}>
                  Confidence: {Math.round(message.metadata.confidence * 100)}%
                </Text>
                <View style={[
                  styles.confidenceBar,
                  { backgroundColor: getConfidenceColor(message.metadata.confidence) }
                ]} />
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Current Record Summary */}
      {currentRecord.length > 0 && (
        <View style={styles.currentRecord}>
          <Text style={styles.currentRecordTitle}>Current Record ({currentRecord.length} fields)</Text>
          {currentRecord.slice(0, 3).map((field, index) => (
            <Text key={index} style={styles.currentRecordField}>
              {field.name}: {field.value} ({Math.round(field.confidence * 100)}%)
            </Text>
          ))}
          {currentRecord.length > 3 && (
            <Text style={styles.currentRecordMore}>+{currentRecord.length - 3} more fields</Text>
          )}
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={textInput}
            onChangeText={setTextInput}
            placeholder="Type your observations..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendTextMessage}
            disabled={!textInput.trim() || isProcessing}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={addPhoto}>
            <Ionicons name="camera" size={20} color="#666" />
            <Text style={styles.actionButtonText}>Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={getGPSLocation} disabled={isProcessing}>
            <Ionicons name="location" size={20} color="#666" />
            <Text style={styles.actionButtonText}>GPS</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, currentRecord.length > 0 && styles.actionButtonActive]}
            onPress={commitRecord}
            disabled={currentRecord.length === 0}
          >
            <Ionicons name="save" size={20} color={currentRecord.length > 0 ? "#fff" : "#666"} />
            <Text style={[styles.actionButtonText, currentRecord.length > 0 && styles.actionButtonActiveText]}>
              Commit
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recording Button */}
        <View style={styles.recordingContainer}>
          <Animated.View style={[styles.recordingButton, { transform: [{ scale: scaleAnim }] }]}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordingButtonActive,
                isProcessing && styles.processingButton
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              <Ionicons
                name={isProcessing ? "cog" : isRecording ? "stop" : "mic"}
                size={32}
                color="#fff"
              />
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.recordingText}>
            {isProcessing ? 'Processing...' : isRecording ? 'Recording...' : 'Tap to record'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  conversation: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#333',
  },
  confidenceContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
  },
  confidenceBar: {
    width: 30,
    height: 3,
    borderRadius: 2,
    marginLeft: 8,
  },
  currentRecord: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  currentRecordTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  currentRecordField: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  currentRecordMore: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 80,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  actionButtonActive: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  actionButtonActiveText: {
    color: '#fff',
  },
  recordingContainer: {
    alignItems: 'center',
  },
  recordingButton: {
    marginBottom: 8,
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButtonActive: {
    backgroundColor: '#F44336',
  },
  processingButton: {
    backgroundColor: '#FF9800',
  },
  recordingText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
