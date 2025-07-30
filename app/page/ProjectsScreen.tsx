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
import type { RootStackParamList, Project } from '../types/index.js';
import { SupabaseService } from '../services/supabaseService';

type ProjectsNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ProjectsScreen() {
  const navigation = useNavigation<ProjectsNavigationProp>();
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await SupabaseService.getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
    }, [])
  );

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = projects.filter((project: Project) =>
    project.name.toLowerCase().includes(searchText.toLowerCase()) ||
    project.description.toLowerCase().includes(searchText.toLowerCase())
  );

  const getDatabaseIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'postgresql':
        return 'server';
      case 'mysql':
        return 'database';
      case 'filemaker':
        return 'document-text';
      default:
        return 'server-outline';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['rgba(239, 145, 68, 0.9)', 'rgba(254, 126, 66, 0.7)']}
        style={styles.header}
      >
        <Text style={styles.title}>Projects</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#666"
          />
        </View>
      </LinearGradient>

      <View style={styles.filterContainer}>
        {(['all', 'active', 'completed'] as const).map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[
              styles.filterButton,
              filter === filterOption && styles.activeFilterButton
            ]}
            onPress={() => setFilter(filterOption)}
          >
            <Text style={[
              styles.filterText,
              filter === filterOption && styles.activeFilterText
            ]}>
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
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
                <View style={styles.databaseBadge}>
                  <Ionicons 
                    name={getDatabaseIcon(project.databaseType) as any} 
                    size={16} 
                    color="#007AFF" 
                  />
                  <Text style={styles.databaseText}>{project.databaseType}</Text>
                </View>
              </View>
              
              <View style={styles.projectFooter}>
                <Text style={styles.projectDate}>
                  Updated {formatDate(project.updatedAt)}
                </Text>
                <View style={styles.projectActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('DataRecording', { projectId: project.id })}
                  >
                    <Ionicons name="mic" size={16} color="#4CAF50" />
                    <Text style={styles.actionText}>Record</Text>
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        
        <View style={{ height: 100 }} />
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  projectCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  projectInfo: {
    flex: 1,
    marginRight: 10,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  projectDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  databaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  databaseText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectDate: {
    fontSize: 12,
    color: '#999',
  },
  projectActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
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
    padding: 30,
    alignItems: 'center',
    marginVertical: 20,
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
