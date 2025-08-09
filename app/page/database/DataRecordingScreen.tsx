import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { Project } from '../../types';
import FirebaseService from '../../services/firebaseService';
import type { RootStackParamList, RecordMetadata } from '../../types';
import { ApiService } from '../../services/api';

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

interface RecordedSample {
  id: string;
  timestamp: Date;
  fields: { [key: string]: string };
  confidence: number;
}

export default function DataRecordingScreen() {
  const navigation = useNavigation<DataRecordingNavigationProp>();
  const route = useRoute<DataRecordingRouteProp>();
  
  // Counter to ensure unique IDs
  const messageIdCounter = useRef(0);
  
  // Helper function to generate unique message IDs
  const generateMessageId = (prefix = 'msg') => {
    messageIdCounter.current += 1;
    return `${prefix}-${Date.now()}-${messageIdCounter.current}`;
  };
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      id: 'initial-message-1',
      type: 'assistant',
      content: 'Hi! I\'m your AI archaeological assistant. I can help you record field data through voice, photos, or text. What would you like to document today?',
      timestamp: new Date(),
    }
  ]);
  const [currentRecord, setCurrentRecord] = useState<DataField[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [workflowPlan, setWorkflowPlan] = useState<any>(null);
  const [recordedSamples, setRecordedSamples] = useState<RecordedSample[]>([]);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const { projectId, tableName } = route.params;
  const [project, setProject] = useState<Project | null>(null);

  // Load project details
  useEffect(() => {
    const loadProject = async () => {
      if (projectId) {
        try {
          const projectData = await FirebaseService.getProject(projectId);
          setProject(projectData);
        } catch (error) {
          console.error('Error loading project:', error);
        }
      }
    };
    loadProject();
  }, [projectId]);

  // Auto-scroll to bottom when new samples are added
  useEffect(() => {
    if (recordedSamples.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [recordedSamples.length]);

  // Initialize audio permissions and test backend connection
  useEffect(() => {
    (async () => {
      // Test backend connection first
      try {
        const API_URL = 'https://chert-backend-d92c4cd51927.herokuapp.com';
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
          id: generateMessageId('backend-status'),
          type: 'system',
          content: `🔗 Backend connected successfully!\n\nServer: ${API_URL}\nStatus: ${data.status}\n\n✅ Voice AI agent is ready for mobile use!`,
          timestamp: new Date(),
        };
        setConversation(prev => [...prev, backendMessage]);
      } catch (error) {
        console.error('Backend connection failed:', error);
        
        const errorMessage: ConversationMessage = {
          id: generateMessageId('backend-error'),
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
            id: generateMessageId('user'),
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
            id: generateMessageId('assistant'),
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
              
              // Create a sample record for the CSV table
              const sampleFields: { [key: string]: string } = {};
              let totalConfidence = 0;
              
              currentRecord.forEach(field => {
                sampleFields[field.name] = field.value;
                totalConfidence += field.confidence;
              });
              
              const avgConfidence = totalConfidence / currentRecord.length;
              
              const newSample: RecordedSample = {
                id: Date.now().toString(),
                timestamp: new Date(),
                fields: sampleFields,
                confidence: avgConfidence,
              };
              
              // Add to recorded samples
              setRecordedSamples(prev => {
                const updated = [...prev, newSample];
                console.log('Updated recordedSamples:', updated);
                return updated;
              });
              
              const metadata: RecordMetadata = {
                recordingMethod: 'voice',
                reasoning: `Processed ${currentRecord.length} fields from user input`,
              };
              
              console.log('Record committed with metadata:', metadata);
              console.log('New sample added:', newSample);
              
              const successMessage: ConversationMessage = {
                id: Date.now().toString(),
                type: 'system',
                content: `✅ Record committed successfully! Saved ${currentRecord.length} fields to local CSV. Total samples: ${recordedSamples.length + 1}`,
                timestamp: new Date(),
              };
              
              setConversation(prev => [...prev, successMessage]);
              
              // Clear current record
              setCurrentRecord([]);
              
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

  // Get all unique column headers from recorded samples
  const getAllColumnHeaders = () => {
    const headers = new Set(['timestamp', 'confidence']);
    recordedSamples.forEach(sample => {
      Object.keys(sample.fields).forEach(key => headers.add(key));
    });
    return Array.from(headers);
  };

  // Calculate column width based on number of columns
  const getColumnWidth = () => {
    const headers = getAllColumnHeaders();
    const screenWidth = 350; // Approximate table width
    return Math.max(screenWidth / headers.length, 100); // Minimum 100px per column
  };

  // Render CSV-style table
  const renderCSVTable = () => {
    console.log('Rendering CSV table with samples:', recordedSamples.length);
    
    if (recordedSamples.length === 0) {
      return (
        <View style={styles.csvContainer}>
          <Text style={styles.csvTitle}>Recorded Data (CSV View)</Text>
          <Text style={styles.noDataText}>No samples recorded yet. Start recording to see data here!</Text>
        </View>
      );
    }

    const headers = getAllColumnHeaders();
    const columnWidth = getColumnWidth();
    console.log('CSV headers:', headers, 'Column width:', columnWidth);

    return (
      <View style={styles.csvContainer}>
        <Text style={styles.csvTitle}>Recorded Data ({recordedSamples.length} samples)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScrollHorizontal}>
          <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={true} style={styles.tableScrollVertical}>
            {/* Header Row */}
            <View style={styles.tableRow}>
              {headers.map((header) => (
                <View key={header} style={[styles.tableHeader, { width: columnWidth }]}>
                  <Text style={styles.tableHeaderText}>{header}</Text>
                </View>
              ))}
            </View>
            
            {/* Data Rows */}
            {recordedSamples.map((sample, rowIndex) => (
              <View key={sample.id} style={[styles.tableRow, rowIndex % 2 === 1 && styles.alternateRow]}>
                {headers.map((header) => {
                  let cellValue = '';
                  if (header === 'timestamp') {
                    cellValue = sample.timestamp.toLocaleString();
                  } else if (header === 'confidence') {
                    cellValue = `${Math.round(sample.confidence * 100)}%`;
                  } else {
                    cellValue = sample.fields[header] || '';
                  }
                  
                  return (
                    <View key={`${sample.id}-${header}`} style={[styles.tableCell, { width: columnWidth }]}>
                      <Text style={styles.tableCellText}>{cellValue}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>
          
          <TouchableOpacity style={styles.projectSelector} onPress={() => {}}>
            <View style={styles.projectInfo}>
              <Text style={styles.projectName} numberOfLines={1}>
                {project?.name || 'Select Project'}
              </Text>
              <Text style={styles.projectType} numberOfLines={1}>
                {project?.databaseType || 'No project selected'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Area - CSV Table on top, Chat on bottom */}
      <View style={styles.contentArea}>
        {/* CSV Table Area - Top Half */}
        {renderCSVTable()}
        
        {/* Chat Area - Bottom Half */}
        <View style={styles.chatArea}>
          <ScrollView style={styles.conversation} showsVerticalScrollIndicator={false} contentContainerStyle={styles.conversationContent}>
            {/* Initial System Message */}
            <View style={styles.systemMessage}>
              <Text style={styles.systemMessageText}>
                Hello! I can help you analyze your data. What would you like to know?
              </Text>
              <Text style={styles.systemMessageTime}>10:43 PM</Text>
            </View>

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
              <View style={[styles.messageContainer, styles.assistantMessage]}>
                <Text style={styles.assistantMessageText}>
                  Processing your input...
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={textInput}
            onChangeText={setTextInput}
            placeholder="Ask about your data..."
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

        {/* Bottom Action Buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.bottomActionButton} onPress={addPhoto}>
            <Ionicons name="camera" size={20} color="#4FC3F7" />
            <Text style={styles.bottomActionText}>Photo</Text>
          </TouchableOpacity>
          
          {currentRecord.length > 0 ? (
            <TouchableOpacity style={styles.bottomActionButton} onPress={commitRecord}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.bottomActionText}>Commit ({currentRecord.length})</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.bottomActionButton} onPress={() => {}}>
              <Ionicons name="flask" size={20} color="#FF9800" />
              <Text style={styles.bottomActionText}>Test AI</Text>
            </TouchableOpacity>
          )}
          
          {/* Central Record Button */}
          <View style={styles.centralRecordContainer}>
            <Animated.View style={[styles.centralRecordButton, { transform: [{ scale: scaleAnim }] }]}>
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
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
          
          <TouchableOpacity style={styles.bottomActionButton} onPress={getGPSLocation} disabled={isProcessing}>
            <Ionicons name="location" size={20} color="#4CAF50" />
            <Text style={styles.bottomActionText}>GPS</Text>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    marginRight: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
  },
  projectSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginLeft: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  projectInfo: {
    flex: 1,
    marginRight: 8,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  projectType: {
    fontSize: 12,
    color: '#666',
  },
  header: {
    backgroundColor: 'rgba(255, 248, 243, 0.95)', // Match container background
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  projectIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  contentArea: {
    flex: 1,
    flexDirection: 'column',
  },
  chatArea: {
    flex: 1,
    backgroundColor: 'rgba(255, 248, 243, 0.95)', // Peach-white gradient base
  },
  conversation: {
    flex: 1,
    paddingHorizontal: 20,
  },
  conversationContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  systemMessage: {
    alignItems: 'center',
    marginBottom: 24,
  },
  systemMessageText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  systemMessageTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 6,
    padding: 16,
    borderRadius: 20,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#1F2937',
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    marginRight: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    backgroundColor: '#EF9144',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  bottomActionButton: {
    alignItems: 'center',
    padding: 8,
  },
  bottomActionText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  centralRecordContainer: {
    alignItems: 'center',
  },
  centralRecordButton: {
    marginBottom: 4,
  },
  recordButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordingButtonActive: {
    backgroundColor: '#F44336',
    shadowColor: '#F44336',
  },
  processingButton: {
    backgroundColor: '#FF9800',
    shadowColor: '#FF9800',
  },
  // CSV Table Styles
  csvContainer: {
    flex: 2,
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  csvTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 15,
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tableScrollHorizontal: {
    flex: 1,
  },
  tableScrollVertical: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  alternateRow: {
    backgroundColor: '#F9FAFB',
  },
  tableHeader: {
    backgroundColor: '#EF9144',
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#fff',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  tableCell: {
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 11,
    color: '#1a1a1a',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
});
