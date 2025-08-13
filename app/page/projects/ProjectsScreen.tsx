import React, { useState, useEffect } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, Project } from '../../types/index.js';
import FirebaseService from '../../services/firebaseService';

type ProjectsNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ProjectsScreen() {
  const navigation = useNavigation<ProjectsNavigationProp>();
  const [searchText, setSearchText] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsWithLocalData, setProjectsWithLocalData] = useState<Set<string>>(new Set());

  // Check for local data across all projects
  const checkLocalData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const recordedSampleKeys = keys.filter(key => key.startsWith('recorded_samples_'));
      const projectIds = new Set<string>();
      
      for (const key of recordedSampleKeys) {
        const projectId = key.replace('recorded_samples_', '');
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const samples = JSON.parse(stored);
          if (samples && samples.length > 0) {
            projectIds.add(projectId);
          }
        }
      }
      
      setProjectsWithLocalData(projectIds);
    } catch (error) {
      console.error('Failed to check local data:', error);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await FirebaseService.getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Merge local data to Firebase CSV
  const mergeLocalDataToFirebase = async (projectId: string) => {
    try {
      const key = `recorded_samples_${projectId}`;
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return;
      
      const samples = JSON.parse(stored);
      if (!samples || samples.length === 0) return;
      
      console.log(`Merging ${samples.length} local samples to Firebase CSV for project ${projectId}`);
      
      // Convert local samples to records format for CSV
      const records = samples.map((sample: any) => ({
        timestamp: new Date(sample.timestamp).toISOString(),
        confidence: sample.confidence,
        ...sample.fields // Include all the extracted fields
      }));
      
      // Append to Firebase CSV
      const success = await FirebaseService.appendToProjectCSV(projectId, records);
      
      if (success) {
        // Clear local data after successful merge
        await AsyncStorage.removeItem(key);
        
        Alert.alert(
          'Sync Complete',
          `Successfully synced ${samples.length} records to project CSV in Firebase.`,
          [{ text: 'OK' }]
        );
        
        // Refresh local data check
        await checkLocalData();
      } else {
        throw new Error('Failed to append to Firebase CSV');
      }
      
    } catch (error) {
      console.error('Failed to merge data:', error);
      Alert.alert('Sync Failed', 'Failed to sync local data to Firebase CSV.');
    }
  };

  // Delete local data without syncing
  const deleteLocalData = async (projectId: string) => {
    try {
      const key = `recorded_samples_${projectId}`;
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return;
      
      const samples = JSON.parse(stored);
      if (!samples || samples.length === 0) return;
      
      Alert.alert(
        'Delete Local Data',
        `Are you sure you want to delete ${samples.length} local records? This action cannot be undone and the data will be permanently lost.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await AsyncStorage.removeItem(key);
                Alert.alert(
                  'Data Deleted',
                  `Successfully deleted ${samples.length} local records.`,
                  [{ text: 'OK' }]
                );
                // Refresh local data check
                await checkLocalData();
              } catch (error) {
                console.error('Failed to delete local data:', error);
                Alert.alert('Delete Failed', 'Failed to delete local data.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to delete local data:', error);
      Alert.alert('Delete Failed', 'Failed to delete local data.');
    }
  };

  // Load data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
      checkLocalData();
    }, [])
  );

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = projects.filter((project: Project) =>
    project.name.toLowerCase().includes(searchText.toLowerCase()) ||
    project.description.toLowerCase().includes(searchText.toLowerCase())
  );

  const getDatabaseIcon = (project: Project) => {
    if (project.csvContent || project.csvMetadata) {
      return 'document-text';
    }
    if (project.databaseType) {
      switch (project.databaseType.toLowerCase()) {
        case 'postgresql':
          return 'server';
        case 'mysql':
          return 'database';
        case 'filemaker':
          return 'document-text';
        default:
          return 'server-outline';
      }
    }
    return 'folder-outline';
  };

  const getProjectBadgeText = (project: Project) => {
    if (project.csvMetadata) {
      return 'CSV Data';
    }
    if (project.databaseType) {
      return project.databaseType;
    }
    return 'Project';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  };

  const getProjectColor = (project: Project) => {
    const colors = ['#EF9144', '#8B5CF6', '#10B981', '#3B82F6', '#F59E0B'];
    const index = project.name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getProgressColors = (project: Project): [string, string] => {
    const baseColor = getProjectColor(project);
    return [baseColor, baseColor + '80'];
  };

  const getProgressWidth = (project: Project) => {
    const entries = project.csvMetadata?.totalRows || project.dataColumns?.length || 0;
    const maxEntries = 100; // Arbitrary max for progress calculation
    const progress = Math.min(entries / maxEntries, 1);
    return `${progress * 100}%` as any; // Cast to satisfy React Native's DimensionValue type
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Ionicons name="library-outline" size={24} color="#EF9144" />
            </View>
            <Text style={styles.title}>Projects</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.searchButton}>
              <Ionicons name="search" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading projects...</Text>
          </View>
        ) : filteredProjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No projects found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchText ? 'Try adjusting your search' : 'Create your first project to get started'}
            </Text>
          </View>
        ) : (
          filteredProjects.map((project: Project) => (
            <TouchableOpacity
              key={project.id}
              style={styles.projectCard}
              onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}
            >
              <View style={styles.projectHeader}>
                <View style={styles.projectInfo}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <Text style={styles.projectDescription} numberOfLines={2}>
                    {project.description}
                  </Text>
                </View>
                <View style={[styles.databaseBadge, { backgroundColor: getProjectColor(project) }]}>
                  <Ionicons 
                    name={getDatabaseIcon(project) as any} 
                    size={16} 
                    color="white" 
                  />
                </View>
              </View>

              {/* Project Stats */}
              <View style={styles.projectFooter}>
                <View style={styles.projectStats}>
                  <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                  <Text style={styles.projectDate}>
                    {project.updatedAt ? `${getTimeAgo(project.updatedAt)} ago` : `${getTimeAgo(project.createdAt)} ago`}
                  </Text>
                  <Text style={styles.projectEntries}>
                    {project.csvMetadata?.totalRows || project.dataColumns?.length || 0} entries
                  </Text>
                </View>
              </View>

              {/* Tags */}
              {project.dataColumns && project.dataColumns.length > 0 && (
                <View style={styles.tagContainer}>
                  {project.dataColumns.slice(0, 3).map((column, idx) => (
                    <View key={idx} style={styles.tag}>
                      <Text style={styles.tagText}>{column}</Text>
                    </View>
                  ))}
                  {project.dataColumns.length > 3 && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>+{project.dataColumns.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={getProgressColors(project)}
                  style={[styles.progressFill, { width: getProgressWidth(project) }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>

              {/* Local Data Action Buttons */}
              {projectsWithLocalData.has(project.id) && (
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={styles.syncButton}
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent card navigation
                      Alert.alert(
                        'Sync to Project CSV', 
                        'You have unsynced local data for this project. Would you like to add it to the project CSV in Firebase?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Sync to CSV', onPress: () => mergeLocalDataToFirebase(project.id) }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="cloud-upload-outline" size={14} color="#3B82F6" />
                    <Text style={styles.syncButtonText}>Sync</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent card navigation
                      deleteLocalData(project.id);
                    }}
                  >
                    <Ionicons name="trash-outline" size={14} color="#F44336" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
        
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 248, 243, 0.95)', // Peach-white gradient base
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    marginRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  searchButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  projectCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  databaseBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  databaseText: {
    fontSize: 11,
    color: '#EF9144',
    fontWeight: '500',
    marginTop: 2,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  projectStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  projectDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  projectEntries: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginLeft: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    gap: 4,
  },
  syncButtonText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 11,
    color: '#F44336',
    fontWeight: '600',
  },
});
