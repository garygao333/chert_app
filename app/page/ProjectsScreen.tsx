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
import type { RootStackParamList, Project } from '../types';

type ProjectsNavigationProp = StackNavigationProp<RootStackParamList>;

// Mock projects data
const mockProjects: Project[] = [
  {
    id: 'proj1',
    name: 'Tharros Project',
    description: 'Archaeological field data collection for Tharros excavation site',
    documentation: 'Detailed documentation for Tharros project...',
    databaseType: 'PostgreSQL',
    connectionString: 'postgresql://...',
    createdAt: new Date('2025-07-20'),
    updatedAt: new Date('2025-07-25'),
  },
  {
    id: 'proj2',
    name: 'Field Survey 2025',
    description: 'Comprehensive field survey for archaeological assessment',
    documentation: 'Survey documentation...',
    databaseType: 'PostgreSQL',
    connectionString: 'postgresql://...',
    createdAt: new Date('2025-07-15'),
    updatedAt: new Date('2025-07-24'),
  },
  {
    id: 'proj3',
    name: 'Archaeological Site A',
    description: 'Initial assessment and data collection',
    documentation: 'Site A documentation...',
    databaseType: 'MySQL',
    connectionString: 'mysql://...',
    createdAt: new Date('2025-07-10'),
    updatedAt: new Date('2025-07-20'),
  },
];

export default function ProjectsScreen() {
  const navigation = useNavigation<ProjectsNavigationProp>();
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const filteredProjects = mockProjects.filter(project =>
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
        colors={['#007AFF', '#0056CC']}
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
        {filteredProjects.map((project) => (
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
        ))}
        
        <View style={{ height: 100 }} />
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
