import React, { useState, useEffect } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList, RecentActivity, Project } from '../types/index';
import { SupabaseService } from '../services/supabaseService';
import { testSupabaseConnection } from '../services/testSupabase';

type DashboardNavigationProp = StackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();
  const [searchText, setSearchText] = useState('');
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalRecords: 0,
    recentActivityCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Test connection first (for debugging)
      console.log('🔍 Testing Supabase connection...');
      await testSupabaseConnection();
      
      // Load data in parallel
      const [activityData, projectsData, statsData] = await Promise.all([
        SupabaseService.getRecentActivity(10),
        SupabaseService.getProjects(),
        SupabaseService.getDashboardStats()
      ]);

      setRecentActivity(activityData);
      setProjects(projectsData);
      setDashboardStats(statsData);
      
      console.log('📊 Dashboard data loaded:', {
        projects: projectsData.length,
        activities: activityData.length,
        stats: statsData
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Load data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  useEffect(() => {
    loadDashboardData();
  }, []);

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
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (
          <>
            {/* Dashboard Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{dashboardStats.totalProjects}</Text>
                  <Text style={styles.statLabel}>Total Projects</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{dashboardStats.activeProjects}</Text>
                  <Text style={styles.statLabel}>Active Projects</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{dashboardStats.totalRecords.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Total Records</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{dashboardStats.recentActivityCount}</Text>
                  <Text style={styles.statLabel}>Recent Activity</Text>
                </View>
              </View>
            </View>

            {/* My Work Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Work</Text>
              
              <TouchableOpacity 
                style={styles.workItem}
                onPress={() => navigation.navigate('Projects')}
              >
                <Ionicons name="folder-outline" size={24} color="#007AFF" />
                <View style={styles.workItemContent}>
                  <Text style={styles.workItemText}>Projects</Text>
                  <Text style={styles.workItemSubtext}>{projects.length} projects</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.workItem}>
                <Ionicons name="business-outline" size={24} color="#007AFF" />
                <View style={styles.workItemContent}>
                  <Text style={styles.workItemText}>Organizations</Text>
                  <Text style={styles.workItemSubtext}>View organizations</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>

            {/* Recent Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent</Text>
              {recentActivity.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No recent activity</Text>
                  <Text style={styles.emptyStateSubtext}>Start recording data to see activity here</Text>
                </View>
              ) : (
                recentActivity.slice(0, 3).map((activity) => {
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
                })
              )}
            </View>

            {/* Activity Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All Activity</Text>
              {recentActivity.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No activity yet</Text>
                  <Text style={styles.emptyStateSubtext}>Create a project and start recording data</Text>
                </View>
              ) : (
                recentActivity.map((activity) => (
                  <TouchableOpacity 
                    key={activity.id} 
                    style={styles.activityItem}
                    onPress={() => navigation.navigate('ProjectDetail', { projectId: activity.projectId })}
                  >
                    <View style={styles.activityIconContainer}>
                      <Ionicons name="document-text-outline" size={20} color="#666" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText}>{activity.description}</Text>
                      <Text style={styles.activityProject}>{activity.projectName}</Text>
                      <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
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
  workItemContent: {
    flex: 1,
    marginLeft: 15,
  },
  workItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  workItemSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
