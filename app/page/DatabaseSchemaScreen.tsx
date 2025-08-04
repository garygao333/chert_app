import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, DatabaseSchema, Table, Column, Relationship } from '../types/index.js';
import { SupabaseService } from '../services/supabaseService';

type DatabaseSchemaNavigationProp = StackNavigationProp<RootStackParamList>;
type DatabaseSchemaRouteProp = RouteProp<RootStackParamList, 'DatabaseSchema'>;

export default function DatabaseSchemaScreen() {
  const navigation = useNavigation<DatabaseSchemaNavigationProp>();
  const route = useRoute<DatabaseSchemaRouteProp>();
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [tableStats, setTableStats] = useState<Record<string, any>>({});

  const { projectId } = route.params;

  const loadSchema = async () => {
    try {
      setLoading(true);
      // Get actual database schema and stats
      const { schema: schemaData, tableStats: statsData } = await SupabaseService.getDatabaseInfo(projectId);
      setSchema(schemaData);
      setTableStats(statsData);
    } catch (error) {
      console.error('Error loading schema:', error);
      Alert.alert('Error', 'Failed to load database schema');
    } finally {
      setLoading(false);
    }
  };

  // Load data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadSchema();
    }, [projectId])
  );

  useEffect(() => {
    loadSchema();
  }, [projectId]);

  const toggleTableExpanded = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const getColumnTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('number')) {
      return 'calculator';
    } else if (lowerType.includes('text') || lowerType.includes('string') || lowerType.includes('varchar')) {
      return 'text';
    } else if (lowerType.includes('date') || lowerType.includes('time')) {
      return 'calendar';
    } else if (lowerType.includes('bool')) {
      return 'checkbox';
    } else if (lowerType.includes('json')) {
      return 'code-braces';
    }
    return 'ellipse';
  };

  const getColumnTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('number')) {
      return '#2196F3';
    } else if (lowerType.includes('text') || lowerType.includes('string') || lowerType.includes('varchar')) {
      return '#4CAF50';
    } else if (lowerType.includes('date') || lowerType.includes('time')) {
      return '#FF9800';
    } else if (lowerType.includes('bool')) {
      return '#9C27B0';
    } else if (lowerType.includes('json')) {
      return '#FF5722';
    }
    return '#757575';
  };

  const getRelationshipIcon = (type: Relationship['type']) => {
    switch (type) {
      case 'one-to-one':
        return 'arrow-forward';
      case 'one-to-many':
        return 'git-branch';
      case 'many-to-many':
        return 'git-network';
      default:
        return 'link';
    }
  };

  const renderTable = (table: Table) => {
    const isExpanded = expandedTables.has(table.name);
    const stats = tableStats[table.name];
    
    return (
      <View key={table.name} style={styles.tableCard}>
        <TouchableOpacity
          style={styles.tableHeader}
          onPress={() => toggleTableExpanded(table.name)}
        >
          <View style={styles.tableInfo}>
            <Ionicons name="grid" size={20} color="#007AFF" />
            <View style={styles.tableDetails}>
              <Text style={styles.tableName}>{table.name}</Text>
              <View style={styles.tableMetrics}>
                <Text style={styles.columnCount}>({table.columns.length} columns)</Text>
                {stats && (
                  <>
                    <Text style={styles.tableStat}>• {stats.rowCount} rows</Text>
                    <Text style={styles.tableStat}>• {stats.totalSize}</Text>
                  </>
                )}
              </View>
            </View>
          </View>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.tableContent}>
            {table.columns.map((column) => (
              <View key={column.name} style={styles.columnRow}>
                <View style={styles.columnInfo}>
                  <Ionicons 
                    name={getColumnTypeIcon(column.type) as any} 
                    size={16} 
                    color={getColumnTypeColor(column.type)} 
                  />
                  <Text style={styles.columnName}>{column.name}</Text>
                  {column.required && (
                    <View style={styles.requiredBadge}>
                      <Text style={styles.requiredText}>*</Text>
                    </View>
                  )}
                  {column.description && (
                    <Text style={styles.columnDescription}>{column.description}</Text>
                  )}
                </View>
                <View style={styles.columnType}>
                  <Text style={[styles.columnTypeText, { color: getColumnTypeColor(column.type) }]}>
                    {column.type}
                  </Text>
                </View>
              </View>
            ))}
            
            {stats && (
              <View style={styles.tableStatsSection}>
                <Text style={styles.statsTitle}>Table Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Rows</Text>
                    <Text style={styles.statValue}>{stats.rowCount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Table Size</Text>
                    <Text style={styles.statValue}>{stats.tableSize}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Index Size</Text>
                    <Text style={styles.statValue}>{stats.indexSize}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Size</Text>
                    <Text style={styles.statValue}>{stats.totalSize}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderRelationships = (relationships: Relationship[]) => {
    if (relationships.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Relationships</Text>
        {relationships.map((rel, index) => (
          <View key={index} style={styles.relationshipCard}>
            <View style={styles.relationshipHeader}>
              <Ionicons 
                name={getRelationshipIcon(rel.type) as any} 
                size={20} 
                color="#FF9800" 
              />
              <Text style={styles.relationshipType}>
                {rel.type.replace('-', ' to ')}
              </Text>
            </View>
            <View style={styles.relationshipDetails}>
              <Text style={styles.relationshipText}>
                <Text style={styles.tableName}>{rel.fromTable}</Text>
                <Text style={styles.columnName}>.{rel.fromColumn}</Text>
                <Text style={styles.relationshipArrow}> → </Text>
                <Text style={styles.tableName}>{rel.toTable}</Text>
                <Text style={styles.columnName}>.{rel.toColumn}</Text>
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['rgba(239, 145, 68, 0.8)', 'rgba(254, 126, 66, 0.6)']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Database Schema</Text>
          <TouchableOpacity onPress={() => navigation.navigate('DataSchemaConfig', { projectId })}>
            <Ionicons name="settings" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading database schema...</Text>
          </View>
        ) : !schema ? (
          <View style={styles.emptyState}>
            <Ionicons name="server-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No schema defined</Text>
            <Text style={styles.emptyStateSubtext}>
              Configure your database schema to see the structure here
            </Text>
            <TouchableOpacity 
              style={styles.configureButton}
              onPress={() => navigation.navigate('DataSchemaConfig', { projectId })}
            >
              <Text style={styles.configureButtonText}>Configure Schema</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Schema Overview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tables</Text>
              <View style={styles.overviewStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{schema.tables.length}</Text>
                  <Text style={styles.statLabel}>Tables</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {schema.tables.reduce((acc, table) => acc + table.columns.length, 0)}
                  </Text>
                  <Text style={styles.statLabel}>Columns</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{schema.relationships.length}</Text>
                  <Text style={styles.statLabel}>Relations</Text>
                </View>
              </View>
            </View>

            {/* Tables */}
            <View style={styles.section}>
              {schema.tables.map(renderTable)}
            </View>

            {/* Relationships */}
            {renderRelationships(schema.relationships)}

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 248, 243, 0.95)',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  overviewStats: {
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
    marginBottom: 10,
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
    marginTop: 4,
  },
  tableCard: {
    backgroundColor: 'white',
    borderRadius: 12,
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
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  tableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tableDetails: {
    marginLeft: 8,
    flex: 1,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tableMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  columnCount: {
    fontSize: 14,
    color: '#666',
  },
  tableStat: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  tableContent: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  columnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  columnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  columnName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  requiredBadge: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  requiredText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  columnType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  columnTypeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  relationshipCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  relationshipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  relationshipType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  relationshipDetails: {
    paddingLeft: 28,
  },
  relationshipText: {
    fontSize: 14,
    color: '#333',
  },
  relationshipArrow: {
    color: '#666',
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
    marginVertical: 10,
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
    marginBottom: 20,
  },
  configureButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  configureButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  columnDescription: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  tableStatsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
});
