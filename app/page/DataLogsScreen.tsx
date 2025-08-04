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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, DataRecord } from '../types/index.js';
import { SupabaseService } from '../services/supabaseService';

type DataLogsNavigationProp = StackNavigationProp<RootStackParamList>;
type DataLogsRouteProp = RouteProp<RootStackParamList, 'DataLogs'>;

export default function DataLogsScreen() {
  const navigation = useNavigation<DataLogsNavigationProp>();
  const route = useRoute<DataLogsRouteProp>();
  const [searchText, setSearchText] = useState('');
  const [dataRecords, setDataRecords] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const { projectId } = route.params;
  const RECORDS_PER_PAGE = 20;

  const loadDataRecords = async (pageNum: number = 0, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const offset = pageNum * RECORDS_PER_PAGE;
      const { records, total } = await SupabaseService.getDataRecords(
        projectId,
        RECORDS_PER_PAGE,
        offset
      );

      if (refresh || pageNum === 0) {
        setDataRecords(records);
      } else {
        setDataRecords(prev => [...prev, ...records]);
      }

      setTotalRecords(total);
      setHasMore(records.length === RECORDS_PER_PAGE);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading data records:', error);
      Alert.alert('Error', 'Failed to load data records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadDataRecords(0, true);
    }, [projectId])
  );

  useEffect(() => {
    loadDataRecords();
  }, [projectId]);

  const handleRefresh = () => {
    loadDataRecords(0, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadDataRecords(page + 1);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this data record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await SupabaseService.deleteDataRecord(recordId, projectId);
            if (success) {
              setDataRecords(prev => prev.filter(record => record.id !== recordId));
              setTotalRecords(prev => prev - 1);
            } else {
              Alert.alert('Error', 'Failed to delete record');
            }
          },
        },
      ]
    );
  };

  const filteredRecords = dataRecords.filter(record =>
    Object.values(record.data).some(value =>
      String(value).toLowerCase().includes(searchText.toLowerCase())
    ) || record.tableName.toLowerCase().includes(searchText.toLowerCase())
  );

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FF9800';
    return '#F44336';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <Text style={styles.title}>Data Logs</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search data records..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#666"
          />
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            {totalRecords} total records
          </Text>
          <Text style={styles.statsText}>
            {filteredRecords.length} showing
          </Text>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = 
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
          
          if (isCloseToBottom) {
            handleLoadMore();
          }
        }}
      >
        {loading && page === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading data records...</Text>
          </View>
        ) : filteredRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No data records found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchText ? 'Try adjusting your search' : 'Start recording data to see records here'}
            </Text>
          </View>
        ) : (
          <>
            {filteredRecords.map((record) => (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.recordInfo}>
                    <Text style={styles.tableName}>{record.tableName}</Text>
                    <Text style={styles.recordDate}>
                      {formatDate(record.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.recordActions}>
                    <View style={styles.confidenceBadge}>
                      <View 
                        style={[
                          styles.confidenceDot,
                          { backgroundColor: getConfidenceColor(record.confidence) }
                        ]} 
                      />
                      <Text style={styles.confidenceText}>
                        {Math.round(record.confidence * 100)}%
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteRecord(record.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.recordData}>
                  {Object.entries(record.data).map(([key, value]) => (
                    <View key={key} style={styles.dataRow}>
                      <Text style={styles.dataKey}>{key}:</Text>
                      <Text style={styles.dataValue}>{String(value)}</Text>
                    </View>
                  ))}
                </View>

                {record.metadata.recordingMethod && (
                  <View style={styles.metadataRow}>
                    <Ionicons 
                      name={
                        record.metadata.recordingMethod === 'voice' ? 'mic' :
                        record.metadata.recordingMethod === 'image' ? 'camera' :
                        'create'
                      } 
                      size={14} 
                      color="#666" 
                    />
                    <Text style={styles.metadataText}>
                      {record.metadata.recordingMethod}
                    </Text>
                    {record.metadata.location && (
                      <Text style={styles.metadataText}>
                        • Location recorded
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}

            {loading && page > 0 && (
              <View style={styles.loadingMore}>
                <Text style={styles.loadingText}>Loading more...</Text>
              </View>
            )}

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
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsText: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  recordCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recordInfo: {
    flex: 1,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    color: '#666',
  },
  recordActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  deleteButton: {
    padding: 4,
  },
  recordData: {
    marginBottom: 8,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dataKey: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    minWidth: 80,
  },
  dataValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 6,
  },
  metadataText: {
    fontSize: 12,
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
  loadingMore: {
    alignItems: 'center',
    paddingVertical: 20,
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
});
