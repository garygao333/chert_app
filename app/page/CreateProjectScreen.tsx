import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types';

type CreateProjectNavigationProp = StackNavigationProp<RootStackParamList>;

const databaseTypes = [
  'PostgreSQL',
  'MySQL',
  'MariaDB',
  'SQL Server',
  'Oracle',
  'SQLite',
  'MongoDB',
  'Redis',
  'Cassandra',
  'Elasticsearch',
  'Amazon DynamoDB',
  'Google BigQuery',
  'Firebase',
  'Supabase',
  'Pinecone',
  'FileMaker',
];

const steps = [
  'Creating Project',
  'Finished summarizing',
  'Summarizing database, understanding goal & intent',
  'Finished reading database',
  'Connected to database',
];

export default function CreateProjectScreen() {
  const navigation = useNavigation<CreateProjectNavigationProp>();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDatabaseType, setSelectedDatabaseType] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    documentation: '',
    // SQL/relational
    connectionString: '',
    // Supabase
    supabaseUrl: '',
    supabaseKey: '',
    // Pinecone
    pineconeApiKey: '',
    pineconeEnvironment: '',
    pineconeIndex: '',
    // Firebase
    firebaseConfig: '',
    // MongoDB
    mongoUri: '',
    // Redis
    redisHost: '',
    redisPort: '',
    redisPassword: '',
    // Cassandra
    cassandraContactPoints: '',
    cassandraKeyspace: '',
    cassandraUsername: '',
    cassandraPassword: '',
    // Elasticsearch
    elasticsearchUrl: '',
    elasticsearchApiKey: '',
    // DynamoDB
    dynamoAccessKeyId: '',
    dynamoSecretAccessKey: '',
    dynamoRegion: '',
    // BigQuery
    bigqueryProjectId: '',
    bigqueryCredentialsJson: '',
    // FileMaker
    filemakerHost: '',
    filemakerUser: '',
    filemakerPassword: '',
    // MariaDB
    mariadbConnectionString: '',
    // SQL Server
    sqlserverConnectionString: '',
    // Oracle
    oracleHost: '',
    oracleUser: '',
    oraclePassword: '',
    // SQLite
    sqliteFile: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateProject = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }
    // Validate required fields based on selectedDatabaseType
    switch (selectedDatabaseType) {
      case 'PostgreSQL':
      case 'MySQL':
        if (!formData.connectionString.trim()) {
          Alert.alert('Error', 'Please enter a connection string');
          return;
        }
        break;
      case 'MariaDB':
        if (!formData.mariadbConnectionString.trim()) {
          Alert.alert('Error', 'Please enter a MariaDB connection string');
          return;
        }
        break;
      case 'SQL Server':
        if (!formData.sqlserverConnectionString.trim()) {
          Alert.alert('Error', 'Please enter a SQL Server connection string');
          return;
        }
        break;
      case 'Oracle':
        if (!formData.connectionString.trim() && (!formData.oracleHost.trim() || !formData.oracleUser.trim() || !formData.oraclePassword.trim())) {
          Alert.alert('Error', 'Please enter Oracle connection string or host/user/password');
          return;
        }
        break;
      case 'SQLite':
        if (!formData.sqliteFile.trim()) {
          Alert.alert('Error', 'Please enter SQLite file path');
          return;
        }
        break;
      case 'MongoDB':
        if (!formData.mongoUri.trim()) {
          Alert.alert('Error', 'Please enter a MongoDB URI');
          return;
        }
        break;
      case 'Redis':
        if (!formData.redisHost.trim() || !formData.redisPort.trim()) {
          Alert.alert('Error', 'Please enter Redis host and port');
          return;
        }
        break;
      case 'Cassandra':
        if (!formData.cassandraContactPoints.trim() || !formData.cassandraKeyspace.trim()) {
          Alert.alert('Error', 'Please enter Cassandra contact points and keyspace');
          return;
        }
        break;
      case 'Elasticsearch':
        if (!formData.elasticsearchUrl.trim()) {
          Alert.alert('Error', 'Please enter Elasticsearch URL');
          return;
        }
        break;
      case 'Amazon DynamoDB':
        if (!formData.dynamoAccessKeyId.trim() || !formData.dynamoSecretAccessKey.trim() || !formData.dynamoRegion.trim()) {
          Alert.alert('Error', 'Please enter DynamoDB credentials and region');
          return;
        }
        break;
      case 'Google BigQuery':
        if (!formData.bigqueryProjectId.trim() || !formData.bigqueryCredentialsJson.trim()) {
          Alert.alert('Error', 'Please enter BigQuery project ID and credentials');
          return;
        }
        break;
      case 'Firebase':
        if (!formData.firebaseConfig.trim()) {
          Alert.alert('Error', 'Please enter Firebase config');
          return;
        }
        break;
      case 'Supabase':
        if (!formData.supabaseUrl.trim() || !formData.supabaseKey.trim()) {
          Alert.alert('Error', 'Please enter Supabase URL and Key');
          return;
        }
        break;
      case 'Pinecone':
        if (!formData.pineconeApiKey.trim() || !formData.pineconeEnvironment.trim() || !formData.pineconeIndex.trim()) {
          Alert.alert('Error', 'Please enter Pinecone API Key, Environment, and Index');
          return;
        }
        break;
      case 'FileMaker':
        if (!formData.filemakerHost.trim() || !formData.filemakerUser.trim() || !formData.filemakerPassword.trim()) {
          Alert.alert('Error', 'Please enter FileMaker host, user, and password');
          return;
        }
        break;
      default:
        break;
    }

    setIsCreating(true);
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    // TODO: Integrate with backend to save project
    console.log('Creating project with data:', formData, 'Type:', selectedDatabaseType);
    Alert.alert(
      'Success',
      'Project created successfully!',
      [
        {
          text: 'OK',
          onPress: () => {
            setIsCreating(false);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (isCreating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressTitle}>Creating Project</Text>
          
          <View style={styles.stepsContainer}>
            {steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <Ionicons 
                  name={index <= currentStep ? "checkmark-circle" : "ellipse-outline"} 
                  size={24} 
                  color={index <= currentStep ? "#EF9144" : "rgba(37, 51, 94, 0.3)"} 
                />
                <Text style={[
                  styles.stepText,
                  { color: index <= currentStep ? "#25335E" : "rgba(37, 51, 94, 0.5)" }
                ]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.followUpContainer}>
            <Text style={styles.followUpTitle}>Follow-up Question</Text>
            <Text style={styles.followUpText}>
              Is the intent of the database to uncover trade routes between Gaul and Spain for the Punic-Roman port city of Tharros?
            </Text>
            <TextInput
              style={styles.followUpInput}
              placeholder="Type or hold to speak"
              multiline
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['rgba(239, 145, 68, 0.8)', 'rgba(254, 126, 66, 0.6)']}
          style={styles.header}
        >
          <Text style={styles.title}>Create Project</Text>
        </LinearGradient>

        <View style={styles.form}>
          {/* Step 1: Select Database Type */}
          {!selectedDatabaseType && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Choose Database Type</Text>
              <View style={styles.databaseOptionsVertical}>
                {databaseTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.databaseOption,
                      selectedDatabaseType === type && styles.selectedDatabaseOption
                    ]}
                    onPress={() => setSelectedDatabaseType(type)}
                  >
                    <Text style={[
                      styles.databaseOptionText,
                      selectedDatabaseType === type && styles.selectedDatabaseOptionText
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 2: Show form fields based on selected type */}
          {selectedDatabaseType && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Project Name</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(value) => handleInputChange('name', value)}
                    placeholder="Enter project name"
                    placeholderTextColor="rgba(37, 51, 94, 0.5)"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.description}
                    onChangeText={(value) => handleInputChange('description', value)}
                    placeholder="Describe your project"
                    placeholderTextColor="rgba(37, 51, 94, 0.5)"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Documentation</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.documentation}
                    onChangeText={(value) => handleInputChange('documentation', value)}
                    placeholder="Project documentation and guidelines"
                    placeholderTextColor="rgba(37, 51, 94, 0.5)"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              {/* Database-specific fields */}
              {['PostgreSQL', 'MySQL'].includes(selectedDatabaseType) && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Connection String</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={formData.connectionString}
                      onChangeText={(value) => handleInputChange('connectionString', value)}
                      placeholder={`${selectedDatabaseType.toLowerCase()}://username:password@host:port/database`}
                      placeholderTextColor="rgba(37, 51, 94, 0.5)"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}
              {selectedDatabaseType === 'MariaDB' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>MariaDB Connection String</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={formData.mariadbConnectionString}
                      onChangeText={(value) => handleInputChange('mariadbConnectionString', value)}
                      placeholder="mariadb://username:password@host:port/database"
                      placeholderTextColor="rgba(37, 51, 94, 0.5)"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}
              {selectedDatabaseType === 'SQL Server' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>SQL Server Connection String</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={formData.sqlserverConnectionString}
                      onChangeText={(value) => handleInputChange('sqlserverConnectionString', value)}
                      placeholder="sqlserver://username:password@host:port/database"
                      placeholderTextColor="rgba(37, 51, 94, 0.5)"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}
              {selectedDatabaseType === 'Oracle' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Oracle Connection String</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.connectionString}
                        onChangeText={(value) => handleInputChange('connectionString', value)}
                        placeholder="oracle://username:password@host:port/database"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Oracle Host</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.oracleHost}
                        onChangeText={(value) => handleInputChange('oracleHost', value)}
                        placeholder="host"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Oracle User</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.oracleUser}
                        onChangeText={(value) => handleInputChange('oracleUser', value)}
                        placeholder="username"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Oracle Password</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.oraclePassword}
                        onChangeText={(value) => handleInputChange('oraclePassword', value)}
                        placeholder="password"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              )}
              {selectedDatabaseType === 'SQLite' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>SQLite File Path</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={formData.sqliteFile}
                      onChangeText={(value) => handleInputChange('sqliteFile', value)}
                      placeholder="/path/to/database.sqlite"
                      placeholderTextColor="rgba(37, 51, 94, 0.5)"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}
              {selectedDatabaseType === 'MongoDB' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>MongoDB URI</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={formData.mongoUri}
                      onChangeText={(value) => handleInputChange('mongoUri', value)}
                      placeholder="mongodb+srv://username:password@cluster.mongodb.net/database"
                      placeholderTextColor="rgba(37, 51, 94, 0.5)"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              )}
              {selectedDatabaseType === 'Redis' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Redis Host</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.redisHost}
                        onChangeText={(value) => handleInputChange('redisHost', value)}
                        placeholder="host"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Redis Port</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.redisPort}
                        onChangeText={(value) => handleInputChange('redisPort', value)}
                        placeholder="6379"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Redis Password (optional)</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.redisPassword}
                        onChangeText={(value) => handleInputChange('redisPassword', value)}
                        placeholder="password"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              )}
              {selectedDatabaseType === 'Cassandra' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contact Points</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.cassandraContactPoints}
                        onChangeText={(value) => handleInputChange('cassandraContactPoints', value)}
                        placeholder="host1,host2"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Keyspace</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.cassandraKeyspace}
                        onChangeText={(value) => handleInputChange('cassandraKeyspace', value)}
                        placeholder="keyspace"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Username (optional)</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.cassandraUsername}
                        onChangeText={(value) => handleInputChange('cassandraUsername', value)}
                        placeholder="username"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password (optional)</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.cassandraPassword}
                        onChangeText={(value) => handleInputChange('cassandraPassword', value)}
                        placeholder="password"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              )}
              {selectedDatabaseType === 'Elasticsearch' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Elasticsearch URL</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.elasticsearchUrl}
                        onChangeText={(value) => handleInputChange('elasticsearchUrl', value)}
                        placeholder="https://host:port"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>API Key (optional)</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.elasticsearchApiKey}
                        onChangeText={(value) => handleInputChange('elasticsearchApiKey', value)}
                        placeholder="api-key"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </>
              )}
              {selectedDatabaseType === 'Amazon DynamoDB' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Access Key ID</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.dynamoAccessKeyId}
                        onChangeText={(value) => handleInputChange('dynamoAccessKeyId', value)}
                        placeholder="accessKeyId"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Secret Access Key</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.dynamoSecretAccessKey}
                        onChangeText={(value) => handleInputChange('dynamoSecretAccessKey', value)}
                        placeholder="secretAccessKey"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                        secureTextEntry
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Region</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.dynamoRegion}
                        onChangeText={(value) => handleInputChange('dynamoRegion', value)}
                        placeholder="us-east-1"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </>
              )}
              {selectedDatabaseType === 'Google BigQuery' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Project ID</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.bigqueryProjectId}
                        onChangeText={(value) => handleInputChange('bigqueryProjectId', value)}
                        placeholder="project-id"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Credentials (JSON)</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.bigqueryCredentialsJson}
                        onChangeText={(value) => handleInputChange('bigqueryCredentialsJson', value)}
                        placeholder="Paste credentials JSON here"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                  </View>
                </>
              )}
              {selectedDatabaseType === 'Firebase' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Firebase Config (JSON)</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.firebaseConfig}
                      onChangeText={(value) => handleInputChange('firebaseConfig', value)}
                      placeholder="Paste Firebase config JSON here"
                      placeholderTextColor="rgba(37, 51, 94, 0.5)"
                      autoCapitalize="none"
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
              )}
              {selectedDatabaseType === 'Supabase' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Supabase URL</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.supabaseUrl}
                        onChangeText={(value) => handleInputChange('supabaseUrl', value)}
                        placeholder="https://xyz.supabase.co"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Supabase Key</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.supabaseKey}
                        onChangeText={(value) => handleInputChange('supabaseKey', value)}
                        placeholder="public-anon-key"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              )}
              {selectedDatabaseType === 'Pinecone' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>API Key</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.pineconeApiKey}
                        onChangeText={(value) => handleInputChange('pineconeApiKey', value)}
                        placeholder="api-key"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                        secureTextEntry
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Environment</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.pineconeEnvironment}
                        onChangeText={(value) => handleInputChange('pineconeEnvironment', value)}
                        placeholder="us-east1-gcp"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Index Name</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.pineconeIndex}
                        onChangeText={(value) => handleInputChange('pineconeIndex', value)}
                        placeholder="index-name"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                </>
              )}
              {selectedDatabaseType === 'FileMaker' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>FileMaker Host</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.filemakerHost}
                        onChangeText={(value) => handleInputChange('filemakerHost', value)}
                        placeholder="host:port"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>FileMaker User</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.filemakerUser}
                        onChangeText={(value) => handleInputChange('filemakerUser', value)}
                        placeholder="username"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>FileMaker Password</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        value={formData.filemakerPassword}
                        onChangeText={(value) => handleInputChange('filemakerPassword', value)}
                        placeholder="password"
                        placeholderTextColor="rgba(37, 51, 94, 0.5)"
                        autoCapitalize="none"
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Back button to reselect database type */}
              <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
                <TouchableOpacity onPress={() => setSelectedDatabaseType(null)}>
                  <Text style={{ color: '#EF9144', fontWeight: 'bold' }}>Change Database Type</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {selectedDatabaseType && (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={handleCreateProject}
            >
              <LinearGradient
                colors={['#EF9144', '#FE7E42']}
                style={styles.createButtonGradient}
              >
                <Text style={styles.createButtonText}>Create Project</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
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
  },
  header: {
    padding: 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#25335E',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  form: {
    padding: 20,
    paddingTop: 0,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#25335E',
    marginBottom: 12,
    marginLeft: 5,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
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
  input: {
    padding: 18,
    fontSize: 16,
    color: '#25335E',
    fontWeight: '500',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  databaseOptions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 5,
  },
  databaseOptionsVertical: {
    flexDirection: 'column',
    gap: 12,
    paddingHorizontal: 5,
  },
  databaseOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(239, 145, 68, 0.3)',
    shadowColor: '#EF9144',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedDatabaseOption: {
    backgroundColor: '#EF9144',
    borderColor: '#EF9144',
    shadowOpacity: 0.3,
  },
  databaseOptionText: {
    fontSize: 14,
    color: '#25335E',
    fontWeight: '600',
  },
  selectedDatabaseOptionText: {
    color: 'white',
  },
  actions: {
    padding: 20,
    paddingBottom: 40,
  },
  createButton: {
    borderRadius: 16,
    shadowColor: '#EF9144',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 10,
  },
  createButtonGradient: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Progress screen styles
  progressContainer: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 248, 243, 0.95)', // Peach-white gradient base
  },
  progressTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#25335E',
    textAlign: 'center',
    marginBottom: 40,
  },
  stepsContainer: {
    marginBottom: 50,
    paddingHorizontal: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF9144',
  },
  stepText: {
    fontSize: 16,
    marginLeft: 15,
    fontWeight: '500',
  },
  followUpContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    padding: 25,
    shadowColor: '#EF9144',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 145, 68, 0.2)',
  },
  followUpTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#25335E',
    marginBottom: 12,
  },
  followUpText: {
    fontSize: 16,
    color: '#25335E',
    lineHeight: 24,
    marginBottom: 20,
    opacity: 0.8,
  },
  followUpInput: {
    borderWidth: 1,
    borderColor: 'rgba(239, 145, 68, 0.3)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 90,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: '#25335E',
  },
});
