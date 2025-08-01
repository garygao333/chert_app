import React from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';

type SettingsNavigationProp = StackNavigationProp<RootStackParamList>;

interface SettingOption {
  id: string;
  title: string;
  icon: string;
  description: string;
  isDestructive?: boolean;
}

const settingsOptions: SettingOption[] = [
  {
    id: 'account',
    title: 'Account',
    icon: 'person-outline',
    description: 'Manage your account settings',
  },
  {
    id: 'preferences',
    title: 'Preferences',
    icon: 'settings-outline',
    description: 'App preferences and defaults',
  },
  {
    id: 'storage',
    title: 'Storage & Sync',
    icon: 'cloud-outline',
    description: 'Manage data storage and synchronization',
  },
  {
    id: 'permissions',
    title: 'Permissions',
    icon: 'shield-checkmark-outline',
    description: 'Camera, microphone, and location access',
  },
  {
    id: 'export',
    title: 'Export Data',
    icon: 'download-outline',
    description: 'Export your data and records',
  },
  {
    id: 'help',
    title: 'Help & Support',
    icon: 'help-circle-outline',
    description: 'Get help and contact support',
  },
  {
    id: 'about',
    title: 'About',
    icon: 'information-circle-outline',
    description: 'App version and information',
  },
  {
    id: 'signout',
    title: 'Sign Out',
    icon: 'log-out-outline',
    description: 'Sign out of your account',
    isDestructive: true,
  },
];

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavigationProp>();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Navigation will be handled automatically by AppNavigator when user becomes null
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert(
                'Sign Out Failed', 
                'Unable to sign out. Please check your connection and try again.'
              );
            }
          },
        },
      ]
    );
  };

  const handleSettingPress = (settingId: string) => {
    switch (settingId) {
      case 'account':
        navigation.navigate('Account');
        break;
      case 'signout':
        handleSignOut();
        break;
      case 'about':
        Alert.alert(
          'About Chert',
          'Chert v1.0.0\n\nGeneralized plug-and-play voice & image conversational agent for human-in-the-loop field data recording.\n\n© 2025 Mergai-org'
        );
        break;
      case 'help':
        Alert.alert(
          'Help & Support',
          'For help with Chert, please visit our documentation or contact support at support@mergai.org'
        );
        break;
      case 'permissions':
        Alert.alert(
          'Permissions',
          'Chert requires camera, microphone, and location permissions for optimal data recording functionality.'
        );
        break;
      default:
        Alert.alert('Coming Soon', `${settingId} settings will be available in a future update.`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['rgba(239, 145, 68, 0.9)', 'rgba(254, 126, 66, 0.7)']}
        style={styles.header}
      >
        <Text style={styles.title}>Settings</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {settingsOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.settingItem}
              onPress={() => handleSettingPress(option.id)}
            >
              <View style={styles.settingIconContainer}>
                <Ionicons 
                  name={option.icon as any} 
                  size={24} 
                  color={option.isDestructive ? "#FF3B30" : "#007AFF"} 
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={[
                  styles.settingTitle,
                  option.isDestructive && styles.destructiveText
                ]}>
                  {option.title}
                </Text>
                <Text style={styles.settingDescription}>{option.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Chert v1.0.0</Text>
            <Text style={styles.versionSubtext}>
               Chert @ 2025, Built with Expo
            </Text>
          </View>
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
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 25,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  destructiveText: {
    color: '#FF3B30',
  },
  versionContainer: {
    alignItems: 'center',
    padding: 20,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  versionSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
