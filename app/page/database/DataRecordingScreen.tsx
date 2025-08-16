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
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { Project } from '../../types';
import FirebaseService from '../../services/firebaseService';
import type { RootStackParamList, RecordMetadata } from '../../types';
import { ApiService } from '../../services/api';
import { DataProcessingService } from '../../services/dataProcessingService';
import GISModal from '../../components/GISModal';

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
  const [projectAnalytics, setProjectAnalytics] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showGISModal, setShowGISModal] = useState(false);
  const [gisCoordinates, setGisCoordinates] = useState<{latitude: number; longitude: number} | null>(null);
  const [isGISButtonDisabled, setIsGISButtonDisabled] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const { projectId, tableName: _tableName } = route.params;
  const [project, setProject] = useState<Project | null>(null);

  // Storage key for persisting local data table per project
  const STORAGE_KEY = `recorded_samples_${projectId}`;

  // Load persisted data on component mount
  useEffect(() => {
    loadPersistedSamples();
  }, [projectId]);

  // Import CSV data when project with coordinates is loaded
  useEffect(() => {
    if (project?.gisEnabled && project?.coordinateColumns && project?.csvMetadata?.sampleRows) {
      // Disabled automatic import of CSV sample data to prevent dummy data
      // importCSVDataIfNeeded();
    }
  }, [project]);

  // Save samples to storage whenever recordedSamples changes
  useEffect(() => {
    savePersistedSamples();
  }, [recordedSamples]);

  const loadPersistedSamples = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const samples = JSON.parse(stored);
        console.log(`DEBUG: About to load ${samples.length} persisted samples for project ${projectId}`);
        console.log('DEBUG: Sample data preview:', samples.slice(0, 2));
        
        // Check if these are the old dummy samples by looking for the original coordinates
        const dummyCoordinates = ['39.952583', '40.712776', '34.052235'];
        const hasDummyData = samples.some((sample: any) => 
          dummyCoordinates.includes(String(sample.fields?.Latitude)) ||
          dummyCoordinates.includes(String(sample.Latitude))
        );
        
        if (hasDummyData) {
          console.log('🚨 DETECTED DUMMY DATA - Automatically clearing it');
          await AsyncStorage.removeItem(STORAGE_KEY);
          await AsyncStorage.removeItem(`csv_imported_${projectId}`);
          setRecordedSamples([]);
          return;
        }
        
        setRecordedSamples(samples);
        console.log(`Loaded ${samples.length} persisted samples for project ${projectId}`);
      }
    } catch (error) {
      console.error('Failed to load persisted samples:', error);
    }
  };

  const savePersistedSamples = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recordedSamples));
    } catch (error) {
      console.error('Failed to save samples:', error);
    }
  };

  const importCSVDataIfNeeded = async () => {
    try {
      // Check if we already have samples
      if (recordedSamples.length > 0) {
        return;
      }

      // Check if we already imported CSV data before
      const importFlagKey = `csv_imported_${projectId}`;
      const alreadyImported = await AsyncStorage.getItem(importFlagKey);
      if (alreadyImported) {
        console.log('📊 CSV data already imported, skipping...');
        return;
      }

      if (!project?.csvMetadata?.sampleRows || !project?.coordinateColumns || !project?.dataColumns) {
        return;
      }

      console.log('📊 Importing CSV data to DataRecording local storage...');
      
      const importedSamples: RecordedSample[] = [];
      const latColIndex = project.dataColumns.indexOf(project.coordinateColumns.latitude);
      const lngColIndex = project.dataColumns.indexOf(project.coordinateColumns.longitude);

      if (latColIndex === -1 || lngColIndex === -1) {
        console.warn('Could not find coordinate column indices in DataRecording');
        return;
      }

      project.csvMetadata.sampleRows.forEach((row, index) => {
        const cells = row.split(' | '); // Based on the log format
        
        if (cells.length >= project.dataColumns!.length) {
          const sampleFields: { [key: string]: string } = {};
          
          project.dataColumns!.forEach((column, colIndex) => {
            if (cells[colIndex]) {
              sampleFields[column] = cells[colIndex].trim();
            }
          });

          // Check if we have valid coordinates
          const lat = parseFloat(sampleFields[project.coordinateColumns!.latitude]);
          const lng = parseFloat(sampleFields[project.coordinateColumns!.longitude]);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            importedSamples.push({
              id: `csv_import_${index}`,
              timestamp: new Date(),
              fields: sampleFields,
              confidence: 1.0,
              source: 'csv_import'
            });
          }
        }
      });

      if (importedSamples.length > 0) {
        setRecordedSamples(importedSamples);
        // Set flag to prevent re-importing
        await AsyncStorage.setItem(importFlagKey, 'true');
        console.log(`✅ Imported ${importedSamples.length} samples from CSV to DataRecording`);
      }
    } catch (error) {
      console.error('Error importing CSV data to DataRecording:', error);
    }
  };

  // Debug function to clear local storage (for testing)
  const clearLocalStorage = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(`csv_imported_${projectId}`);
      setRecordedSamples([]);
      console.log('🗑️ Cleared local storage for project');
    } catch (error) {
      console.error('Error clearing local storage:', error);
    }
  };

  // Text-to-speech function
  const speakText = async (text: string) => {
    if (isMuted || !text.trim()) return;
    
    try {
      await Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error('Text-to-speech error:', error);
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      const newMutedState = !prev;
      if (newMutedState) {
        // Stop any current speech when muting
        Speech.stop();
      }
      return newMutedState;
    });
  };

  const _clearPersistedSamples = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setRecordedSamples([]);
      console.log('Cleared persisted samples');
    } catch (error) {
      console.error('Failed to clear samples:', error);
    }
  };

  // Load project details
  useEffect(() => {
    const loadProject = async () => {
      if (projectId) {
        try {
          const projectData = await FirebaseService.getProject(projectId);
          
          // Auto-detect coordinate columns if not already set
          if (projectData.dataColumns && !projectData.gisEnabled) {
            const detectedCoordinates = DataProcessingService.detectCoordinateColumns(projectData.dataColumns);
            if (detectedCoordinates) {
              projectData.gisEnabled = true;
              projectData.coordinateColumns = detectedCoordinates;
              console.log('✅ Auto-detected GIS coordinates in DataRecording:', detectedCoordinates);
              
              // Update project in Firebase with GIS settings
              try {
                await FirebaseService.updateProject(projectId, {
                  gisEnabled: true,
                  coordinateColumns: detectedCoordinates
                });
                console.log('✅ Updated project with GIS settings from DataRecording');
              } catch (updateError) {
                console.warn('Could not update project with GIS settings:', updateError);
              }
            }
          }
          
          setProject(projectData);
          
          // Load analytics data
          try {
            const analyticsData = await FirebaseService.getProjectAnalytics(projectId);
            setProjectAnalytics(analyticsData);
          } catch (analyticsError) {
            console.error('Error loading analytics:', analyticsError);
          }
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
          content: `Backend connected successfully!\n\nServer: ${API_URL}\nStatus: ${data.status}\n\nVoice AI agent is ready for mobile use!`,
          timestamp: new Date(),
        };
        setConversation(prev => [...prev, backendMessage]);
      } catch (error) {
        console.error('Backend connection failed:', error);
        
        const errorMessage: ConversationMessage = {
          id: generateMessageId('backend-error'),
          type: 'system',
          content: `Backend connection failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nTroubleshooting:\n• Make sure the backend server is running\n• Check if your device is on the same WiFi network\n• Try restarting the Expo development server`,
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
          
          // Get project schema and send with voice request
          let projectSchema = null;
          if (project) {
            projectSchema = {
              dataColumns: project.dataColumns || [],
              columnAnnotations: project.columnAnnotations || {},
              generalAnnotations: project.generalAnnotations || '',
              csvMetadata: project.csvMetadata || null
            };
            console.log('📋 Project loaded:', {
              id: project.id,
              name: project.name,
              dataColumns: project.dataColumns,
              columnAnnotations: project.columnAnnotations,
              generalAnnotations: project.generalAnnotations,
              csvMetadata: project.csvMetadata
            });
            console.log('📋 Sending project schema:', projectSchema);
          } else {
            console.log('❌ No project loaded for schema');
          }
          
          // Prepare GIS data if available
          let gisDataForAPI = undefined;
          if (gisCoordinates && project?.coordinateColumns) {
            gisDataForAPI = {
              latitude: gisCoordinates.latitude,
              longitude: gisCoordinates.longitude,
              coordinateColumns: project.coordinateColumns
            };
          }
          
          // Process with voice agent using mobile file object
          const result = await ApiService.processVoiceInputMobile(fileInfo, projectId, projectSchema, gisDataForAPI);
          
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
          
          // Speak the assistant's response if it's a question response
          if (assistantContent && assistantContent.trim()) {
            await speakText(assistantContent);
          }
          
          // Update current record only if we have extracted data
          if (result.extracted_data && Object.keys(result.extracted_data).length > 0) {
            updateCurrentRecord(result.extracted_data, result.confidence);
            // Auto-commit the record immediately
            await autoCommitRecord(result.extracted_data, result.confidence);
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
      // Get project schema for text processing too
      let projectSchema = null;
      if (project) {
        projectSchema = {
          dataColumns: project.dataColumns || [],
          columnAnnotations: project.columnAnnotations || {},
          generalAnnotations: project.generalAnnotations || '',
          csvMetadata: project.csvMetadata || null
        };
      }
      
      // Prepare GIS data if available
      let gisDataForAPI = undefined;
      if (gisCoordinates && project?.coordinateColumns) {
        gisDataForAPI = {
          latitude: gisCoordinates.latitude,
          longitude: gisCoordinates.longitude,
          coordinateColumns: project.coordinateColumns
        };
      }
      
      // Process text through the backend
      const result = await ApiService.processTextInput(message, projectId, projectSchema, gisDataForAPI);
      
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
      
      // Speak the assistant's response if it's a question response
      if (assistantContent && assistantContent.trim()) {
        await speakText(assistantContent);
      }
      
      // Update current record only if we have extracted data
      if (result.extracted_data && Object.keys(result.extracted_data).length > 0) {
        updateCurrentRecord(result.extracted_data, result.confidence);
        // Auto-commit the record immediately
        await autoCommitRecord(result.extracted_data, result.confidence);
      }
    } catch (error) {
      console.error('Text processing failed:', error);
      Alert.alert('Processing Error', `Failed to process text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    setIsProcessing(false);
  };

  const addPhoto = async () => {
    Alert.alert('Feature Coming Soon', 'Camera functionality will be available in a future update.');
  };

  // Auto-commit function for immediate saving
  const autoCommitRecord = async (extractedData: any, confidence: number) => {
    try {
      console.log('Auto-committing extracted data:', extractedData);
      
      // Convert extracted data to current record format
      const recordFields = Object.entries(extractedData).map(([key, value]) => ({
        name: key,
        value: String(value),
        confidence: confidence,
        source: 'voice' as const
      }));
      
      // Create a sample record for the CSV table
      const sampleFields: { [key: string]: string } = {};
      recordFields.forEach(field => {
        sampleFields[field.name] = field.value;
      });
      
      // Add GIS coordinates if they exist in memory
      if (gisCoordinates && project?.coordinateColumns) {
        sampleFields[project.coordinateColumns.latitude] = gisCoordinates.latitude.toString();
        sampleFields[project.coordinateColumns.longitude] = gisCoordinates.longitude.toString();
        console.log('Added GIS coordinates to sample:', gisCoordinates);
      }
      
      const newSample: RecordedSample = {
        id: Date.now().toString(),
        timestamp: new Date(),
        fields: sampleFields,
        confidence: confidence,
      };
      
      // Add to recorded samples
      setRecordedSamples(prev => {
        const updated = [...prev, newSample];
        console.log('Auto-committed sample added:', newSample);
        return updated;
      });
      
      // Add success message to conversation
      const successMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `Auto-saved! Added ${Object.keys(extractedData).length} fields to local data table.`,
        timestamp: new Date(),
        metadata: { confidence: confidence }
      };
      
      setConversation(prev => [...prev, successMessage]);
      
      // Clear current record since it's been committed
      setCurrentRecord([]);
      
      // Clear GIS coordinates and re-enable GIS button
      if (gisCoordinates) {
        setGisCoordinates(null);
        setIsGISButtonDisabled(false);
      }
      
    } catch (error) {
      console.error('Auto-commit failed:', error);
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

  const handleGISButtonPress = () => {
    if (!project?.gisEnabled || !project?.coordinateColumns) {
      Alert.alert(
        'GIS Not Enabled',
        'This project is not GIS enabled. To use GIS functionality, the project must have coordinate columns configured.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setShowGISModal(true);
  };

  const handleGISLogWithoutProperties = async (coordinates: { latitude: number; longitude: number }) => {
    if (!project?.coordinateColumns) return;
    
    try {
      console.log('Logging GIS coordinates directly:', coordinates);
      
      // Create fields for the coordinate columns
      const coordFields: { [key: string]: string } = {};
      coordFields[project.coordinateColumns.latitude] = coordinates.latitude.toString();
      coordFields[project.coordinateColumns.longitude] = coordinates.longitude.toString();
      
      const newSample: RecordedSample = {
        id: Date.now().toString(),
        timestamp: new Date(),
        fields: coordFields,
        confidence: 1.0,
      };
      
      // Add to recorded samples
      setRecordedSamples(prev => {
        const updated = [...prev, newSample];
        console.log('GIS coordinates logged directly:', newSample);
        return updated;
      });
      
      // Add success message to conversation
      const successMessage: ConversationMessage = {
        id: Date.now().toString(),
        type: 'system',
        content: `📍 GIS location recorded: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`,
        timestamp: new Date(),
      };
      
      setConversation(prev => [...prev, successMessage]);
      
    } catch (error) {
      console.error('GIS logging error:', error);
      Alert.alert('Error', 'Failed to log GIS coordinates.');
    }
  };

  const handleGISLogWithProperties = (coordinates: { latitude: number; longitude: number }) => {
    // Store coordinates in memory and disable GIS button
    setGisCoordinates(coordinates);
    setIsGISButtonDisabled(true);
    
    // Add message to conversation indicating GIS data is ready
    const gisMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'system',
      content: `📍 GIS coordinates ready: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}. Now record additional properties through voice or text.`,
      timestamp: new Date(),
    };
    
    setConversation(prev => [...prev, gisMessage]);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FF9800';
    return '#F44336';
  };

  // Get all unique column headers from recorded samples and project schema
  const getAllColumnHeaders = () => {
    const headers = new Set(['timestamp', 'confidence']);
    
    // Add headers from project schema if available
    if (project && project.dataColumns) {
      project.dataColumns.forEach(column => headers.add(column));
    }
    
    // Add headers from actual recorded data
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
          
          {/* Mute/Unmute Button */}
          <TouchableOpacity 
            style={[styles.muteButton, isMuted && styles.mutedButton]}
            onPress={toggleMute}
          >
            <Ionicons 
              name={isMuted ? "volume-mute" : "volume-high"} 
              size={20} 
              color={isMuted ? "#F44336" : "#4CAF50"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Area - CSV Table on top, Chat on bottom */}
      <View style={styles.contentArea}>
        {/* CSV Table Area - Top Half */}
        {renderCSVTable()}
        
        {/* Analytics Overlay */}
        {showAnalytics && projectAnalytics && (
          <View style={styles.analyticsOverlay}>
            <View style={styles.analyticsCard}>
              <View style={styles.analyticsHeader}>
                <Text style={styles.analyticsTitle}>Project Analytics</Text>
                <TouchableOpacity onPress={() => setShowAnalytics(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.analyticsContent}>
                <View style={styles.analyticsSection}>
                  <Text style={styles.analyticsSectionTitle}>📊 Data Overview</Text>
                  <Text style={styles.analyticsText}>• Total Records: {projectAnalytics.totalRecords}</Text>
                  <Text style={styles.analyticsText}>• Data Fields: {Object.keys(projectAnalytics.fieldCompleteness || {}).length}</Text>
                  {Object.keys(projectAnalytics.fieldCompleteness || {}).length > 0 && (
                    <Text style={styles.analyticsText}>
                      • Average Completeness: {Math.round(
                        (Object.values(projectAnalytics.fieldCompleteness || {}) as number[]).reduce((a: number, b: number) => a + b, 0) / 
                        Object.keys(projectAnalytics.fieldCompleteness || {}).length
                      )}%
                    </Text>
                  )}
                </View>
                
                {Object.keys(projectAnalytics.fieldCompleteness || {}).length > 0 && (
                  <View style={styles.analyticsSection}>
                    <Text style={styles.analyticsSectionTitle}>📈 Field Completeness</Text>
                    {Object.entries(projectAnalytics.fieldCompleteness || {}).map(([field, completeness]: [string, any]) => (
                      <View key={field} style={styles.fieldRow}>
                        <Text style={styles.fieldName}>{field}</Text>
                        <Text style={styles.fieldStats}>
                          {completeness}% complete, {projectAnalytics.uniqueValues?.[field] || 0} unique
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {Object.keys(projectAnalytics.topValues || {}).length > 0 && (
                  <View style={styles.analyticsSection}>
                    <Text style={styles.analyticsSectionTitle}>🔝 Most Common Values</Text>
                    {Object.entries(projectAnalytics.topValues || {}).map(([field, values]: [string, any]) => (
                      values && values.length > 0 && (
                        <View key={field} style={styles.fieldRow}>
                          <Text style={styles.fieldName}>{field}</Text>
                          <Text style={styles.fieldValues}>
                            {values.slice(0, 3).map((v: any) => `${v.value} (${v.count})`).join(', ')}
                          </Text>
                        </View>
                      )
                    ))}
                  </View>
                )}
                
                <View style={styles.analyticsSection}>
                  <Text style={styles.analyticsTip}>
                    💡 Try saying "show me analytics" or "what are my statistics" while recording!
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
        
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
            placeholder="Record data or ask 'show analytics'..."
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

          <TouchableOpacity style={styles.bottomActionButton} onPress={() => {
            Alert.alert(
              'Clear Local Data',
              'Are you sure you want to delete all local data? This will remove all sample entries from this device.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Clear', 
                  style: 'destructive', 
                  onPress: clearLocalStorage 
                }
              ]
            );
          }}>
            <Ionicons name="trash" size={20} color="#F44336" />
            <Text style={styles.bottomActionText}>Clear Data</Text>
          </TouchableOpacity>
          
          {currentRecord.length > 0 ? (
            <TouchableOpacity style={styles.bottomActionButton} onPress={commitRecord}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.bottomActionText}>Commit ({currentRecord.length})</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.bottomActionButton} onPress={() => setShowAnalytics(!showAnalytics)}>
              <Ionicons name="analytics" size={20} color="#FF9800" />
              <Text style={styles.bottomActionText}>Analytics</Text>
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
          
          <TouchableOpacity 
            style={[
              styles.bottomActionButton,
              isGISButtonDisabled && styles.disabledButton
            ]} 
            onPress={handleGISButtonPress} 
            disabled={isProcessing || isGISButtonDisabled}
          >
            <Ionicons 
              name="location" 
              size={20} 
              color={isGISButtonDisabled ? "#999" : "#4CAF50"} 
            />
            <Text style={[
              styles.bottomActionText,
              isGISButtonDisabled && styles.disabledText
            ]}>
              GIS
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* GIS Modal */}
      <GISModal
        visible={showGISModal}
        onClose={() => setShowGISModal(false)}
        onLogWithoutProperties={handleGISLogWithoutProperties}
        onLogWithProperties={handleGISLogWithProperties}
        coordinateColumns={project?.coordinateColumns}
      />
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
  muteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mutedButton: {
    backgroundColor: '#FFEBEE',
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
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
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
  // Analytics Overlay Styles
  analyticsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  analyticsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  analyticsContent: {
    padding: 20,
    maxHeight: 400,
  },
  analyticsSection: {
    marginBottom: 20,
  },
  analyticsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  analyticsText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 20,
  },
  fieldRow: {
    marginBottom: 8,
  },
  fieldName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  fieldStats: {
    fontSize: 12,
    color: '#6B7280',
  },
  fieldValues: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  analyticsTip: {
    fontSize: 14,
    color: '#059669',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
});
