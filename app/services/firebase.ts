import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - hardcoded for production builds
const firebaseConfig = {
  apiKey: "AIzaSyALbvNTAboDp-bDhhMnHvQD_hVmCU6uUA4",
  authDomain: "chert-2025.firebaseapp.com",
  projectId: "chert-2025",
  storageBucket: "chert-2025.firebasestorage.app",
  messagingSenderId: "770957748876",
  appId: "1:770957748876:web:49f94e987cdd7c4c99a9a9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
export default app;
