import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Linking, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Circle, Text as SvgText } from 'react-native-svg';

interface GISPoint {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  properties?: Record<string, any>;
}

interface LeafletMapProps {
  gisPoints: GISPoint[];
  style?: any;
  onReady?: () => void;
  onError?: (error: any) => void;
}

const LeafletMap: React.FC<LeafletMapProps> = ({ gisPoints, style, onReady, onError }) => {
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // For mobile platforms, just call onReady to indicate "map" is ready
      console.log('🗺️ Mobile coordinate display ready with', gisPoints.length, 'points');
      onReady?.();
      return;
    }

    if (gisPoints.length === 0) {
      return;
    }

    const loadLeaflet = async () => {
      try {
        console.log('🗺️ Loading Leaflet for web...');
        
        // Dynamically import Leaflet only on web
        const L = await import('leaflet');
        
        // Load Leaflet CSS
        if (typeof document !== 'undefined' && !document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Clean up existing map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        // Initialize map
        const map = L.map(mapRef.current).setView([gisPoints[0].latitude, gisPoints[0].longitude], gisPoints.length > 1 ? 12 : 15);
        mapInstanceRef.current = map;

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add markers
        gisPoints.forEach((point) => {
          const marker = L.marker([point.latitude, point.longitude]).addTo(map);
          
          const popupContent = point.properties
            ? Object.entries(point.properties)
                .slice(0, 3)
                .map(([key, value]) => `${key}: ${value}`)
                .join('<br>')
            : `Recorded: ${point.timestamp.toLocaleDateString()}`;
          
          marker.bindPopup(`<b>Location ${point.id}</b><br>${popupContent}`);
        });

        // Fit to bounds if multiple points
        if (gisPoints.length > 1) {
          const group = new L.FeatureGroup(
            gisPoints.map(point => L.marker([point.latitude, point.longitude]))
          );
          map.fitBounds(group.getBounds().pad(0.1));
        }

        console.log('🗺️ Leaflet map loaded successfully with', gisPoints.length, 'markers');
        onReady?.();
      } catch (error) {
        console.error('🗺️ Error loading Leaflet:', error);
        onError?.(error);
      }
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [gisPoints, onReady, onError]);

  // Mobile/Native view - SVG-based map visualization
  if (Platform.OS !== 'web') {
    if (gisPoints.length === 0) {
      return (
        <View style={[styles.emptyContainer, style]}>
          <Text style={styles.emptyText}>📍 No locations recorded yet</Text>
        </View>
      );
    }

    // Calculate bounds for all points
    const latitudes = gisPoints.map(p => p.latitude);
    const longitudes = gisPoints.map(p => p.longitude);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    // Add padding to bounds
    const latPadding = Math.max((maxLat - minLat) * 0.1, 0.001);
    const lngPadding = Math.max((maxLng - minLng) * 0.1, 0.001);
    
    const boundedMinLat = minLat - latPadding;
    const boundedMaxLat = maxLat + latPadding;
    const boundedMinLng = minLng - lngPadding;
    const boundedMaxLng = maxLng + lngPadding;
    
    const latRange = boundedMaxLat - boundedMinLat;
    const lngRange = boundedMaxLng - boundedMinLng;
    
    // Map dimensions
    const mapWidth = 300;
    const mapHeight = 180;
    
    // Convert lat/lng to screen coordinates
    const getScreenCoords = (lat: number, lng: number) => {
      const x = ((lng - boundedMinLng) / lngRange) * mapWidth;
      const y = mapHeight - ((lat - boundedMinLat) / latRange) * mapHeight; // Flip Y axis
      return { x, y };
    };

    const [selectedPoint, setSelectedPoint] = useState<GISPoint | null>(null);

    // Call onReady to signal component is ready
    useEffect(() => {
      console.log('🗺️ SVG map component ready with', gisPoints.length, 'points');
      onReady?.();
    }, [gisPoints, onReady]);

    return (
      <View style={[styles.mapContainer, style]}>
        {/* Map Header */}
        <View style={styles.mapHeader}>
          <Ionicons name="map" size={20} color="#10B981" />
          <Text style={styles.mapTitle}>GIS Locations Map</Text>
          <TouchableOpacity
            onPress={() => {
              // Open first point in maps or all points
              if (gisPoints.length === 1) {
                const point = gisPoints[0];
                const url = Platform.OS === 'ios' 
                  ? `maps://?q=${point.latitude},${point.longitude}`
                  : `geo:${point.latitude},${point.longitude}`;
                Linking.openURL(url).catch(() => {
                  Linking.openURL(`https://maps.google.com/?q=${point.latitude},${point.longitude}`);
                });
              } else {
                // For multiple points, open the center location
                const centerLat = (minLat + maxLat) / 2;
                const centerLng = (minLng + maxLng) / 2;
                const url = Platform.OS === 'ios' 
                  ? `maps://?q=${centerLat},${centerLng}`
                  : `geo:${centerLat},${centerLng}`;
                Linking.openURL(url).catch(() => {
                  Linking.openURL(`https://maps.google.com/?q=${centerLat},${centerLng}`);
                });
              }
            }}
          >
            <Ionicons name="open-outline" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* SVG Map */}
        <View style={styles.svgMapContainer}>
          <Svg width={mapWidth} height={mapHeight} style={styles.svgMap}>
            {/* Background */}
            <Rect x={0} y={0} width={mapWidth} height={mapHeight} fill="#E0F2FE" stroke="#B3E5FC" strokeWidth={1} />
            
            {/* Grid lines */}
            {[1, 2, 3, 4].map(i => (
              <React.Fragment key={i}>
                <Rect 
                  x={(mapWidth / 5) * i} 
                  y={0} 
                  width={1} 
                  height={mapHeight} 
                  fill="#E1F5FE" 
                />
                <Rect 
                  x={0} 
                  y={(mapHeight / 5) * i} 
                  width={mapWidth} 
                  height={1} 
                  fill="#E1F5FE" 
                />
              </React.Fragment>
            ))}
            
            {/* Plot points */}
            {gisPoints.map((point, index) => {
              const coords = getScreenCoords(point.latitude, point.longitude);
              const isSelected = selectedPoint?.id === point.id;
              
              return (
                <React.Fragment key={point.id}>
                  {/* Point marker */}
                  <Circle
                    cx={coords.x}
                    cy={coords.y}
                    r={isSelected ? 8 : 6}
                    fill={isSelected ? "#EF4444" : "#10B981"}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    onPress={() => setSelectedPoint(selectedPoint?.id === point.id ? null : point)}
                  />
                  
                  {/* Point label */}
                  <SvgText
                    x={coords.x}
                    y={coords.y - (isSelected ? 12 : 10)}
                    fontSize="10"
                    fontWeight="bold"
                    fill="#1F2937"
                    textAnchor="middle"
                  >
                    {index + 1}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
          
          {/* Coordinates overlay */}
          <View style={styles.coordinatesOverlay}>
            <Text style={styles.overlayText}>
              📍 {gisPoints.length} location{gisPoints.length !== 1 ? 's' : ''} • Tap points for details
            </Text>
          </View>
        </View>

        {/* Selected Point Details */}
        {selectedPoint && (
          <View style={styles.pointDetails}>
            <View style={styles.pointDetailsHeader}>
              <Text style={styles.pointDetailsTitle}>Location {selectedPoint.id}</Text>
              <TouchableOpacity onPress={() => setSelectedPoint(null)}>
                <Ionicons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.pointDetailsCoords}>
              {selectedPoint.latitude.toFixed(4)}, {selectedPoint.longitude.toFixed(4)}
            </Text>
            
            {selectedPoint.properties && Object.keys(selectedPoint.properties).length > 0 && (
              <Text style={styles.pointDetailsProperties}>
                {Object.entries(selectedPoint.properties)
                  .filter(([key, value]) => value && value !== '')
                  .slice(0, 2)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(' • ')}
              </Text>
            )}
            
            <Text style={styles.pointDetailsDate}>
              Recorded: {selectedPoint.timestamp.toLocaleDateString()}
            </Text>
            
            <TouchableOpacity
              style={styles.openInMapsButton}
              onPress={() => {
                const url = Platform.OS === 'ios' 
                  ? `maps://?q=${selectedPoint.latitude},${selectedPoint.longitude}`
                  : `geo:${selectedPoint.latitude},${selectedPoint.longitude}`;
                Linking.openURL(url).catch(() => {
                  Linking.openURL(`https://maps.google.com/?q=${selectedPoint.latitude},${selectedPoint.longitude}`);
                });
              }}
            >
              <Ionicons name="map-outline" size={14} color="#10B981" />
              <Text style={styles.openInMapsText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Web view - render Leaflet map
  return (
    <div
      ref={mapRef}
      style={{
        height: '200px',
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        ...style
      }}
    />
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginLeft: 8,
  },
  svgMapContainer: {
    alignItems: 'center',
    padding: 16,
    position: 'relative',
  },
  svgMap: {
    borderRadius: 8,
  },
  coordinatesOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  overlayText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  pointDetails: {
    margin: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pointDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pointDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  pointDetailsCoords: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  pointDetailsProperties: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
  pointDetailsDate: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  openInMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  openInMapsText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LeafletMap;