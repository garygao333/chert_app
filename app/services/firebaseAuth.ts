import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User,
  AuthError
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

class FirebaseAuthService {
  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return {
        user: userCredential.user,
        error: null
      };
    } catch (error) {
      console.error('Firebase sign in error:', error);
      return {
        user: null,
        error: error as AuthError
      };
    }
  }

  // Sign up with email and password
  async signUp(email: string, password: string): Promise<AuthResponse> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return {
        user: userCredential.user,
        error: null
      };
    } catch (error) {
      console.error('Firebase sign up error:', error);
      return {
        user: null,
        error: error as AuthError
      };
    }
  }

  // Sign out
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      await signOut(auth);
      return { error: null };
    } catch (error) {
      console.error('Firebase sign out error:', error);
      return { error: error as AuthError };
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error) {
      console.error('Firebase password reset error:', error);
      return { error: error as AuthError };
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void) {
    return auth.onAuthStateChanged(callback);
  }
}

export default new FirebaseAuthService();
