import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LeafletMap from '../../components/LeafletMap';
import { Platform } from 'react-native';
import FirebaseService from '../../services/firebaseService';
import { DataProcessingService } from '../../services/dataProcessingService';
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
  const [activeTab, setActiveTab] = useState<'log' | 'insights' | 'details'>('log');
  const [commitLogs, setCommitLogs] = useState<Array<Record<string, any>>>([]);
  const [projectSamples, setProjectSamples] = useState<Array<Record<string, any>>>([]);
  const [analytics, setAnalytics] = useState<Record<string, any>>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'voice' | 'camera' | 'today'>('all');
  const [searchText, setSearchText] = useState('');
  const [gisPoints, setGisPoints] = useState<Array<{
    id: string;
    latitude: number;
    longitude: number;
    timestamp: Date;
    properties?: Record<string, any>;
  }>>([]);

  useEffect(() => {
    loadProject();
    loadRecords();
    loadCommitLogs();
    loadProjectSamples();
    loadAnalytics();
  }, [projectId]);

  // Load GIS points after project is loaded
  useEffect(() => {
    if (project) {
      loadGISPoints();
    }
  }, [project]);

  const loadProject = async () => {
    try {
      const fetchedProject = await FirebaseService.getProject(projectId);
      
      // Auto-detect coordinate columns if not already set
      if (fetchedProject.dataColumns && !fetchedProject.gisEnabled) {
        const detectedCoordinates = DataProcessingService.detectCoordinateColumns(fetchedProject.dataColumns);
        if (detectedCoordinates) {
          fetchedProject.gisEnabled = true;
          fetchedProject.coordinateColumns = detectedCoordinates;
          console.log('✅ Auto-detected GIS coordinates:', detectedCoordinates);
          
          // Update project in Firebase with GIS settings
          try {
            await FirebaseService.updateProject(projectId, {
              gisEnabled: true,
              coordinateColumns: detectedCoordinates
            });
            console.log('✅ Updated project with GIS settings');
          } catch (updateError) {
            console.warn('Could not update project with GIS settings:', updateError);
          }
        }
      }
      
      setProject(fetchedProject);
    } catch (error) {
      console.error('Error loading project:', error);
      Alert.alert('Error', 'Failed to load project');
    }
  };

  const loadCommitLogs = async () => {
    try {
      const logs = await FirebaseService.getCommitLogs(projectId);
      setCommitLogs(logs);
    } catch (error) {
      console.error('Error loading commit logs:', error);
    }
  };

  const loadProjectSamples = async () => {
    try {
      const samples = await FirebaseService.getProjectSamples(projectId);
      setProjectSamples(samples);
    } catch (error) {
      console.error('Error loading project samples:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const analyticsData = await FirebaseService.getProjectAnalytics(projectId);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      
      // Load both regular records and commit logs
      const [result, commitLogsData] = await Promise.all([
        FirebaseService.getDataRecords(projectId),
        FirebaseService.getCommitLogs(projectId)
      ]);

      // Map the regular records to include metadata if method is available
      const mappedRecords = result.records.map((record: any) => ({
        ...record,
        metadata: record.method ? {
          recordingMethod: record.method as 'voice' | 'image' | 'manual'
        } : undefined
      }));

      // Convert commit logs to records format
      const commitRecords = commitLogsData.map((log: any) => ({
        id: `commit_${log.id}`,
        projectId,
        data: {
          action: log.action,
          description: log.description,
          recordsAdded: log.recordsAdded
        },
        method: 'sync',
        source: 'mobile_commit',
        createdAt: log.timestamp,
        metadata: {
          recordingMethod: 'manual' as const,
          isCommitLog: true
        }
      }));

      // Combine and sort by creation date
      const allRecords = [...mappedRecords, ...commitRecords]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setRecords(allRecords);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGISPoints = async () => {
    try {
      if (!project?.gisEnabled || !project?.coordinateColumns) {
        return;
      }

      console.log('🗺️ Loading GIS points for project:', projectId);
      const gisData: Array<{
        id: string;
        latitude: number;
        longitude: number;
        timestamp: Date;
        properties?: Record<string, any>;
      }> = [];

      // Try to load from multiple sources
      
      // 1. Load from local AsyncStorage first
      const STORAGE_KEY = `recorded_samples_${projectId}`;
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (stored) {
        const samples = JSON.parse(stored);
        console.log(`🗺️ Found ${samples.length} local samples`);

        samples.forEach((sample: any) => {
          const latField = project.coordinateColumns!.latitude;
          const lngField = project.coordinateColumns!.longitude;
          
          if (sample.fields[latField] && sample.fields[lngField]) {
            const latitude = parseFloat(sample.fields[latField]);
            const longitude = parseFloat(sample.fields[lngField]);
            
            if (!isNaN(latitude) && !isNaN(longitude)) {
              // Extract other properties (exclude coordinate fields)
              const properties: Record<string, any> = {};
              Object.entries(sample.fields).forEach(([key, value]) => {
                if (key !== latField && key !== lngField) {
                  properties[key] = value;
                }
              });

              gisData.push({
                id: sample.id,
                latitude,
                longitude,
                timestamp: new Date(sample.timestamp),
                properties: Object.keys(properties).length > 0 ? properties : undefined
              });
            }
          }
        });
      }

      // 2. If no local data, try to get from Firebase project samples
      if (gisData.length === 0) {
        console.log('🗺️ No local GIS data, trying Firebase project samples...');
        try {
          const projectSamplesData = await FirebaseService.getProjectSamples(projectId);
          console.log(`🗺️ Found ${projectSamplesData.length} Firebase samples`);
          
          projectSamplesData.forEach((sample: any, index: number) => {
            const latField = project.coordinateColumns!.latitude;
            const lngField = project.coordinateColumns!.longitude;
            
            const latitude = parseFloat(sample[latField]);
            const longitude = parseFloat(sample[lngField]);
            
            if (!isNaN(latitude) && !isNaN(longitude)) {
              // Extract other properties (exclude coordinate fields)
              const properties: Record<string, any> = {};
              Object.entries(sample).forEach(([key, value]) => {
                if (key !== latField && key !== lngField && key !== 'timestamp' && key !== 'confidence') {
                  properties[key] = value;
                }
              });

              gisData.push({
                id: `firebase_${index}`,
                latitude,
                longitude,
                timestamp: sample.timestamp ? new Date(sample.timestamp) : new Date(),
                properties: Object.keys(properties).length > 0 ? properties : undefined
              });
            }
          });
        } catch (firebaseError) {
          console.log('🗺️ Firebase samples not available, checking analytics...');
        }
      }

      // 3. Always try analytics as additional source (regardless of Firebase availability)
      if (analytics.recentActivity && analytics.recentActivity.length > 0) {
        console.log(`🗺️ Checking ${analytics.recentActivity.length} analytics entries for additional GIS data`);
        
        analytics.recentActivity.forEach((activity: any, index: number) => {
          const latField = project.coordinateColumns!.latitude;
          const lngField = project.coordinateColumns!.longitude;
          
          const latitude = parseFloat(activity[latField]);
          const longitude = parseFloat(activity[lngField]);
          
          console.log(`🗺️ Analytics entry ${index}: lat=${activity[latField]}, lng=${activity[lngField]} -> parsed: ${latitude}, ${longitude}`);
          
          if (!isNaN(latitude) && !isNaN(longitude)) {
            // Extract other properties (exclude coordinate fields)
            const properties: Record<string, any> = {};
            Object.entries(activity).forEach(([key, value]) => {
              if (key !== latField && key !== lngField && key !== 'timestamp' && key !== 'confidence') {
                properties[key] = value;
              }
            });

            gisData.push({
              id: `analytics_${index}`,
              latitude,
              longitude,
              timestamp: activity.timestamp ? new Date(activity.timestamp) : new Date(),
              properties: Object.keys(properties).length > 0 ? properties : undefined
            });
            console.log(`🗺️ Added analytics GIS point: ${latitude}, ${longitude}`);
          } else {
            console.log(`🗺️ Skipped analytics entry ${index}: invalid coordinates`);
          }
        });
      } else {
        console.log('🗺️ No analytics data available for GIS points');
      }

      setGisPoints(gisData);
      console.log(`🗺️ Loaded ${gisData.length} total GIS points for project ${projectId}`);
      
      if (gisData.length > 0) {
        console.log('🗺️ Sample GIS point:', gisData[0]);
      }
    } catch (error) {
      console.error('Error loading GIS points:', error);
    }
  };

  const importCSVDataToLocal = async () => {
    try {
      if (!project?.csvMetadata?.sampleRows || !project?.coordinateColumns || !project?.dataColumns) {
        return;
      }

      // Check if we already imported CSV data before
      const importFlagKey = `csv_imported_${projectId}`;
      const alreadyImported = await AsyncStorage.getItem(importFlagKey);
      if (alreadyImported) {
        console.log('📊 CSV data already imported to insights, skipping...');
        return;
      }

      console.log('📊 Importing CSV data to local storage...');
      const STORAGE_KEY = `recorded_samples_${projectId}`;
      
      const importedSamples: any[] = [];
      const latColIndex = project.dataColumns.indexOf(project.coordinateColumns.latitude);
      const lngColIndex = project.dataColumns.indexOf(project.coordinateColumns.longitude);

      if (latColIndex === -1 || lngColIndex === -1) {
        console.warn('Could not find coordinate column indices');
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
              timestamp: new Date().toISOString(),
              fields: sampleFields,
              confidence: 1.0,
              source: 'csv_import'
            });
          }
        }
      });

      if (importedSamples.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(importedSamples));
        // Set flag to prevent re-importing
        await AsyncStorage.setItem(importFlagKey, 'true');
        console.log(`✅ Imported ${importedSamples.length} samples from CSV to local storage`);
        
        // Reload GIS points after import
        await loadGISPoints();
      }
    } catch (error) {
      console.error('Error importing CSV data:', error);
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

  const getRecordIcon = (method: string, isCommitLog?: boolean) => {
    if (isCommitLog) {
      return { name: 'cloud-upload-outline', color: '#EF9144' };
    }
    switch (method) {
      case 'voice':
        return { name: 'mic-outline', color: '#10B981' };
      case 'image':
        return { name: 'camera-outline', color: '#3B82F6' };
      case 'manual':
        return { name: 'create-outline', color: '#8B5CF6' };
      case 'sync':
        return { name: 'cloud-upload-outline', color: '#EF9144' };
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
    // Handle commit logs specially
    if (record.metadata?.isCommitLog) {
      return record.data.description || 'Sync operation completed';
    }

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
            style={[styles.tab, activeTab === 'details' && styles.activeTab]}
            onPress={() => setActiveTab('details')}
          >
            <Ionicons 
              name="information-circle-outline" 
              size={20} 
              color={activeTab === 'details' ? '#EF9144' : '#6B7280'} 
            />
            <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
              Details
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
                const isCommitLog = record.metadata?.isCommitLog || false;
                const icon = getRecordIcon(method, isCommitLog);
                const tags = extractTags(record.data);
                const content = getRecordContent(record);
                
                return (
                  <View key={record.id} style={styles.logEntry}>
                    <View style={styles.logHeader}>
                      <View style={[styles.logIcon, { backgroundColor: `${icon.color}20` }]}>
                        <Ionicons name={icon.name as any} size={14} color={icon.color} />
                      </View>
                      <Text style={[styles.logType, { color: icon.color }]}>
                        {isCommitLog ? 'Sync' : method.charAt(0).toUpperCase() + method.slice(1)}
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
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {analytics.totalRecords === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="bar-chart-outline" size={64} color="#E5E7EB" />
              </View>
              <Text style={styles.emptyStateText}>No data for analytics</Text>
              <Text style={styles.emptyStateSubtext}>
                Start recording data to see insights and analytics
              </Text>
            </View>
          ) : (
            <>
              {/* Overview Statistics */}
              <View style={styles.analyticsSection}>
                <Text style={styles.analyticsSectionTitle}>Data Overview</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="documents-outline" size={24} color="#10B981" />
                    </View>
                    <Text style={styles.statNumber}>{analytics.totalRecords || 0}</Text>
                    <Text style={styles.statLabel}>Total Records</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
                      <Ionicons name="grid-outline" size={24} color="#3B82F6" />
                    </View>
                    <Text style={styles.statNumber}>
                      {Object.keys(analytics.uniqueValues || {}).length}
                    </Text>
                    <Text style={styles.statLabel}>Data Fields</Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#EDE9FE' }]}>
                      <Ionicons name="checkmark-circle-outline" size={24} color="#8B5CF6" />
                    </View>
                    <Text style={styles.statNumber}>
                      {analytics.fieldCompleteness && Object.keys(analytics.fieldCompleteness).length > 0 ? 
                        Math.round((Object.values(analytics.fieldCompleteness || {}) as number[]).reduce((a: number, b: number) => a + b, 0) / Object.keys(analytics.fieldCompleteness).length) 
                        : 0}%
                    </Text>
                    <Text style={styles.statLabel}>Avg Completeness</Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#FEF3E2' }]}>
                      <Ionicons name="trending-up-outline" size={24} color="#EF9144" />
                    </View>
                    <Text style={styles.statNumber}>
                      {analytics.uniqueValues ? (Object.values(analytics.uniqueValues || {}) as number[]).reduce((a: number, b: number) => a + b, 0) : 0}
                    </Text>
                    <Text style={styles.statLabel}>Unique Values</Text>
                  </View>
                </View>
              </View>

              {/* GIS Map Section */}
              {project?.gisEnabled && project?.coordinateColumns && (
                <View style={styles.analyticsSection}>
                  <Text style={styles.analyticsSectionTitle}>GIS Locations</Text>
                  <View style={styles.mapContainer}>
                    {gisPoints.length > 0 ? (
                      <>
                        <LeafletMap
                          gisPoints={gisPoints}
                          style={styles.map}
                          onReady={() => {
                            console.log('🗺️ Leaflet map ready with', gisPoints.length, 'markers');
                          }}
                          onError={(error) => {
                            console.error('🗺️ Leaflet map error:', error);
                          }}
                        />
                        <View style={styles.mapStats}>
                          <Text style={styles.mapStatsText}>
                            📍 {gisPoints.length} locations recorded
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }]}>
                        <Text style={styles.mapStatsText}>
                          📍 No locations recorded yet
                        </Text>
                        <Text style={[styles.mapStatsText, { fontSize: 12, marginTop: 4 }]}>
                          Start recording to see data points on the map
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Field Completeness */}
              <View style={styles.analyticsSection}>
                <Text style={styles.analyticsSectionTitle}>Field Completeness</Text>
                <View style={styles.analyticsCard}>
                  {Object.keys(analytics.fieldCompleteness || {}).length === 0 ? (
                    <View style={styles.emptyAnalyticsCard}>
                      <Ionicons name="bar-chart-outline" size={32} color="#D1D5DB" />
                      <Text style={styles.emptyAnalyticsText}>No field data available</Text>
                    </View>
                  ) : (
                    Object.entries(analytics.fieldCompleteness || {}).map(([field, percentage]) => (
                      <View key={field} style={styles.fieldCompletenessItem}>
                        <View style={styles.fieldCompletenessHeader}>
                          <Text style={styles.fieldName}>{field}</Text>
                          <View style={styles.percentageBadge}>
                            <Text style={styles.percentageText}>{percentage}%</Text>
                          </View>
                        </View>
                        <View style={styles.progressBar}>
                          <View 
                            style={[
                              styles.progressFill, 
                              { 
                                width: `${percentage}%`, 
                                backgroundColor: (percentage as number) >= 80 ? '#10B981' : (percentage as number) >= 50 ? '#EF9144' : '#EF4444' 
                              }
                            ]}
                          />
                        </View>
                        <View style={styles.fieldStats}>
                          <Text style={styles.fieldStatsText}>
                            {analytics.uniqueValues?.[field] || 0} unique values
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>

              {/* Top Values */}
              <View style={styles.analyticsSection}>
                <Text style={styles.analyticsSectionTitle}>Most Common Values</Text>
                <View style={styles.analyticsCard}>
                  {Object.keys(analytics.topValues || {}).length === 0 ? (
                    <View style={styles.emptyAnalyticsCard}>
                      <Ionicons name="list-outline" size={32} color="#D1D5DB" />
                      <Text style={styles.emptyAnalyticsText}>No common values data</Text>
                    </View>
                  ) : (
                    Object.entries(analytics.topValues || {}).map(([field, values]: [string, any]) => (
                      values && values.length > 0 && (
                        <View key={field} style={styles.topValuesField}>
                          <Text style={styles.topValuesFieldName}>{field}</Text>
                          {values.slice(0, 3).map((item: any, index: number) => (
                            <View key={index} style={styles.topValueItem}>
                              <View style={styles.topValueRank}>
                                <Text style={styles.topValueRankText}>{index + 1}</Text>
                              </View>
                              <Text style={styles.topValueText}>{item.value}</Text>
                              <View style={styles.topValueBadge}>
                                <Text style={styles.topValueCount}>{item.count}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )
                    ))
                  )}
                </View>
              </View>

              {/* Recent Activity */}
              <View style={styles.analyticsSection}>
                <Text style={styles.analyticsSectionTitle}>Recent Entries</Text>
                <View style={styles.analyticsCard}>
                  {!analytics.recentActivity || analytics.recentActivity.length === 0 ? (
                    <View style={styles.emptyAnalyticsCard}>
                      <Ionicons name="time-outline" size={32} color="#D1D5DB" />
                      <Text style={styles.emptyAnalyticsText}>No recent activity</Text>
                    </View>
                  ) : (
                    (analytics.recentActivity || []).slice(0, 5).map((entry: any, index: number) => (
                      <View key={index} style={styles.recentEntryItem}>
                        <View style={styles.recentEntryHeader}>
                          <View style={styles.recentEntryIconContainer}>
                            <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                          </View>
                          <Text style={styles.recentEntryTime}>
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : 'Recent'}
                          </Text>
                          <View style={styles.recentEntryIndex}>
                            <Text style={styles.recentEntryIndexText}>#{index + 1}</Text>
                          </View>
                        </View>
                        <View style={styles.recentEntryContent}>
                          {Object.entries(entry).map(([key, value]) => (
                            key !== 'timestamp' && key !== 'confidence' && value && (
                              <View key={key} style={styles.recentEntryField}>
                                <Text style={styles.recentEntryLabel}>{key}:</Text>
                                <Text style={styles.recentEntryValue}>{String(value)}</Text>
                              </View>
                            )
                          ))}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {activeTab === 'details' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {!project ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading project details...</Text>
            </View>
          ) : (
            <>
              {/* Project Information */}
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Project Information</Text>
                <View style={styles.detailsCard}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{project.name}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{project.description || 'No description provided'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Created</Text>
                    <Text style={styles.detailValue}>
                      {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Last Updated</Text>
                    <Text style={styles.detailValue}>
                      {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Never'}
                    </Text>
                  </View>
                  {project.databaseType && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Database Type</Text>
                      <Text style={styles.detailValue}>{project.databaseType}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Data Schema */}
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Data Schema</Text>
                {project.dataColumns && project.dataColumns.length > 0 ? (
                  <View style={styles.detailsCard}>
                    <Text style={styles.schemaSubtitle}>Fields ({project.dataColumns.length})</Text>
                    {project.dataColumns.map((column, index) => (
                      <View key={index} style={styles.schemaItem}>
                        <View style={styles.schemaHeader}>
                          <Text style={styles.schemaFieldName}>
                            {typeof column === 'string' ? column : column.name || `Field ${index + 1}`}
                          </Text>
                          <View style={styles.schemaTypeContainer}>
                            <Text style={styles.schemaType}>
                              {typeof column === 'object' && column.type ? column.type : 'text'}
                            </Text>
                          </View>
                        </View>
                        {typeof column === 'object' && column.description && (
                          <Text style={styles.schemaDescription}>{column.description}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.detailsCard}>
                    <Text style={styles.emptySchemaText}>No data schema defined</Text>
                  </View>
                )}
              </View>

              {/* Column Annotations */}
              {project.columnAnnotations && Object.keys(project.columnAnnotations).length > 0 && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Column Annotations</Text>
                  <View style={styles.detailsCard}>
                    {Object.entries(project.columnAnnotations).map(([key, value]) => (
                      <View key={key} style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{key}</Text>
                        <Text style={styles.detailValue}>{String(value)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* General Annotations */}
              {project.generalAnnotations && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>General Annotations</Text>
                  <View style={styles.detailsCard}>
                    <Text style={styles.detailValue}>{project.generalAnnotations}</Text>
                  </View>
                </View>
              )}

              {/* CSV Metadata */}
              {project.csvMetadata && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Data Statistics</Text>
                  <View style={styles.detailsCard}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Total Rows</Text>
                      <Text style={styles.detailValue}>{project.csvMetadata.totalRows || 0}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>File Name</Text>
                      <Text style={styles.detailValue}>{project.csvMetadata.fileName || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>File Size</Text>
                      <Text style={styles.detailValue}>
                        {project.csvMetadata.fileSize ? `${(project.csvMetadata.fileSize / 1024).toFixed(2)} KB` : 'N/A'}
                      </Text>
                    </View>
                    {project.csvMetadata.lastUpdated && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Data Last Updated</Text>
                        <Text style={styles.detailValue}>
                          {new Date(project.csvMetadata.lastUpdated).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
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
  samplesContainer: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  samplesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sampleItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  sampleField: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  sampleFieldName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    width: 100,
  },
  sampleFieldValue: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  sampleTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginHorizontal: 4,
  },
  detailsCard: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  detailItem: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  schemaSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  schemaItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  schemaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  schemaFieldName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  schemaTypeContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  schemaType: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  schemaDescription: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  emptySchemaText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  // Analytics Styles
  analyticsSection: {
    marginBottom: 20,
  },
  analyticsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginHorizontal: 4,
  },
  analyticsCard: {
    backgroundColor: '#FAFBFC',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 4,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  fieldCompletenessItem: {
    marginBottom: 16,
  },
  fieldCompletenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  percentageBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  fieldStats: {
    marginTop: 6,
  },
  fieldStatsText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  topValuesField: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topValuesFieldName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  topValueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 4,
  },
  topValueRank: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF9144',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  topValueRankText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  topValueText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  topValueBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topValueCount: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  recentEntryItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  recentEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentEntryIconContainer: {
    marginRight: 8,
  },
  recentEntryTime: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  recentEntryIndex: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recentEntryIndexText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
  },
  recentEntryContent: {
    marginLeft: 24,
  },
  recentEntryField: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  recentEntryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    width: 80,
  },
  recentEntryValue: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  emptyAnalyticsCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyAnalyticsText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyAnalyticsSubtext: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 4,
    textAlign: 'center',
  },
  mapContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  map: {
    height: 200,
    width: '100%',
  },
  mapStats: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  mapStatsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});
