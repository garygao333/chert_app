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
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={formData.connectionString}
                onChangeText={(value) => handleInputChange('connectionString', value)}
                placeholder="postgresql://username:password@host:port/database"
                placeholderTextColor="rgba(37, 51, 94, 0.5)"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

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
