import React, { useState, useRef } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp, RouteProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';

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
      content: 'Hi! I\'m ready to help you record field data. You can speak naturally, take photos, or type. What would you like to record?',
      timestamp: new Date(),
    }
  ]);
  const [currentRecord, setCurrentRecord] = useState<DataField[]>([]);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const { projectId, tableName } = route.params;

  const startRecording = async () => {
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

    // TODO: Implement actual audio recording with expo-av
    console.log('Starting audio recording...');
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setIsProcessing(true);
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);

    // Simulate processing
    setTimeout(() => {
      const newMessage: ConversationMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: 'I found a ceramic sherd, approximately 3cm in diameter, reddish-brown color, possibly from a storage vessel',
        timestamp: new Date(),
        metadata: {
          confidence: 0.85,
          suggestedFields: ['artifact_type', 'dimensions', 'color', 'material'],
        }
      };

      const assistantResponse: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Great! I\'ve identified this as a ceramic artifact. Let me map this to your database:\n\n• Artifact Type: Ceramic Sherd\n• Dimensions: 3cm diameter\n• Color: Reddish-brown\n• Vessel Type: Storage vessel (inferred)\n\nDoes this look correct? Should I add any additional information?',
        timestamp: new Date(),
        metadata: {
          confidence: 0.85,
        }
      };

      setConversation(prev => [...prev, newMessage, assistantResponse]);
      
      // Update current record
      setCurrentRecord([
        { name: 'artifact_type', value: 'Ceramic Sherd', confidence: 0.9, source: 'voice' },
        { name: 'dimensions', value: '3cm diameter', confidence: 0.85, source: 'voice' },
        { name: 'color', value: 'Reddish-brown', confidence: 0.9, source: 'voice' },
        { name: 'vessel_type', value: 'Storage vessel', confidence: 0.7, source: 'voice' },
      ]);
      
      setIsProcessing(false);
    }, 2000);
  };

  const sendTextMessage = () => {
    if (!textInput.trim()) return;

    const newMessage: ConversationMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: textInput,
      timestamp: new Date(),
    };

    setConversation(prev => [...prev, newMessage]);
    setTextInput('');

    // Simulate assistant response
    setTimeout(() => {
      const response: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I understand. Let me help you with that information.',
        timestamp: new Date(),
      };
      setConversation(prev => [...prev, response]);
    }, 1000);
  };

  const takePhoto = () => {
    // TODO: Implement camera functionality with expo-image-picker
    Alert.alert('Camera', 'Camera functionality will be implemented here');
  };

  const commitRecord = () => {
    Alert.alert(
      'Commit Record',
      'Are you sure you want to commit this record to the database?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Commit',
          onPress: () => {
            // TODO: Save to Supabase
            console.log('Committing record:', currentRecord);
            Alert.alert('Success', 'Record committed successfully!');
            navigation.goBack();
          }
        }
      ]
    );
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
        colors={['#4CAF50', '#388E3C']}
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
          
          <TouchableOpacity style={styles.actionButton}>
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
    backgroundColor: '#f8f9fa',
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
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
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
