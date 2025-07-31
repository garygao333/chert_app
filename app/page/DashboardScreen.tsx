import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Test connection first (for debugging)
      console.log('🔍 Testing Supabase connection...');
      await testSupabaseConnection();
      
      // Load projects data
      const projectsData = await SupabaseService.getProjects();
      setProjects(projectsData);
      
      console.log('📊 Dashboard data loaded:', {
        projects: projectsData.length,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section with Logo */}
        <View style={styles.heroSection}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.welcomeTitle}>Chert</Text>
          <Text style={styles.welcomeSubtitle}>
            Generalized plug-and-play voice & image conversational agent for human-in-the-loop field data recording
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Get Started</Text>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateProject')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="add-circle-outline" size={32} color="#EF9144" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Create New Project</Text>
              <Text style={styles.actionDescription}>Start a new data collection project</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(37, 51, 94, 0.4)" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.jumpTo('Projects')}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="folder-outline" size={32} color="#EF9144" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Projects</Text>
              <Text style={styles.actionDescription}>
                {loading ? 'Loading...' : `${projects.length} projects`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(37, 51, 94, 0.4)" />
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 248, 243, 0.95)', // Peach-white gradient base
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#25335E',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(37, 51, 94, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  // Quick Actions
  quickActions: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#25335E',
    marginBottom: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(239, 145, 68, 0.2)',
    shadowColor: '#EF9144',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(239, 145, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#25335E',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: 'rgba(37, 51, 94, 0.7)',
  },
  // Features Section
  featuresSection: {
    marginTop: 40,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  featureCard: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(254, 126, 66, 0.2)',
    shadowColor: '#FE7E42',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#25335E',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 13,
    color: 'rgba(37, 51, 94, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
