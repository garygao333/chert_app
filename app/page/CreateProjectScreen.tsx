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
  'FileMaker',
  'SQLite',
  'MongoDB',
  'Oracle',
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    documentation: '',
    databaseType: 'PostgreSQL',
    connectionString: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateProject = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    if (!formData.connectionString.trim()) {
      Alert.alert('Error', 'Please enter a connection string');
      return;
    }

    setIsCreating(true);
    
    // Simulate project creation steps
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // TODO: Integrate with Supabase to save project
    console.log('Creating project with data:', formData);
    
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
                  size={20} 
                  color={index <= currentStep ? "#4CAF50" : "#ccc"} 
                />
                <Text style={[
                  styles.stepText,
                  { color: index <= currentStep ? "#333" : "#ccc" }
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
          colors={['#FFE5E5', '#FFF0F0']}
          style={styles.header}
        >
          <Text style={styles.title}>Create Project</Text>
        </LinearGradient>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Enter project name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder="Describe your project"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Documentation</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.documentation}
              onChangeText={(value) => handleInputChange('documentation', value)}
              placeholder="Project documentation and guidelines"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Database Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.databaseOptions}>
                {databaseTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.databaseOption,
                      formData.databaseType === type && styles.selectedDatabaseOption
                    ]}
                    onPress={() => handleInputChange('databaseType', type)}
                  >
                    <Text style={[
                      styles.databaseOptionText,
                      formData.databaseType === type && styles.selectedDatabaseOptionText
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Connection String</Text>
            <TextInput
              style={styles.input}
              value={formData.connectionString}
              onChangeText={(value) => handleInputChange('connectionString', value)}
              placeholder="postgresql://username:password@host:port/database"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreateProject}
          >
            <LinearGradient
              colors={['#007AFF', '#0056CC']}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>Create Project</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  databaseOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  databaseOption: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedDatabaseOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  databaseOptionText: {
    fontSize: 14,
    color: '#333',
  },
  selectedDatabaseOptionText: {
    color: 'white',
  },
  actions: {
    padding: 20,
    paddingBottom: 40,
  },
  createButton: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  createButtonGradient: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  // Progress screen styles
  progressContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  progressTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  stepsContainer: {
    marginBottom: 40,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  stepText: {
    fontSize: 16,
    marginLeft: 12,
  },
  followUpContainer: {
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
  },
  followUpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  followUpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  followUpInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
