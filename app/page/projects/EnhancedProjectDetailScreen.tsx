import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, Project } from '../../types/index.js';
import FirebaseService from '../../services/firebaseService';
import { useAuth } from '../../contexts/AuthContext';

type ProjectDetailNavigationProp = StackNavigationProp<RootStackParamList>;
type ProjectDetailRouteProp = RouteProp<RootStackParamList, 'ProjectDetail'>;

interface DataRecord {
  id: string;
  projectId: string;
  userId: string;
  data: Record<string, string>;
  createdAt: Date;
  method: string;
  source?: string;
}

interface LocalDataRow {
  [key: string]: string;
  timestamp: string;
  method: string;
  source: string;
}

export default function EnhancedProjectDetailScreen() {
  const navigation = useNavigation<ProjectDetailNavigationProp>();
  const route = useRoute<ProjectDetailRouteProp>();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('collect');
  const [chatInput, setChatInput] = useState('');
  const [processingChat, setProcessingChat] = useState(false);
  const [chat, setChat] = useState<Array<{role: 'user' | 'assistant', text: string}>>([]);
  const [localTableData, setLocalTableData] = useState<LocalDataRow[]>([]);
  const [annotations, setAnnotations] = useState({
    general: '',
    columns: {} as Record<string, string>,
  });
  const [editingAnnotations, setEditingAnnotations] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const { projectId } = route.params;

  const fetchProject = useCallback(async () => {
    try {
      const projectData = await FirebaseService.getProject(projectId);
      if (projectData) {
        if (projectData.userId !== user?.uid) {
          Alert.alert('Error', "You don't have access to this project");
          navigation.goBack();
          return;
        }

        setProject(projectData);
        setAnnotations({
          general: projectData.generalAnnotations || '',
          columns: projectData.columnAnnotations || {},
        });
      } else {
        Alert.alert('Error', 'Project not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      Alert.alert('Error', 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [user, projectId, navigation]);

  const fetchRecords = useCallback(async () => {
    try {
      const { records: recordsData } = await FirebaseService.getDataRecords(projectId);
      setRecords(recordsData);
    } catch (error) {
      console.error('Error fetching records:', error);
      Alert.alert('Error', 'Failed to load records');
    }
  }, [projectId]);

  useEffect(() => {
    if (user && projectId) {
      fetchProject();
      fetchRecords();
    }
  }, [user, projectId, fetchProject, fetchRecords]);

  useFocusEffect(
    React.useCallback(() => {
      if (user && projectId) {
        fetchProject();
        fetchRecords();
      }
    }, [user, projectId, fetchProject, fetchRecords])
  );

  const processChatInput = async () => {
    if (!chatInput.trim() || !project) return;

    setChat(prev => [...prev, { role: 'user', text: chatInput }]);
    setProcessingChat(true);

    try {
      // Simple processing - in a real app you'd call an AI API
      const processedData: Record<string, string> = {};
      
      // Basic keyword extraction for demo purposes
      const input = chatInput.toLowerCase();
      if (project.dataColumns) {
        project.dataColumns.forEach(column => {
          const columnLower = column.toLowerCase();
          if (input.includes(columnLower)) {
            // Extract value after the column name
            const parts = input.split(columnLower);
            if (parts.length > 1) {
              const value = parts[1].trim().split(' ')[0];
              processedData[column] = value;
            }
          }
        });
      }

      const newRow: LocalDataRow = {
        ...processedData,
        timestamp: new Date().toLocaleString(),
        method: 'chat',
        source: chatInput,
      };
      
      setLocalTableData(prev => [...prev, newRow]);
      
      setChat(prev => [...prev, { 
        role: 'assistant', 
        text: `✅ Row added to local table. Processed data for ${Object.keys(processedData).length} columns.` 
      }]);
      
      setChatInput('');
    } catch (error) {
      console.error('Error processing chat input:', error);
      setChat(prev => [...prev, { 
        role: 'assistant', 
        text: "❗ Failed to process input. Please try again." 
      }]);
    } finally {
      setProcessingChat(false);
    }
  };

  const mergeWithFirebase = async () => {
    if (!localTableData.length || !project || !user) return;

    try {
      for (const row of localTableData) {
        const recordData = {
          ...row,
          timestamp: undefined, // Remove timestamp from data
        };
        
        await FirebaseService.createDataRecord(
          project.id,
          recordData,
          row.method || 'chat',
          row.source || ''
        );
      }
      
      Alert.alert('Success', `${localTableData.length} records merged with Firebase!`);
      setLocalTableData([]);
      setChat([]);
      fetchRecords();
    } catch (error) {
      console.error('Error merging with Firebase:', error);
      Alert.alert('Error', 'Failed to merge with Firebase');
    }
  };

  const saveAnnotations = async () => {
    if (!project) return;

    try {
      await FirebaseService.updateProject(project.id, {
        generalAnnotations: annotations.general,
        columnAnnotations: annotations.columns,
      });

      setProject({
        ...project,
        generalAnnotations: annotations.general,
        columnAnnotations: annotations.columns,
      });

      Alert.alert('Success', 'Annotations saved successfully!');
      setEditingAnnotations(false);
    } catch (error) {
      console.error('Error saving annotations:', error);
      Alert.alert('Error', 'Failed to save annotations');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading project...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['rgba(239, 145, 68, 0.9)', 'rgba(254, 126, 66, 0.7)']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.projectName}>{project.name}</Text>
            <Text style={styles.projectDescription}>{project.description}</Text>
          </View>
        </View>

        {/* Stats Bar */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{records.length}</Text>
            <Text style={styles.statLabel}>Records</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{project?.dataColumns?.length || 0}</Text>
            <Text style={styles.statLabel}>Columns</Text>
          </View>
          {localTableData.length > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FF6B35' }]}>{localTableData.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { id: 'collect', label: 'Collect', icon: 'add-circle-outline' },
          { id: 'records', label: 'Records', icon: 'document-text-outline' },
          { id: 'setup', label: 'Setup', icon: 'settings-outline' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={20} 
              color={activeTab === tab.id ? '#EF9144' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'collect' && (
          <View style={styles.tabContent}>
            {/* Voice Recording Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Voice Recording</Text>
              <View style={styles.voiceContainer}>
                <TouchableOpacity
                  style={[styles.recordButton, isRecording && styles.recordingButton]}
                  onPress={() => setIsRecording(!isRecording)}
                >
                  <Ionicons 
                    name={isRecording ? "stop" : "mic"} 
                    size={32} 
                    color="white" 
                  />
                </TouchableOpacity>
                <Text style={styles.recordStatus}>
                  {isRecording ? 'Recording...' : 'Tap to record'}
                </Text>
              </View>
            </View>

            {/* Text Entry Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Text Entry</Text>
              
              {/* Chat Messages */}
              {chat.length > 0 && (
                <ScrollView style={styles.chatContainer} showsVerticalScrollIndicator={false}>
                  {chat.map((message, idx) => (
                    <View key={idx} style={[
                      styles.chatMessage,
                      message.role === 'user' ? styles.userMessage : styles.assistantMessage
                    ]}>
                      <Text style={[
                        styles.chatText,
                        message.role === 'user' ? styles.userText : styles.assistantText
                      ]}>
                        {message.text}
                      </Text>
                    </View>
                  ))}
                  {processingChat && (
                    <View style={[styles.chatMessage, styles.assistantMessage]}>
                      <Text style={styles.assistantText}>Processing...</Text>
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Local Data Table */}
              {localTableData.length > 0 && (
                <View style={styles.localTableContainer}>
                  <Text style={styles.localTableTitle}>
                    Local Data ({localTableData.length} rows)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.table}>
                      <View style={styles.tableHeader}>
                        <Text style={styles.tableHeaderText}>Time</Text>
                        <Text style={styles.tableHeaderText}>Method</Text>
                        {project?.dataColumns?.map((column) => (
                          <Text key={column} style={styles.tableHeaderText}>
                            {column}
                          </Text>
                        ))}
                      </View>
                      {localTableData.map((row, idx) => (
                        <View key={idx} style={styles.tableRow}>
                          <Text style={styles.tableCellText}>{row.timestamp}</Text>
                          <Text style={styles.tableCellText}>{row.method}</Text>
                          {project?.dataColumns?.map((column) => (
                            <Text key={column} style={styles.tableCellText}>
                              {row[column] || '-'}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              <TextInput
                style={styles.textInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Describe your observation..."
                multiline
                numberOfLines={4}
              />
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={processChatInput}
                  disabled={!chatInput.trim() || processingChat}
                >
                  <Text style={styles.buttonText}>
                    {processingChat ? 'Processing...' : 'Add to Local Table'}
                  </Text>
                </TouchableOpacity>
                
                {localTableData.length > 0 && (
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={mergeWithFirebase}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Sync to Firebase ({localTableData.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'records' && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Database Records ({records.length})</Text>
              {records.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      <Text style={styles.tableHeaderText}>Date</Text>
                      <Text style={styles.tableHeaderText}>Method</Text>
                      {project.dataColumns?.map((column) => (
                        <Text key={column} style={styles.tableHeaderText}>
                          {column}
                        </Text>
                      ))}
                    </View>
                    {records.map((record) => (
                      <View key={record.id} style={styles.tableRow}>
                        <Text style={styles.tableCellText}>
                          {record.createdAt.toLocaleDateString()}
                        </Text>
                        <Text style={styles.tableCellText}>{record.method}</Text>
                        {project.dataColumns?.map((column) => (
                          <Text key={column} style={styles.tableCellText}>
                            {record.data[column] || '-'}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>No records yet. Start collecting data!</Text>
              )}
            </View>
          </View>
        )}

        {activeTab === 'setup' && (
          <View style={styles.tabContent}>
            {/* Schema Information */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Data Schema</Text>
              {project.dataColumns && project.dataColumns.length > 0 ? (
                <View style={styles.schemaContainer}>
                  {project.dataColumns.map((column, idx) => (
                    <View key={idx} style={styles.schemaItem}>
                      <Text style={styles.schemaColumn}>{column}</Text>
                      <Text style={styles.schemaIndex}>Column {idx + 1}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No schema defined for this project.</Text>
              )}
            </View>

            {/* CSV Metadata */}
            {project.csvMetadata && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sample Data</Text>
                <Text style={styles.csvInfo}>
                  File: {project.csvMetadata.fileName} • {project.csvMetadata.totalRows} rows • {(project.csvMetadata.fileSize / 1024).toFixed(1)} KB
                </Text>
                {project.csvMetadata.sampleRows && project.csvMetadata.sampleRows.length > 0 && (
                  <View style={styles.sampleContainer}>
                    <Text style={styles.sampleTitle}>Sample Rows:</Text>
                    {project.csvMetadata.sampleRows.map((row, idx) => (
                      <Text key={idx} style={styles.sampleRow}>{row}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Annotations */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Annotations</Text>
                {!editingAnnotations && (
                  <TouchableOpacity onPress={() => setEditingAnnotations(true)}>
                    <Ionicons name="create-outline" size={20} color="#EF9144" />
                  </TouchableOpacity>
                )}
              </View>
              
              {editingAnnotations ? (
                <>
                  <Text style={styles.annotationLabel}>General Notes:</Text>
                  <TextInput
                    style={styles.annotationInput}
                    value={annotations.general}
                    onChangeText={(text) => setAnnotations({ ...annotations, general: text })}
                    placeholder="Add general notes about this project..."
                    multiline
                    numberOfLines={3}
                  />
                  
                  {project.dataColumns?.map((column) => (
                    <View key={column} style={styles.columnAnnotation}>
                      <Text style={styles.annotationLabel}>{column}:</Text>
                      <TextInput
                        style={styles.annotationInput}
                        value={annotations.columns[column] || ''}
                        onChangeText={(text) => setAnnotations({
                          ...annotations,
                          columns: { ...annotations.columns, [column]: text }
                        })}
                        placeholder={`Notes about ${column}...`}
                        multiline
                        numberOfLines={2}
                      />
                    </View>
                  ))}
                  
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.button, styles.primaryButton]}
                      onPress={saveAnnotations}
                    >
                      <Text style={styles.buttonText}>Save Annotations</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.secondaryButton]}
                      onPress={() => {
                        setEditingAnnotations(false);
                        setAnnotations({
                          general: project.generalAnnotations || '',
                          columns: project.columnAnnotations || {},
                        });
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.annotationText}>
                    {annotations.general || 'No general annotations yet.'}
                  </Text>
                  {project.dataColumns?.map((column) => (
                    <View key={column} style={styles.columnAnnotation}>
                      <Text style={styles.annotationLabel}>{column}:</Text>
                      <Text style={styles.annotationText}>
                        {annotations.columns[column] || 'No annotation for this column.'}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3F0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  projectName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  projectDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(239, 145, 68, 0.1)',
    borderBottomWidth: 2,
    borderBottomColor: '#EF9144',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#EF9144',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  voiceContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF9144',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  recordingButton: {
    backgroundColor: '#FF4444',
  },
  recordStatus: {
    fontSize: 14,
    color: '#666',
  },
  chatContainer: {
    maxHeight: 200,
    marginBottom: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 10,
  },
  chatMessage: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#EF9144',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5E5',
  },
  chatText: {
    fontSize: 14,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: '#333',
  },
  localTableContainer: {
    marginBottom: 15,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 10,
  },
  localTableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  table: {
    minWidth: 600,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    width: 100,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tableCellText: {
    fontSize: 12,
    color: '#666',
    width: 100,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#EF9144',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF9144',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#EF9144',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    paddingVertical: 20,
  },
  schemaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  schemaItem: {
    backgroundColor: '#F0F0F0',
    padding: 10,
    borderRadius: 8,
    minWidth: 120,
  },
  schemaColumn: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  schemaIndex: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  csvInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  sampleContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 15,
  },
  sampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sampleRow: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  annotationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  annotationInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  annotationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  columnAnnotation: {
    marginBottom: 15,
  },
});