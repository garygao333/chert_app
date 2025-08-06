import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import FirebaseService from '../../services/firebaseService';
import { Project, RootStackParamList } from '../../types';

// Simple record type for this screen
interface ProjectRecord {
  id: string;
  projectId: string;
  data: Record<string, any>;
  method?: string;
  source?: string;
  createdAt: Date;
  metadata?: {
    recordingMethod?: 'voice' | 'image' | 'manual';
  };
}

export default function EnhancedProjectDetailScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { projectId } = route.params as { projectId: string };

  const [project, setProject] = useState<Project | null>(null);
  const [records, setRecords] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'log' | 'insights' | 'export'>('log');
  const [activeFilter, setActiveFilter] = useState<'all' | 'voice' | 'camera' | 'today'>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadProject();
    loadRecords();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const fetchedProject = await FirebaseService.getProject(projectId);
      setProject(fetchedProject);
    } catch (error) {
      console.error('Error loading project:', error);
      Alert.alert('Error', 'Failed to load project');
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const result = await FirebaseService.getDataRecords(projectId);
      // Map the records to include metadata if method is available
      const mappedRecords = result.records.map((record: any) => ({
        ...record,
        metadata: record.method ? {
          recordingMethod: record.method as 'voice' | 'image' | 'manual'
        } : undefined
      }));
      setRecords(mappedRecords);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleStartRecording = () => {
    navigation.navigate('DataRecording', { projectId });
  };

  const getRecordIcon = (method: string) => {
    switch (method) {
      case 'voice':
        return { name: 'mic-outline', color: '#10B981' };
      case 'image':
        return { name: 'camera-outline', color: '#3B82F6' };
      case 'manual':
        return { name: 'create-outline', color: '#8B5CF6' };
      default:
        return { name: 'document-outline', color: '#6B7280' };
    }
  };

  const extractTags = (data: any) => {
    // Extract meaningful tags from the data
    if (!data) return [];
    const tags: string[] = [];
    
    // Add column names that have values
    Object.entries(data).forEach(([key, value]) => {
      if (value && typeof value === 'string' && value.length > 0) {
        tags.push(key);
      }
    });
    
    return tags.slice(0, 3); // Show max 3 tags
  };

  const getRecordContent = (record: ProjectRecord) => {
    // Get the first non-empty value from the data
    if (!record.data) return 'No content';
    
    const values = Object.values(record.data);
    const content = values.find(v => v && typeof v === 'string' && v.length > 0);
    
    return content ? String(content).substring(0, 100) + (String(content).length > 100 ? '...' : '') : 'No content';
  };

  const filteredRecords = records.filter(record => {
    // Apply filter
    const method = record.metadata?.recordingMethod || 'manual';
    if (activeFilter === 'voice' && method !== 'voice') return false;
    if (activeFilter === 'camera' && method !== 'image') return false;
    if (activeFilter === 'today') {
      const today = new Date();
      const recordDate = record.createdAt;
      if (
        today.getDate() !== recordDate.getDate() ||
        today.getMonth() !== recordDate.getMonth() ||
        today.getFullYear() !== recordDate.getFullYear()
      ) {
        return false;
      }
    }
    
    // Apply search
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const content = getRecordContent(record).toLowerCase();
      const hasMatch = content.includes(searchLower) || 
        Object.values(record.data || {}).some(v => 
          String(v).toLowerCase().includes(searchLower)
        );
      if (!hasMatch) return false;
    }
    
    return true;
  });

  if (!project) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Mobile-Friendly Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle} numberOfLines={1}>
            {project.name}
          </Text>
          
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
        
        {/* Compact Project Info */}
        <View style={styles.projectInfo}>
          <View style={[styles.projectIcon, { backgroundColor: '#EF9144' }]}>
            <Ionicons name="folder" size={20} color="white" />
          </View>
          <View style={styles.projectDetails}>
            <Text style={styles.projectName}>{project.name}</Text>
            <Text style={styles.projectDescription} numberOfLines={1}>
              {project.description}
            </Text>
          </View>
        </View>
      </View>

      {/* Mobile Tab Bar */}
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
        >
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'log' && styles.activeTab]}
            onPress={() => setActiveTab('log')}
          >
            <Ionicons 
              name="list-outline" 
              size={20} 
              color={activeTab === 'log' ? '#EF9144' : '#6B7280'} 
            />
            <Text style={[styles.tabText, activeTab === 'log' && styles.activeTabText]}>
              Log
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'insights' && styles.activeTab]}
            onPress={() => setActiveTab('insights')}
          >
            <Ionicons 
              name="analytics-outline" 
              size={20} 
              color={activeTab === 'insights' ? '#EF9144' : '#6B7280'} 
            />
            <Text style={[styles.tabText, activeTab === 'insights' && styles.activeTabText]}>
              Insights
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'export' && styles.activeTab]}
            onPress={() => setActiveTab('export')}
          >
            <Ionicons 
              name="download-outline" 
              size={20} 
              color={activeTab === 'export' ? '#EF9144' : '#6B7280'} 
            />
            <Text style={[styles.tabText, activeTab === 'export' && styles.activeTabText]}>
              Export
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Filter Pills for Mobile */}
      {activeTab === 'log' && (
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity 
              style={[styles.filterPill, activeFilter === 'all' && styles.activeFilterPill]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterPillText, activeFilter === 'all' && styles.activeFilterPillText]}>
                All
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterPill, activeFilter === 'voice' && styles.activeFilterPill]}
              onPress={() => setActiveFilter('voice')}
            >
              <Ionicons 
                name="mic" 
                size={14} 
                color={activeFilter === 'voice' ? '#EF9144' : '#6B7280'} 
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.filterPillText, activeFilter === 'voice' && styles.activeFilterPillText]}>
                Voice
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterPill, activeFilter === 'camera' && styles.activeFilterPill]}
              onPress={() => setActiveFilter('camera')}
            >
              <Ionicons 
                name="camera" 
                size={14} 
                color={activeFilter === 'camera' ? '#EF9144' : '#6B7280'} 
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.filterPillText, activeFilter === 'camera' && styles.activeFilterPillText]}>
                Camera
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterPill, activeFilter === 'today' && styles.activeFilterPill]}
              onPress={() => setActiveFilter('today')}
            >
              <Ionicons 
                name="today" 
                size={14} 
                color={activeFilter === 'today' ? '#EF9144' : '#6B7280'} 
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.filterPillText, activeFilter === 'today' && styles.activeFilterPillText]}>
                Today
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {activeTab === 'log' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading entries...</Text>
            </View>
          ) : filteredRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="document-text-outline" size={64} color="#E5E7EB" />
              </View>
              <Text style={styles.emptyStateText}>No entries yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to start recording data
              </Text>
            </View>
          ) : (
            <>
              {filteredRecords.map((record) => {
                const method = record.metadata?.recordingMethod || 'manual';
                const icon = getRecordIcon(method);
                const tags = extractTags(record.data);
                const content = getRecordContent(record);
                
                return (
                  <View key={record.id} style={styles.logEntry}>
                    <View style={styles.logHeader}>
                      <View style={[styles.logIcon, { backgroundColor: `${icon.color}20` }]}>
                        <Ionicons name={icon.name as any} size={14} color={icon.color} />
                      </View>
                      <Text style={[styles.logType, { color: icon.color }]}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </Text>
                      <Text style={styles.logTime}>{getTimeAgo(record.createdAt)}</Text>
                    </View>
                    <Text style={styles.logContent}>{content}</Text>
                    {tags.length > 0 && (
                      <View style={styles.logTags}>
                        {tags.map((tag, index) => (
                          <View key={index} style={styles.logTag}>
                            <Text style={styles.logTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

            </>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* Floating Action Button for Mobile */}
      {activeTab === 'log' && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={handleStartRecording}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      )}

      {activeTab === 'insights' && (
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsText}>Insights coming soon...</Text>
        </View>
      )}

      {activeTab === 'export' && (
        <View style={styles.exportContainer}>
          <Text style={styles.exportText}>Export functionality coming soon...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 248, 243, 0.95)', // Peach-white gradient base
  },
  header: {
    backgroundColor: 'rgba(255, 248, 243, 0.95)', // Match container background
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  projectDetails: {
    flex: 1,
    marginLeft: 12,
  },
  projectName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  projectDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabContainer: {
    backgroundColor: 'rgba(255, 248, 243, 0.95)', // Match container background
    paddingBottom: 8,
  },
  tabScroll: {
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: '#FEF3E2',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#EF9144',
    fontWeight: '600',
  },
  filterContainer: {
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 248, 243, 0.95)', // Match container background
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FAFBFC',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterPill: {
    backgroundColor: '#FEF3E2',
    borderColor: '#EF9144',
  },
  filterPillText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterPillText: {
    color: '#EF9144',
    fontWeight: '600',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  logEntry: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logType: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  logTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  logContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  logTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  logTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 4,
  },
  logTagText: {
    fontSize: 12,
    color: '#6B7280',
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addEntryText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  insightsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightsText: {
    fontSize: 16,
    color: '#666',
  },
  exportContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportText: {
    fontSize: 16,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF9144',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
