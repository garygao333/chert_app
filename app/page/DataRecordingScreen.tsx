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
        const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';
        console.log('Testing backend connection to:', API_URL);
        
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        console.log('Backend connected:', data);
        
        // Add system message about backend status
        const backendMessage: ConversationMessage = {
          id: 'backend-status',
          type: 'system',
          content: `🔗 Backend connected! Voice AI agent is ready.\n\nServer: ${API_URL}\nStatus: ${data.status}`,
          timestamp: new Date(),
        };
        setConversation(prev => [...prev, backendMessage]);
      } catch (error) {
        console.error('Backend connection failed:', error);
        const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';
        const errorMessage: ConversationMessage = {
          id: 'backend-error',
          type: 'system',
          content: `⚠️ Backend connection failed.\n\nTrying to connect to: ${API_URL}\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        };
        setConversation(prev => [...prev, errorMessage]);
      }

      // Request audio permissions
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Audio recording permission is required to use voice input.');
        } else {
          console.log('Audio permissions granted');
        }
      } catch (error) {
        console.error('Permission request failed:', error);
      }
    })();
  }, []);

  // Helper functions
  const generateAssistantResponse = (result: any): string => {
    // Check if this is a question/informational response
    if (result.reasoning && result.workflow_plan?.status === 'completed' && result.workflow_plan?.steps?.includes('provide_information')) {
      // Clean up the formatting for React Native
      return result.reasoning.replace(/\*\*/g, '').replace(/\n\n/g, '\n');
    }
    
    if (!result.extracted_data || Object.keys(result.extracted_data).length === 0) {
      // Check if we have reasoning to display for questions or no-data scenarios
      if (result.reasoning && result.reasoning.includes('couldn\'t extract')) {
        return result.reasoning;
      }
      
      return `I heard: "${result.transcription}"\n\nI'm analyzing this information. Could you provide more details about what you found?`;
    }

    const fields = Object.entries(result.extracted_data)
      .map(([key, value]) => `• ${key.replace(/_/g, ' ')}: ${value}`)
      .join('\n');

    let response = `Great! I've extracted the following information:\n\n${fields}\n\n`;
    
    if (result.confidence < 0.7) {
      response += "I'm not entirely confident about some details. Could you clarify or confirm?";
    } else if (result.workflow_plan?.steps?.length > 0) {
      response += `${result.reasoning}\n\nNext steps: ${result.workflow_plan.steps.map((s: any) => s.prompt || s.type).join(', ')}`;
    } else {
      response += "Does this look correct? Should I commit this record to the database?";
    }

    return response;
  };

  const updateCurrentRecord = (extractedData: Record<string, any>, confidence: number) => {
    const newFields: DataField[] = Object.entries(extractedData).map(([key, value]) => ({
      name: key,
      value: String(value),
      confidence: confidence,
      source: 'voice' as const
    }));

    setCurrentRecord(prev => {
      // Merge with existing fields, updating if field exists
      const merged = [...prev];
      newFields.forEach(newField => {
        const existingIndex = merged.findIndex(f => f.name === newField.name);
        if (existingIndex >= 0) {
          merged[existingIndex] = newField;
        } else {
          merged.push(newField);
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
      
      // Configure audio recording with proper iOS settings
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      // Simplified recording options that work on both platforms
      const recordingOptions = Audio.RecordingOptionsPresets.HIGH_QUALITY;

      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(newRecording);
      
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Recording Error', `Failed to start audio recording: ${errorMessage}`);
      setIsRecording(false);
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      setIsProcessing(true);
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);

      console.log('Stopping recording...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        console.log('Recording stopped, processing audio...');
        
        // Convert audio file to blob for API
        const response = await fetch(uri);
        const audioBlob = await response.blob();
        
        // Process with backend AI
        const result = await ApiService.processVoiceInput(audioBlob, projectId);
        
        // Add user message (transcription)
        const userMessage: ConversationMessage = {
          id: Date.now().toString(),
          type: 'user',
          content: result.transcription,
          timestamp: new Date(),
          metadata: {
            confidence: result.confidence,
            audioFile: uri,
          }
        };

        // Generate assistant response based on AI analysis
        const assistantContent = generateAssistantResponse(result);
        const assistantMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: assistantContent,
          timestamp: new Date(),
          metadata: {
            confidence: result.confidence,
            suggestedFields: result.suggested_fields,
          }
        };

        setConversation(prev => [...prev, userMessage, assistantMessage]);
        
        // Update current record with extracted data
        updateCurrentRecord(result.extracted_data, result.confidence);
        
        // Store workflow plan if provided
        if (result.workflow_plan) {
          setWorkflowPlan(result.workflow_plan);
        }
      }
      
      setRecording(null);
      setIsProcessing(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Processing Error', 'Failed to process audio recording');
      setIsProcessing(false);
      setRecording(null);
    }
  };

  const sendTextMessage = async () => {
    if (!textInput.trim()) return;

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: textInput,
      timestamp: new Date(),
    };

    setConversation(prev => [...prev, userMessage]);
    const inputText = textInput;
    setTextInput('');
    setIsProcessing(true);

    try {
      // Create a text-to-speech audio for processing
      // For now, we'll send text directly to a text processing endpoint
      // In the future, we could convert text to audio and use the voice pipeline
      
      // Mock audio blob for text input - this is a temporary solution
      // The backend should have a separate text processing endpoint
      const textBlob = new Blob([inputText], { type: 'text/plain' });
      
      // For now, we'll simulate the AI response
      // TODO: Create a separate text processing endpoint in the backend
      setTimeout(async () => {
        try {
          // Simulate AI processing of text input
          const mockResult = {
            transcription: inputText,
            extracted_data: extractDataFromText(inputText),
            confidence: 0.9,
            suggested_fields: ['artifact_type', 'material', 'color', 'dimensions'],
            reasoning: 'Text input processed and analyzed for archaeological data'
          };

          const assistantContent = generateAssistantResponse(mockResult);
          const assistantMessage: ConversationMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: assistantContent,
            timestamp: new Date(),
            metadata: {
              confidence: mockResult.confidence,
              suggestedFields: mockResult.suggested_fields,
            }
          };
          
          setConversation(prev => [...prev, assistantMessage]);
          updateCurrentRecord(mockResult.extracted_data, mockResult.confidence);
          setIsProcessing(false);
        } catch (error) {
          console.error('Text processing error:', error);
          const errorMessage: ConversationMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: 'I had trouble processing that text. Could you try rephrasing or speaking instead?',
            timestamp: new Date(),
          };
          setConversation(prev => [...prev, errorMessage]);
          setIsProcessing(false);
        }
      }, 1500);
    } catch (error) {
      console.error('Text message error:', error);
      setIsProcessing(false);
    }
  };

  // Simple text analysis function
  const extractDataFromText = (text: string): Record<string, any> => {
    const data: Record<string, any> = {};
    const lowerText = text.toLowerCase();

    // Simple pattern matching for common archaeological terms
    if (lowerText.includes('ceramic') || lowerText.includes('pottery')) {
      data.artifact_type = 'Ceramic';
      data.material = 'Ceramic';
    } else if (lowerText.includes('stone') || lowerText.includes('lithic')) {
      data.artifact_type = 'Lithic';
      data.material = 'Stone';
    } else if (lowerText.includes('metal') || lowerText.includes('bronze') || lowerText.includes('iron')) {
      data.artifact_type = 'Metal';
      data.material = 'Metal';
    }

    // Extract dimensions
    const dimensionMatch = text.match(/(\d+(?:\.\d+)?)\s*(cm|mm|m)/i);
    if (dimensionMatch) {
      data.dimensions = `${dimensionMatch[1]}${dimensionMatch[2]}`;
    }

    // Extract colors
    const colors = ['red', 'brown', 'black', 'white', 'gray', 'grey', 'yellow', 'orange', 'blue', 'green'];
    colors.forEach(color => {
      if (lowerText.includes(color)) {
        data.color = color.charAt(0).toUpperCase() + color.slice(1);
      }
    });

    // Extract context information
    if (lowerText.includes('surface') || lowerText.includes('ground')) {
      data.context = 'Surface find';
    } else if (lowerText.includes('layer') || lowerText.includes('level')) {
      data.context = 'Stratigraphic context';
    }

    return data;
  };

  const takePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setIsProcessing(true);

        // Add user message about taking photo
        const photoMessage: ConversationMessage = {
          id: Date.now().toString(),
          type: 'user',
          content: '📸 Photo taken',
          timestamp: new Date(),
          metadata: {
            imageFiles: [imageUri],
          }
        };
        setConversation(prev => [...prev, photoMessage]);

        try {
          // Process image with backend AI
          const imageResult = await ApiService.processImage(imageUri, projectId);
          
          // Generate response based on image analysis
          let content = 'I\'ve analyzed your photo. ';
          if (imageResult.detections && imageResult.detections.length > 0) {
            content += `I detected ${imageResult.detections.length} objects:\n\n`;
            imageResult.detections.forEach((detection, index) => {
              content += `• ${detection.label} (${Math.round(detection.confidence * 100)}% confidence)\n`;
            });
          }
          
          if (imageResult.extracted_data && Object.keys(imageResult.extracted_data).length > 0) {
            content += '\nExtracted data:\n';
            Object.entries(imageResult.extracted_data).forEach(([key, value]) => {
              content += `• ${key.replace(/_/g, ' ')}: ${value}\n`;
            });
          }

          const assistantMessage: ConversationMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: content || 'I\'ve processed your photo. Could you tell me more about what I\'m looking at?',
            timestamp: new Date(),
            metadata: {
              confidence: imageResult.confidence,
            }
          };

          setConversation(prev => [...prev, assistantMessage]);
          
          // Update current record with image data
          if (imageResult.extracted_data) {
            updateCurrentRecord(imageResult.extracted_data, imageResult.confidence);
          }
          
          setIsProcessing(false);
        } catch (error) {
          console.error('Image processing error:', error);
          const errorMessage: ConversationMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: 'I had trouble analyzing the photo. The image has been saved, but you may need to describe what you see.',
            timestamp: new Date(),
          };
          setConversation(prev => [...prev, errorMessage]);
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Camera Error', 'Failed to access camera');
      setIsProcessing(false);
    }
  };

  const commitRecord = async () => {
    if (currentRecord.length === 0) {
      Alert.alert('No Data', 'Please record some data before committing.');
      return;
    }

    Alert.alert(
      'Commit Record',
      'Are you sure you want to commit this record to the database?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Commit',
          onPress: async () => {
            try {
              // Convert current record to the format expected by the API
              const recordData: Record<string, any> = {};
              currentRecord.forEach(field => {
                recordData[field.name] = field.value;
              });

              // Calculate average confidence
              const averageConfidence = currentRecord.reduce((sum, field) => sum + field.confidence, 0) / currentRecord.length;

              // Determine primary recording method
              const sourceCounts = currentRecord.reduce((counts, field) => {
                counts[field.source] = (counts[field.source] || 0) + 1;
                return counts;
              }, {} as Record<string, number>);
              
              const primarySource = Object.entries(sourceCounts)
                .sort(([,a], [,b]) => b - a)[0][0] as 'voice' | 'image' | 'manual';

              // Create metadata object matching frontend RecordMetadata interface
              const metadata: RecordMetadata = {
                recordingMethod: primarySource,
                location: undefined, // TODO: Add GPS coordinates if available
                audioFile: undefined, // TODO: Add audio file reference if available
                imageFiles: undefined, // TODO: Add image file references if available
                reasoning: `Data collected via ${primarySource} input with ${currentRecord.length} fields`,
                userFeedback: undefined,
              };

              // Create data record via API
              await ApiService.createDataRecord({
                projectId: projectId,
                tableName: tableName || 'samples',
                data: recordData,
                metadata: metadata,
                confidence: averageConfidence,
              });

              Alert.alert('Success', 'Record committed successfully!');
              
              // Add success message to conversation
              const successMessage: ConversationMessage = {
                id: Date.now().toString(),
                type: 'system',
                content: '✅ Record committed to database successfully!',
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

  // Test function to verify backend voice agent works
  const testVoiceAgent = async () => {
    setIsProcessing(true);
    
    try {
      // Get API URL from config
      const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8000';
      
      // Create a simple test audio blob (empty for now)
      const testText = "I found a ceramic sherd, 5 cm diameter, reddish brown color";
      
      // For testing, we'll create a mock audio file
      const testBlob = new Blob([testText], { type: 'audio/wav' });
      
      console.log('Testing voice agent with mock data...');
      console.log('API URL:', API_URL);
      
      // Use a valid test UUID or the actual projectId if it's valid
      const testProjectId = projectId?.length === 36 ? projectId : '550e8400-e29b-41d4-a716-446655440000';
      
      // Test the backend API directly
      const formData = new FormData();
      formData.append('audio_file', testBlob, 'test.wav');
      formData.append('project_id', testProjectId);
      
      const response = await fetch(`${API_URL}/voice/process`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Voice agent response:', result);
      
      // Add the results to conversation
      const testMessage: ConversationMessage = {
        id: Date.now().toString(),
        type: 'system',
        content: `🧪 Backend Test Results:\n\nTranscription: ${result.transcription}\nExtracted Data: ${JSON.stringify(result.extracted_data, null, 2)}\nConfidence: ${result.confidence}\nReasoning: ${result.reasoning}`,
        timestamp: new Date(),
      };
      
      setConversation(prev => [...prev, testMessage]);
      
      if (result.extracted_data) {
        updateCurrentRecord(result.extracted_data, result.confidence || 0.8);
      }
      
    } catch (error) {
      console.error('Voice agent test failed:', error);
      const errorMessage: ConversationMessage = {
        id: Date.now().toString(),
        type: 'system',
        content: `❌ Backend test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, errorMessage]);
    }
    
    setIsProcessing(false);
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
        
        {isProcessing && (
          <View style={styles.processingContainer}>
            <Text style={styles.processingText}>Processing your input...</Text>
            <View style={styles.processingDots}>
              <Text style={styles.dot}>●</Text>
              <Text style={styles.dot}>●</Text>
              <Text style={styles.dot}>●</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Current Record Preview */}
      {currentRecord.length > 0 && (
        <View style={styles.recordPreview}>
          <Text style={styles.recordTitle}>Current Record</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.fieldsContainer}>
              {currentRecord.map((field, index) => (
                <View key={index} style={styles.fieldItem}>
                  <Text style={styles.fieldName}>{field.name}</Text>
                  <Text style={styles.fieldValue}>{field.value}</Text>
                  <View style={styles.fieldMeta}>
                    <Ionicons 
                      name={field.source === 'voice' ? 'mic' : field.source === 'image' ? 'camera' : 'create'}
                      size={12} 
                      color="#666" 
                    />
                    <Text style={[
                      styles.confidenceText,
                      { color: getConfidenceColor(field.confidence) }
                    ]}>
                      {Math.round(field.confidence * 100)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.commitButton} onPress={commitRecord}>
            <Text style={styles.commitButtonText}>Commit Record</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputArea}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your observations..."
            value={textInput}
            onChangeText={setTextInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendTextMessage}>
            <Ionicons name="send" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={takePhoto}>
            <Ionicons name="camera" size={24} color="#007AFF" />
            <Text style={styles.actionButtonText}>Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={testVoiceAgent}>
            <Ionicons name="flask" size={24} color="#FF6B35" />
            <Text style={styles.actionButtonText}>Test AI</Text>
          </TouchableOpacity>
          
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.recordingButton]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
            >
              <Ionicons 
                name={isRecording ? "stop" : "mic"} 
                size={32} 
                color="white" 
              />
            </TouchableOpacity>
          </Animated.View>
          
          <TouchableOpacity style={styles.actionButton} onPress={getGPSLocation}>
            <Ionicons name="location" size={24} color="#007AFF" />
            <Text style={styles.actionButtonText}>GPS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 248, 243, 0.95)', // Peach-white gradient base
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  conversation: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  messageContainer: {
    maxWidth: '80%',
    marginBottom: 15,
    padding: 12,
    borderRadius: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  assistantMessageText: {
    color: '#333',
  },
  confidenceContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  confidenceBar: {
    width: 40,
    height: 3,
    borderRadius: 1.5,
  },
  processingContainer: {
    alignSelf: 'center',
    padding: 15,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  processingText: {
    color: '#007AFF',
    fontSize: 14,
    marginRight: 10,
  },
  processingDots: {
    flexDirection: 'row',
  },
  dot: {
    color: '#007AFF',
    fontSize: 16,
    marginHorizontal: 2,
  },
  recordPreview: {
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  fieldsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  fieldItem: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
  },
  fieldName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  fieldMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commitButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  commitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  inputArea: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    padding: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
    minWidth: 60,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },
});
