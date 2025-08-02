import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, DatabaseSchema, Table, Column, Relationship } from '../types/index.js';
import { SupabaseService } from '../services/supabaseService';

type DataSchemaConfigNavigationProp = StackNavigationProp<RootStackParamList>;
type DataSchemaConfigRouteProp = RouteProp<RootStackParamList, 'DataSchemaConfig'>;

const COLUMN_TYPES = [
  'TEXT',
  'INTEGER',
  'REAL',
  'BOOLEAN',
  'DATE',
  'TIMESTAMP',
  'JSON',
  'VARCHAR(255)',
  'DECIMAL(10,2)',
];

const RELATIONSHIP_TYPES: Relationship['type'][] = [
  'one-to-one',
  'one-to-many',
  'many-to-many',
];

export default function DataSchemaConfigScreen() {
  const navigation = useNavigation<DataSchemaConfigNavigationProp>();
  const route = useRoute<DataSchemaConfigRouteProp>();
  const [schema, setSchema] = useState<DatabaseSchema>({ tables: [], relationships: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  
  // Modal states
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editingColumn, setEditingColumn] = useState<{ column: Column; tableIndex: number } | null>(null);
  const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null);
  
  // Form states
  const [tableName, setTableName] = useState('');
  const [columnName, setColumnName] = useState('');
  const [columnType, setColumnType] = useState('TEXT');
  const [columnRequired, setColumnRequired] = useState(false);
  const [columnDescription, setColumnDescription] = useState('');
  
  const [relationshipFromTable, setRelationshipFromTable] = useState('');
  const [relationshipFromColumn, setRelationshipFromColumn] = useState('');
  const [relationshipToTable, setRelationshipToTable] = useState('');
  const [relationshipToColumn, setRelationshipToColumn] = useState('');
  const [relationshipType, setRelationshipType] = useState<Relationship['type']>('one-to-many');

  const { projectId } = route.params;

  const loadSchema = async () => {
    try {
      setLoading(true);
      // Try to get actual database schema first, then fall back to stored schema
      const { schema: actualSchema } = await SupabaseService.getDatabaseInfo(projectId);
      if (actualSchema && actualSchema.tables.length > 0) {
        setSchema(actualSchema);
      } else {
        // Fall back to stored schema or create empty schema
        const storedSchema = await SupabaseService.getDatabaseSchema(projectId);
        setSchema(storedSchema || { tables: [], relationships: [] });
      }
    } catch (error) {
      console.error('Error loading schema:', error);
      setSchema({ tables: [], relationships: [] });
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

  const saveSchema = async () => {
    try {
      setSaving(true);
      const success = await SupabaseService.updateDatabaseSchema(projectId, schema);
      if (success) {
        Alert.alert('Success', 'Database schema updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update database schema');
      }
    } catch (error) {
      console.error('Error saving schema:', error);
      Alert.alert('Error', 'Failed to save schema');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTableName('');
    setColumnName('');
    setColumnType('TEXT');
    setColumnRequired(false);
    setColumnDescription('');
    setRelationshipFromTable('');
    setRelationshipFromColumn('');
    setRelationshipToTable('');
    setRelationshipToColumn('');
    setRelationshipType('one-to-many');
    setEditingTable(null);
    setEditingColumn(null);
    setEditingRelationship(null);
  };

  const handleAddTable = () => {
    if (!tableName.trim()) {
      Alert.alert('Error', 'Please enter a table name');
      return;
    }

    const newTable: Table = {
      name: tableName.trim(),
      columns: [],
    };

    setSchema(prev => ({
      ...prev,
      tables: [...prev.tables, newTable],
    }));

    resetForm();
    setShowTableModal(false);
  };

  const handleEditTable = (table: Table, index: number) => {
    setEditingTable(table);
    setTableName(table.name);
    setShowTableModal(true);
  };

  const handleUpdateTable = () => {
    if (!tableName.trim() || !editingTable) {
      Alert.alert('Error', 'Please enter a table name');
      return;
    }

    setSchema(prev => ({
      ...prev,
      tables: prev.tables.map(table =>
        table.name === editingTable.name
          ? { ...table, name: tableName.trim() }
          : table
      ),
    }));

    resetForm();
    setShowTableModal(false);
  };

  const handleDeleteTable = (tableName: string) => {
    Alert.alert(
      'Delete Table',
      `Are you sure you want to delete the table "${tableName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSchema(prev => ({
              tables: prev.tables.filter(table => table.name !== tableName),
              relationships: prev.relationships.filter(
                rel => rel.fromTable !== tableName && rel.toTable !== tableName
              ),
            }));
          },
        },
      ]
    );
  };

  const handleAddColumn = (tableIndex: number) => {
    if (!columnName.trim()) {
      Alert.alert('Error', 'Please enter a column name');
      return;
    }

    const newColumn: Column = {
      name: columnName.trim(),
      type: columnType,
      required: columnRequired,
      description: columnDescription.trim() || undefined,
    };

    setSchema(prev => ({
      ...prev,
      tables: prev.tables.map((table, index) =>
        index === tableIndex
          ? { ...table, columns: [...table.columns, newColumn] }
          : table
      ),
    }));

    resetForm();
    setShowColumnModal(false);
  };

  const handleEditColumn = (column: Column, tableIndex: number, columnIndex: number) => {
    setEditingColumn({ column, tableIndex });
    setColumnName(column.name);
    setColumnType(column.type);
    setColumnRequired(column.required);
    setColumnDescription(column.description || '');
    setShowColumnModal(true);
  };

  const handleUpdateColumn = () => {
    if (!columnName.trim() || !editingColumn) {
      Alert.alert('Error', 'Please enter a column name');
      return;
    }

    const updatedColumn: Column = {
      name: columnName.trim(),
      type: columnType,
      required: columnRequired,
      description: columnDescription.trim() || undefined,
    };

    setSchema(prev => ({
      ...prev,
      tables: prev.tables.map((table, tableIndex) =>
        tableIndex === editingColumn.tableIndex
          ? {
              ...table,
              columns: table.columns.map(col =>
                col.name === editingColumn.column.name ? updatedColumn : col
              ),
            }
          : table
      ),
    }));

    resetForm();
    setShowColumnModal(false);
  };

  const handleDeleteColumn = (tableIndex: number, columnName: string) => {
    Alert.alert(
      'Delete Column',
      `Are you sure you want to delete the column "${columnName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSchema(prev => ({
              ...prev,
              tables: prev.tables.map((table, index) =>
                index === tableIndex
                  ? { ...table, columns: table.columns.filter(col => col.name !== columnName) }
                  : table
              ),
            }));
          },
        },
      ]
    );
  };

  const handleAddRelationship = () => {
    if (!relationshipFromTable || !relationshipFromColumn || !relationshipToTable || !relationshipToColumn) {
      Alert.alert('Error', 'Please fill in all relationship fields');
      return;
    }

    const newRelationship: Relationship = {
      fromTable: relationshipFromTable,
      fromColumn: relationshipFromColumn,
      toTable: relationshipToTable,
      toColumn: relationshipToColumn,
      type: relationshipType,
    };

    setSchema(prev => ({
      ...prev,
      relationships: [...prev.relationships, newRelationship],
    }));

    resetForm();
    setShowRelationshipModal(false);
  };

  const handleDeleteRelationship = (index: number) => {
    Alert.alert(
      'Delete Relationship',
      'Are you sure you want to delete this relationship?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSchema(prev => ({
              ...prev,
              relationships: prev.relationships.filter((_, i) => i !== index),
            }));
          },
        },
      ]
    );
  };

  const renderTable = (table: Table, tableIndex: number) => (
    <View key={table.name} style={styles.tableCard}>
      <View style={styles.tableHeader}>
        <View style={styles.tableInfo}>
          <Ionicons name="grid" size={20} color="#007AFF" />
          <Text style={styles.tableName}>{table.name}</Text>
        </View>
        <View style={styles.tableActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setEditingColumn({ column: { name: '', type: 'TEXT', required: false }, tableIndex });
              setColumnName('');
              setColumnType('TEXT');
              setColumnRequired(false);
              setColumnDescription('');
              setShowColumnModal(true);
            }}
          >
            <Ionicons name="add" size={16} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditTable(table, tableIndex)}
          >
            <Ionicons name="create" size={16} color="#FF9800" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteTable(table.name)}
          >
            <Ionicons name="trash" size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.columnsContainer}>
        {table.columns.length === 0 ? (
          <Text style={styles.noColumnsText}>No columns defined</Text>
        ) : (
          table.columns.map((column, columnIndex) => (
            <View key={column.name} style={styles.columnRow}>
              <View style={styles.columnInfo}>
                <Text style={styles.columnName}>{column.name}</Text>
                <Text style={styles.columnType}>{column.type}</Text>
                {column.required && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredText}>Required</Text>
                  </View>
                )}
              </View>
              <View style={styles.columnActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditColumn(column, tableIndex, columnIndex)}
                >
                  <Ionicons name="create" size={14} color="#FF9800" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteColumn(tableIndex, column.name)}
                >
                  <Ionicons name="trash" size={14} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

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
          <Text style={styles.title}>Schema Config</Text>
          <TouchableOpacity onPress={saveSchema} disabled={saving}>
            <Ionicons name="checkmark" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading schema...</Text>
          </View>
        ) : (
          <>
            {/* Add Table Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowTableModal(true)}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Table</Text>
            </TouchableOpacity>

            {/* Tables */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tables ({schema.tables.length})</Text>
              {schema.tables.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="grid-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyStateText}>No tables defined</Text>
                  <Text style={styles.emptyStateSubtext}>Add your first table to get started</Text>
                </View>
              ) : (
                schema.tables.map(renderTable)
              )}
            </View>

            {/* Add Relationship Button */}
            {schema.tables.length > 1 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowRelationshipModal(true)}
              >
                <Ionicons name="git-branch" size={20} color="white" />
                <Text style={styles.addButtonText}>Add Relationship</Text>
              </TouchableOpacity>
            )}

            {/* Relationships */}
            {schema.relationships.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Relationships ({schema.relationships.length})</Text>
                {schema.relationships.map((relationship, index) => (
                  <View key={index} style={styles.relationshipCard}>
                    <View style={styles.relationshipInfo}>
                      <Text style={styles.relationshipText}>
                        {relationship.fromTable}.{relationship.fromColumn} → {relationship.toTable}.{relationship.toColumn}
                      </Text>
                      <Text style={styles.relationshipType}>{relationship.type}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteRelationship(index)}
                    >
                      <Ionicons name="trash" size={16} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* Table Modal */}
      <Modal visible={showTableModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTable ? 'Edit Table' : 'Add Table'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Table name"
              value={tableName}
              onChangeText={setTableName}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  resetForm();
                  setShowTableModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={editingTable ? handleUpdateTable : handleAddTable}
              >
                <Text style={styles.saveButtonText}>
                  {editingTable ? 'Update' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Column Modal */}
      <Modal visible={showColumnModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingColumn ? 'Edit Column' : 'Add Column'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Column name"
              value={columnName}
              onChangeText={setColumnName}
              autoCapitalize="none"
            />
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Type:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {COLUMN_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      columnType === type && styles.selectedTypeButton
                    ]}
                    onPress={() => setColumnType(type)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      columnType === type && styles.selectedTypeButtonText
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Required</Text>
              <Switch
                value={columnRequired}
                onValueChange={setColumnRequired}
                trackColor={{ false: '#767577', true: '#007AFF' }}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              value={columnDescription}
              onChangeText={setColumnDescription}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  resetForm();
                  setShowColumnModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  if (editingColumn && editingColumn.column.name !== '') {
                    handleUpdateColumn();
                  } else if (editingColumn) {
                    handleAddColumn(editingColumn.tableIndex);
                  } else {
                    Alert.alert('Error', 'No table selected');
                  }
                }}
              >
                <Text style={styles.saveButtonText}>
                  {editingColumn ? 'Update' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Relationship Modal */}
      <Modal visible={showRelationshipModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Relationship</Text>
            
            <Text style={styles.inputLabel}>From Table</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {schema.tables.map(table => (
                <TouchableOpacity
                  key={table.name}
                  style={[
                    styles.optionButton,
                    relationshipFromTable === table.name && styles.selectedOptionButton
                  ]}
                  onPress={() => setRelationshipFromTable(table.name)}
                >
                  <Text style={[
                    styles.optionButtonText,
                    relationshipFromTable === table.name && styles.selectedOptionButtonText
                  ]}>
                    {table.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>From Column</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {schema.tables
                .find(t => t.name === relationshipFromTable)
                ?.columns.map(column => (
                  <TouchableOpacity
                    key={column.name}
                    style={[
                      styles.optionButton,
                      relationshipFromColumn === column.name && styles.selectedOptionButton
                    ]}
                    onPress={() => setRelationshipFromColumn(column.name)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      relationshipFromColumn === column.name && styles.selectedOptionButtonText
                    ]}>
                      {column.name}
                    </Text>
                  </TouchableOpacity>
                )) || []}
            </ScrollView>

            <Text style={styles.inputLabel}>To Table</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {schema.tables.map(table => (
                <TouchableOpacity
                  key={table.name}
                  style={[
                    styles.optionButton,
                    relationshipToTable === table.name && styles.selectedOptionButton
                  ]}
                  onPress={() => setRelationshipToTable(table.name)}
                >
                  <Text style={[
                    styles.optionButtonText,
                    relationshipToTable === table.name && styles.selectedOptionButtonText
                  ]}>
                    {table.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>To Column</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {schema.tables
                .find(t => t.name === relationshipToTable)
                ?.columns.map(column => (
                  <TouchableOpacity
                    key={column.name}
                    style={[
                      styles.optionButton,
                      relationshipToColumn === column.name && styles.selectedOptionButton
                    ]}
                    onPress={() => setRelationshipToColumn(column.name)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      relationshipToColumn === column.name && styles.selectedOptionButtonText
                    ]}>
                      {column.name}
                    </Text>
                  </TouchableOpacity>
                )) || []}
            </ScrollView>

            <Text style={styles.inputLabel}>Relationship Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
              {RELATIONSHIP_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    relationshipType === type && styles.selectedOptionButton
                  ]}
                  onPress={() => setRelationshipType(type)}
                >
                  <Text style={[
                    styles.optionButtonText,
                    relationshipType === type && styles.selectedOptionButtonText
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  resetForm();
                  setShowRelationshipModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddRelationship}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  tableActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  columnsContainer: {
    padding: 16,
  },
  noColumnsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  columnName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
  },
  columnType: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  requiredBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  columnActions: {
    flexDirection: 'row',
    gap: 4,
  },
  relationshipCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  relationshipInfo: {
    flex: 1,
  },
  relationshipText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  relationshipType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  typeButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  selectedTypeButton: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#333',
  },
  selectedTypeButtonText: {
    color: 'white',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  optionsScroll: {
    marginBottom: 15,
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  selectedOptionButton: {
    backgroundColor: '#007AFF',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#333',
  },
  selectedOptionButtonText: {
    color: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
