import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import LoadingSpinner from '../components/LoadingSpinner';
import { RootStackParamList } from '../types';

type AccountNavigationProp = StackNavigationProp<RootStackParamList>;

export default function AccountScreen() {
  const navigation = useNavigation<AccountNavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Update display name if changed
      if (displayName !== user.displayName) {
        await updateProfile(user, {
          displayName: displayName.trim() || null,
        });
      }

      // Update email if changed
      if (email !== user.email && email.trim()) {
        if (!currentPassword) {
          Alert.alert('Password Required', 'Please enter your current password to change your email');
          setLoading(false);
          return;
        }

        // Re-authenticate user before changing email
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updateEmail(user, email.trim());
      }

      // Update password if provided
      if (newPassword) {
        if (!currentPassword) {
          Alert.alert('Password Required', 'Please enter your current password to change it');
          setLoading(false);
          return;
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
          Alert.alert('Invalid Password', passwordError);
          setLoading(false);
          return;
        }

        if (newPassword !== confirmPassword) {
          Alert.alert('Password Mismatch', 'New passwords do not match');
          setLoading(false);
          return;
        }

        // Re-authenticate user before changing password
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
      }

      Alert.alert('Success', 'Your account information has been updated successfully');
      setEditing(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Update profile error:', error);
      let errorMessage = 'Failed to update account information';
      
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage = 'Current password is incorrect';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already in use by another account';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'Please sign out and sign in again to make this change';
          break;
        default:
          errorMessage = error.message || 'Failed to update account information';
      }
      
      Alert.alert('Update Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Coming Soon',
              'Account deletion will be available in a future update. Please contact support if you need immediate assistance.'
            );
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load account information</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['rgba(239, 145, 68, 0.9)', 'rgba(254, 126, 66, 0.7)']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Account Settings</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setEditing(!editing)}
        >
          <Ionicons 
            name={editing ? "close" : "create-outline"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading && <LoadingSpinner />}
        
        {/* Profile Picture Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Picture</Text>
          <View style={styles.profilePictureContainer}>
            <View style={styles.profilePicture}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person" size={50} color="#EF9144" />
              )}
            </View>
            {editing && (
              <TouchableOpacity 
                style={styles.changePhotoButton}
                onPress={() => Alert.alert('Coming Soon', 'Profile picture upload will be available in a future update')}
              >
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          {/* Display Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#EF9144" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, !editing && styles.disabledInput]}
                placeholder="Enter your name"
                placeholderTextColor="rgba(37, 51, 94, 0.5)"
                value={displayName}
                onChangeText={setDisplayName}
                editable={editing}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#EF9144" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, !editing && styles.disabledInput]}
                placeholder="Enter your email"
                placeholderTextColor="rgba(37, 51, 94, 0.5)"
                value={email}
                onChangeText={setEmail}
                editable={editing}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Account Created */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Account Created</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={20} color="#EF9144" style={styles.inputIcon} />
              <Text style={styles.readOnlyText}>
                {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

        {/* Password Section - Only show when editing */}
        {editing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Change Password</Text>
            <Text style={styles.sectionSubtitle}>
              Leave blank if you don't want to change your password
            </Text>

            {/* Current Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#EF9144" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter current password"
                  placeholderTextColor="rgba(37, 51, 94, 0.5)"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showCurrentPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="rgba(37, 51, 94, 0.6)"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#EF9144" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter new password"
                  placeholderTextColor="rgba(37, 51, 94, 0.5)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="rgba(37, 51, 94, 0.6)"
                  />
                </TouchableOpacity>
              </View>
              {newPassword && (
                <Text style={styles.passwordHint}>At least 6 characters</Text>
              )}
            </View>

            {/* Confirm New Password */}
            {newPassword && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#EF9144" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm new password"
                    placeholderTextColor="rgba(37, 51, 94, 0.5)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="rgba(37, 51, 94, 0.6)"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Save Button - Only show when editing */}
        {editing && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#ccc', '#999'] : ['#EF9144', '#FE7E42']}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Text>
                <Ionicons name="checkmark-outline" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  editButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#25335E',
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(37, 51, 94, 0.7)',
    marginBottom: 15,
    marginTop: -10,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 145, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  changePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EF9144',
    borderRadius: 20,
  },
  changePhotoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25335E',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 145, 68, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#EF9144',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#25335E',
    fontWeight: '500',
  },
  disabledInput: {
    color: 'rgba(37, 51, 94, 0.6)',
  },
  readOnlyText: {
    flex: 1,
    fontSize: 16,
    color: 'rgba(37, 51, 94, 0.6)',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 4,
  },
  passwordHint: {
    fontSize: 12,
    color: 'rgba(37, 51, 94, 0.6)',
    marginTop: 4,
    marginLeft: 4,
  },
  saveButton: {
    borderRadius: 12,
    shadowColor: '#EF9144',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 8,
  },
  dangerTitle: {
    color: '#FF3B30',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(37, 51, 94, 0.7)',
  },
});
