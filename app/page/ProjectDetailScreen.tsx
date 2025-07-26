import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp, RouteProp } from '@react-navigation/stack';
import type { RootStackParamList, RecentActivity } from '../types';

type ProjectDetailNavigationProp = StackNavigationProp<RootStackParamList>;
type ProjectDetailRouteProp = RouteProp<RootStackParamList, 'ProjectDetail'>;

// Mock project data
const mockProject = {
  id: 'proj1',
  name: 'Tharros Project',
  description: 'Tharros project is a demonstration project that is used to convey the functionalities of the Merg program and how it can help facilitate field specialists to record data at a faster and more efficient rate.',
  createdAt: new Date('2025-07-20'),
  totalRecords: 1247,
  lastActivity: new Date('2025-07-25T10:30:00'),
};

const mockRecentActivity: RecentActivity[] = [
  {
    id: '1',
    type: 'commit',
    description: 'user37 committed new data',
    projectId: 'proj1',
    projectName: 'Tharros Project',
    timestamp: new Date('2025-07-25T10:30:00'),
  },
  {
    id: '2',
    type: 'create',
    description: 'user37 started new data column',
    projectId: 'proj1',
    projectName: 'Tharros Project',
    timestamp: new Date('2025-07-25T09:15:00'),
  },
  {
    id: '3',
    type: 'commit',
    description: 'new_user committed data',
    projectId: 'proj1',
    projectName: 'Tharros Project',
    timestamp: new Date('2025-07-25T08:45:00'),
  },
];

const projectActions = [
  {
    id: 'data-logs',
    title: 'Data Logs',
    icon: 'document-text-outline',
    description: 'View all data entries and logs',
  },
  {
    id: 'database',
    title: 'Database',
    icon: 'server-outline',
    description: 'View database schema and structure',
  },
  {
    id: 'data-schema',
    title: 'Data Schema',
    icon: 'grid-outline',
    description: 'Configure data fields and validation',
  },
];

export default function ProjectDetailScreen() {
  const navigation = useNavigation<ProjectDetailNavigationProp>();
  const route = useRoute<ProjectDetailRouteProp>();
  const [searchText, setSearchText] = useState('');

  const { projectId } = route.params;

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'commit':
        return { name: 'checkmark-circle', color: '#4CAF50' };
      case 'create':
        return { name: 'add-circle', color: '#2196F3' };
      case 'update':
        return { name: 'refresh-circle', color: '#FF9800' };
      default:
        return { name: 'ellipse', color: '#757575' };
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  const handleStartRecording = () => {
    navigation.navigate('DataRecording', { projectId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFE5E5', '#FFF0F0']}
        style={styles.header}
      >
        <Text style={styles.title}>{mockProject.name}</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search or tap to talk"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#666"
          />
          <TouchableOpacity style={styles.voiceButton}>
            <Ionicons name="mic" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Project Info */}
        <View style={styles.section}>
          <Text style={styles.description}>{mockProject.description}</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{mockProject.totalRecords.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Records</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatTime(mockProject.lastActivity)}</Text>
              <Text style={styles.statLabel}>Last Activity</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {mockRecentActivity.map((activity) => {
            const icon = getActivityIcon(activity.type);
            return (
              <View key={activity.id} style={styles.activityItem}>
                <Ionicons name={icon.name as any} size={20} color={icon.color} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>{activity.description}</Text>
                  <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          {projectActions.map((action) => (
            <TouchableOpacity key={action.id} style={styles.actionItem}>
              <View style={styles.actionIconContainer}>
                <Ionicons name={action.icon as any} size={24} color="#007AFF" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleStartRecording}
      >
        <LinearGradient
          colors={['#4CAF50', '#388E3C']}
          style={styles.fabGradient}
        >
          <Ionicons name="mic" size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  voiceButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 25,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
