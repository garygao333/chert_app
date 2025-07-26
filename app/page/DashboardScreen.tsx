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
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, RecentActivity } from '../types';

type DashboardNavigationProp = StackNavigationProp<RootStackParamList>;

// Mock data - replace with real data from Supabase
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
    projectId: 'proj2',
    projectName: 'Field Survey 2025',
    timestamp: new Date('2025-07-25T08:45:00'),
  },
];

const mockProjects = [
  { id: 'proj1', name: 'Tharros Project', status: 'active' },
  { id: 'proj2', name: 'Field Survey 2025', status: 'active' },
  { id: 'proj3', name: 'Archaeological Site A', status: 'completed' },
];

const mockOrganizations = [
  { id: 'org1', name: 'University Research Lab' },
  { id: 'org2', name: 'Archaeological Society' },
];

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();
  const [searchText, setSearchText] = useState('');

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

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={styles.header}
      >
        <Text style={styles.title}>Dashboard</Text>
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
        {/* My Work Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Work</Text>
          
          <TouchableOpacity 
            style={styles.workItem}
            onPress={() => navigation.navigate('Projects')}
          >
            <Ionicons name="folder-outline" size={24} color="#007AFF" />
            <Text style={styles.workItemText}>Projects</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.workItem}>
            <Ionicons name="business-outline" size={24} color="#007AFF" />
            <Text style={styles.workItemText}>Organizations</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Recent Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {mockRecentActivity.slice(0, 3).map((activity) => {
            const icon = getActivityIcon(activity.type);
            return (
              <TouchableOpacity 
                key={activity.id} 
                style={styles.activityItem}
                onPress={() => navigation.navigate('ProjectDetail', { projectId: activity.projectId })}
              >
                <Ionicons name={icon.name as any} size={20} color={icon.color} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>{activity.description}</Text>
                  <Text style={styles.activityProject}>{activity.projectName}</Text>
                </View>
                <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          {mockRecentActivity.map((activity) => (
            <TouchableOpacity 
              key={activity.id} 
              style={styles.activityItem}
              onPress={() => navigation.navigate('ProjectDetail', { projectId: activity.projectId })}
            >
              <View style={styles.activityIconContainer}>
                <Ionicons name="document-text-outline" size={20} color="#666" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{activity.projectName} reached 1000 data</Text>
                <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('CreateProject')}
      >
        <LinearGradient
          colors={['#007AFF', '#0056CC']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="white" />
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
    color: 'white',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  workItem: {
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
  workItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
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
  activityIconContainer: {
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  activityProject: {
    fontSize: 12,
    color: '#666',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
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
