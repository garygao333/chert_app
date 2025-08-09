// Remove dotenv import for production builds - use hardcoded values instead

export default {
  expo: {
    name: "Chert",
    slug: "chert-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.chert.app",
      buildNumber: "6",
      icon: "./assets/icon.png",
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSExceptionDomains: {
            "localhost": {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSExceptionMinimumTLSVersion: "1.0"
            },
            "supabase.co": {
              NSExceptionRequiresForwardSecrecy: false,
              NSExceptionMinimumTLSVersion: "1.0"
            },
            "herokuapp.com": {
              NSExceptionRequiresForwardSecrecy: false,
              NSExceptionMinimumTLSVersion: "1.0"
            }
          }
        }
      },
      config: {
        usesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.chert.app"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      supabaseUrl: "https://suiqpfnvfadscyvtgcjz.supabase.co",
      supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1aXFwZm52ZmFkc2N5dnRnY2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTc5MDQsImV4cCI6MjA2OTA3MzkwNH0.c-Twnh7ZlO9dBFKpTye1VMciXfeXeczlWkyJAZurx4g",
      apiUrl: "https://chert-backend-d92c4cd51927.herokuapp.com",
      eas: {
        projectId: "df54e4af-a952-4515-a6fd-481cc9f896c6"
      }
    },
    plugins: [
      "expo-av",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static"
          }
        }
      ]
    ]
  }
};
