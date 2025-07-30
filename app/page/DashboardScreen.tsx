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
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { MainTabParamList, RootStackParamList, RecentActivity, Project } from '../types/index';
import { SupabaseService } from '../services/supabaseService';
import { testSupabaseConnection } from '../services/testSupabase';

type DashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  StackNavigationProp<RootStackParamList>
>;

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
        colors={['rgba(239, 145, 68, 0.9)', 'rgba(254, 126, 66, 0.7)']}
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
            {/* My Work Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Work</Text>
              
              <TouchableOpacity 
                style={styles.workItem}
                onPress={() => navigation.navigate('Projects')}
              >
                <Ionicons name="folder-outline" size={28} color="#EF9144" />
                <View style={styles.workItemContent}>
                  <Text style={styles.workItemText}>Projects</Text>
                  <Text style={styles.workItemSubtext}>{projects.length} projects</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(37, 51, 94, 0.4)" />
              </TouchableOpacity>
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
          colors={['#EF9144', '#FE7E42']}
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
    backgroundColor: 'rgba(255, 248, 243, 0.95)', // Peach-white gradient base
  },
  header: {
    paddingTop: 25,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#25335E',
    marginBottom: 18,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 145, 68, 0.3)',
    shadowColor: '#EF9144',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#25335E',
    fontWeight: '500',
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
    fontSize: 22,
    fontWeight: '700',
    color: '#25335E',
    marginBottom: 18,
  },
  workItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#EF9144',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(239, 145, 68, 0.2)',
  },
  workItemContent: {
    flex: 1,
    marginLeft: 15,
  },
  workItemText: {
    fontSize: 18,
    color: '#25335E',
    fontWeight: '600',
  },
  workItemSubtext: {
    fontSize: 14,
    color: 'rgba(37, 51, 94, 0.6)',
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
