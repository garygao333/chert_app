import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Import screens
import DashboardScreen from '../page/DashboardScreen';
import ProjectsScreen from '../page/ProjectsScreen';
import SettingsScreen from '../page/SettingsScreen';
import CreateProjectScreen from '../page/CreateProjectScreen';
import ProjectDetailScreen from '../page/ProjectDetailScreen';
import DataRecordingScreen from '../page/DataRecordingScreen';
import Login from '../page/Login';
import Signup from '../page/Signup';
import AccountScreen from '../page/AccountScreen';

// Import auth context
import { useAuth } from '../contexts/AuthContext';

import type { RootStackParamList, MainTabParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Projects"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Projects') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#EF9144',
        tabBarInactiveTintColor: 'rgba(37, 51, 94, 0.6)',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Projects" component={ProjectsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
    </Stack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#EF9144" />
    </View>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      {user ? (
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#EF9144',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Projects" 
            component={ProjectsScreen}
            options={{ 
              title: 'Projects',
              headerShown: true 
            }}
          />
          <Stack.Screen 
            name="CreateProject" 
            component={CreateProjectScreen}
            options={{ 
              title: 'Create Project',
              presentation: 'modal' 
            }}
          />
          <Stack.Screen 
            name="ProjectDetail" 
            component={ProjectDetailScreen}
            options={{ title: 'Project Details' }}
          />
          <Stack.Screen 
            name="DataRecording" 
            component={DataRecordingScreen}
            options={{ 
              title: 'Record Data',
              presentation: 'modal'
            }}
          />
          <Stack.Screen 
            name="Account" 
            component={AccountScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F3',
  },
});
