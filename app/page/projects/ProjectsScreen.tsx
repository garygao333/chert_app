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
import type { RootStackParamList, Project } from '../../types/index.js';
import FirebaseService from '../../services/firebaseService';

type ProjectsNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ProjectsScreen() {
  const navigation = useNavigation<ProjectsNavigationProp>();
  const [searchText, setSearchText] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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
                    name={getDatabaseIcon(project) as any} 
                    size={14} 
                    color="#EF9144" 
                  />
                  <Text style={styles.databaseText}>{getProjectBadgeText(project)}</Text>
                </View>
              </View>

              {/* Data columns display */}
              {project.dataColumns && project.dataColumns.length > 0 && (
                <View style={styles.dataColumnsContainer}>
                  <Text style={styles.dataColumnsTitle}>Data columns ({project.dataColumns.length}):</Text>
                  <View style={styles.dataColumnsWrapper}>
                    {project.dataColumns.slice(0, 4).map((column, idx) => (
                      <View key={idx} style={styles.columnTag}>
                        <Text style={styles.columnText}>{column}</Text>
                      </View>
                    ))}
                    {project.dataColumns.length > 4 && (
                      <Text style={styles.moreColumnsText}>+{project.dataColumns.length - 4} more</Text>
                    )}
                  </View>
                </View>
              )}

              {/* CSV metadata display */}
              {project.csvMetadata && (
                <View style={styles.csvMetadataContainer}>
                  <Text style={styles.csvFileName}>📄 {project.csvMetadata.fileName}</Text>
                  <Text style={styles.csvInfo}>
                    {project.csvMetadata.totalRows} rows • {(project.csvMetadata.fileSize / 1024).toFixed(1)} KB
                  </Text>
                  {project.csvMetadata.sampleRows && project.csvMetadata.sampleRows.length > 0 && (
                    <View style={styles.sampleRowsContainer}>
                      <Text style={styles.sampleRowsTitle}>Sample data:</Text>
                      {project.csvMetadata.sampleRows.slice(0, 2).map((row, idx) => (
                        <Text key={idx} style={styles.sampleRowText} numberOfLines={1}>
                          {row}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
              
              <View style={styles.projectFooter}>
                <Text style={styles.projectDate}>
                  {project.updatedAt ? `Updated ${formatDate(project.updatedAt)}` : `Created ${formatDate(project.createdAt)}`}
                </Text>
                <View style={styles.projectActions}>
                  {project.dataColumns && project.dataColumns.length > 0 && (
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}
                    >
                      <Ionicons name="mic" size={14} color="#4CAF50" />
                      <Text style={styles.actionText}>Record</Text>
                    </TouchableOpacity>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  projectCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  projectInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  projectDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 4,
  },
  databaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 145, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(239, 145, 68, 0.2)',
  },
  databaseText: {
    fontSize: 13,
    color: '#EF9144',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  projectDate: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  projectActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  actionText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
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
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
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
  dataColumnsContainer: {
    marginBottom: 12,
    paddingTop: 8,
  },
  dataColumnsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  dataColumnsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  columnTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  columnText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
  },
  moreColumnsText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  csvMetadataContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.1)',
  },
  csvFileName: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600',
    marginBottom: 4,
  },
  csvInfo: {
    fontSize: 12,
    color: '#1565C0',
    marginBottom: 8,
  },
  sampleRowsContainer: {
    marginTop: 4,
  },
  sampleRowsTitle: {
    fontSize: 11,
    color: '#1565C0',
    marginBottom: 4,
    fontWeight: '500',
  },
  sampleRowText: {
    fontSize: 10,
    color: '#424242',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 4,
    borderRadius: 4,
    marginBottom: 2,
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
