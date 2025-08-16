import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { GoogleMaps, AppleMaps } from 'expo-maps';
import { Platform } from 'react-native';

interface GISModalProps {
  visible: boolean;
  onClose: () => void;
  onLogWithoutProperties: (coordinates: { latitude: number; longitude: number }) => void;
  onLogWithProperties: (coordinates: { latitude: number; longitude: number }) => void;
  coordinateColumns?: {
    latitude: string;
    longitude: string;
  };
}

const { width, height } = Dimensions.get('window');

export default function GISModal({
  visible,
  onClose,
  onLogWithoutProperties,
  onLogWithProperties,
  coordinateColumns,
}: GISModalProps) {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  // Get user's current location when modal opens
  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    }
  }, [visible]);

  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to show your current position on the map.'
        );
        // Set default location (San Francisco)
        const defaultLocation = { latitude: 37.7749, longitude: -122.4194 };
        setCurrentLocation(defaultLocation);
        setSelectedCoordinates(defaultLocation);
        setManualLat(defaultLocation.latitude.toString());
        setManualLng(defaultLocation.longitude.toString());
        setIsLoadingLocation(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setCurrentLocation(coords);
      setSelectedCoordinates(coords);
      setManualLat(coords.latitude.toString());
      setManualLng(coords.longitude.toString());
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Could not get your current location. Using default location.');
      
      // Set default location (San Francisco)
      const defaultLocation = { latitude: 37.7749, longitude: -122.4194 };
      setCurrentLocation(defaultLocation);
      setSelectedCoordinates(defaultLocation);
      setManualLat(defaultLocation.latitude.toString());
      setManualLng(defaultLocation.longitude.toString());
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleManualCoordinateUpdate = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid Coordinates', 'Please enter valid latitude and longitude values.');
      return;
    }
    
    if (lat < -90 || lat > 90) {
      Alert.alert('Invalid Latitude', 'Latitude must be between -90 and 90 degrees.');
      return;
    }
    
    if (lng < -180 || lng > 180) {
      Alert.alert('Invalid Longitude', 'Longitude must be between -180 and 180 degrees.');
      return;
    }
    
    setSelectedCoordinates({ latitude: lat, longitude: lng });
  };

  const useCurrentLocation = () => {
    if (currentLocation) {
      setSelectedCoordinates(currentLocation);
      setManualLat(currentLocation.latitude.toString());
      setManualLng(currentLocation.longitude.toString());
    }
  };

  const handleLogWithoutProperties = () => {
    if (selectedCoordinates) {
      onLogWithoutProperties(selectedCoordinates);
      onClose();
    }
  };

  const handleLogWithProperties = () => {
    if (selectedCoordinates) {
      onLogWithProperties(selectedCoordinates);
      onClose();
    }
  };

  const formatCoordinate = (value: number) => {
    return value.toFixed(6);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Record GIS Location</Text>
          </View>
          
          {/* Coordinate Display */}
          {selectedCoordinates && (
            <View style={styles.coordinateDisplay}>
              <Text style={styles.coordinateText}>
                {coordinateColumns?.latitude || 'Lat'}: {formatCoordinate(selectedCoordinates.latitude)}
              </Text>
              <Text style={styles.coordinateText}>
                {coordinateColumns?.longitude || 'Lng'}: {formatCoordinate(selectedCoordinates.longitude)}
              </Text>
            </View>
          )}
        </View>

        {/* Location Input */}
        <View style={styles.locationContainer}>
          {isLoadingLocation ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="location-outline" size={32} color="#6B7280" />
              <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
          ) : (
            <>
              {/* Current Location Info */}
              {currentLocation && (
                <View style={styles.currentLocationCard}>
                  <View style={styles.currentLocationHeader}>
                    <Ionicons name="location" size={20} color="#10B981" />
                    <Text style={styles.currentLocationTitle}>Current Location</Text>
                  </View>
                  <Text style={styles.currentLocationText}>
                    {formatCoordinate(currentLocation.latitude)}, {formatCoordinate(currentLocation.longitude)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.useCurrentButton}
                    onPress={useCurrentLocation}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.useCurrentText}>Use Current Location</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Manual Coordinate Entry */}
              <View style={styles.manualEntryCard}>
                <Text style={styles.manualEntryTitle}>Enter Coordinates</Text>
                <View style={styles.coordinateInputs}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {coordinateColumns?.latitude || 'Latitude'}
                    </Text>
                    <TextInput
                      style={styles.coordinateInput}
                      value={manualLat}
                      onChangeText={setManualLat}
                      placeholder="37.7749"
                      keyboardType="numeric"
                      onBlur={handleManualCoordinateUpdate}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {coordinateColumns?.longitude || 'Longitude'}
                    </Text>
                    <TextInput
                      style={styles.coordinateInput}
                      value={manualLng}
                      onChangeText={setManualLng}
                      placeholder="-122.4194"
                      keyboardType="numeric"
                      onBlur={handleManualCoordinateUpdate}
                    />
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.updateButton}
                  onPress={handleManualCoordinateUpdate}
                >
                  <Ionicons name="refresh" size={16} color="#EF9144" />
                  <Text style={styles.updateButtonText}>Update Location</Text>
                </TouchableOpacity>
              </View>

              {/* Map Preview */}
              {selectedCoordinates && (
                <View style={styles.mapPreview}>
                  {Platform.OS === 'ios' ? (
                    <AppleMaps.View
                      style={styles.interactiveMap}
                      initialCamera={{
                        target: {
                          latitude: selectedCoordinates.latitude,
                          longitude: selectedCoordinates.longitude,
                        },
                        zoom: 15,
                      }}
                      markers={[{
                        latitude: selectedCoordinates.latitude,
                        longitude: selectedCoordinates.longitude,
                        title: "Selected Location",
                        subtitle: `${formatCoordinate(selectedCoordinates.latitude)}, ${formatCoordinate(selectedCoordinates.longitude)}`
                      }]}
                    />
                  ) : (
                    <GoogleMaps.View
                      style={styles.interactiveMap}
                      initialCamera={{
                        target: {
                          latitude: selectedCoordinates.latitude,
                          longitude: selectedCoordinates.longitude,
                        },
                        zoom: 15,
                      }}
                      markers={[{
                        latitude: selectedCoordinates.latitude,
                        longitude: selectedCoordinates.longitude,
                        title: "Selected Location",
                        snippet: `${formatCoordinate(selectedCoordinates.latitude)}, ${formatCoordinate(selectedCoordinates.longitude)}`
                      }]}
                    />
                  )}
                  <View style={styles.mapInstructions}>
                    <Text style={styles.mapInstructionsText}>
                      📍 Use the coordinate inputs above to adjust the location
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            📍 Use your current location or manually enter coordinates for the location you want to record
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.logWithoutPropertiesButton]}
            onPress={handleLogWithoutProperties}
            disabled={!selectedCoordinates}
          >
            <Ionicons name="location-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Log Location Only</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logWithPropertiesButton]}
            onPress={handleLogWithProperties}
            disabled={!selectedCoordinates}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Log with Properties</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  closeButton: {
    marginRight: 15,
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  coordinateDisplay: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  coordinateText: {
    fontSize: 14,
    color: '#495057',
    fontFamily: 'monospace',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsContainer: {
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  instructionsText: {
    fontSize: 14,
    color: '#1976d2',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 35,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  logWithoutPropertiesButton: {
    backgroundColor: '#4CAF50',
  },
  logWithPropertiesButton: {
    backgroundColor: '#EF9144',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationContainer: {
    flex: 1,
    padding: 20,
  },
  currentLocationCard: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  currentLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 8,
  },
  currentLocationText: {
    fontSize: 14,
    color: '#047857',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  useCurrentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  useCurrentText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  manualEntryCard: {
    backgroundColor: '#FFF7ED',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  manualEntryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 12,
  },
  coordinateInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
    marginBottom: 4,
  },
  coordinateInput: {
    borderWidth: 1,
    borderColor: '#F3E8FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    fontFamily: 'monospace',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF9144',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  mapPreview: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  interactiveMap: {
    height: 250,
    width: '100%',
  },
  mapInstructions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  mapInstructionsText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});