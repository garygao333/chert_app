import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './firebase';
import type { Project } from '../types';

class FirebaseService {
  private currentUser: User | null = null;

  constructor() {
    // Listen to auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser || auth.currentUser;
  }

  // Fetch projects from Firebase
  async getProjects(): Promise<Project[]> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        console.warn('No authenticated user found');
        return [];
      }

      // Use only where clause to avoid composite index requirement
      // We'll sort the results in memory instead
      const q = query(
        collection(db, 'projects'), 
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const projectsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Project[];
      
      // Sort by createdAt in descending order (most recent first)
      return projectsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  // Get a single project by ID
  async getProject(projectId: string): Promise<Project | null> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        console.warn('No authenticated user found');
        return null;
      }

      // Get the document directly by ID and then check userId
      const docRef = doc(db, 'projects', projectId);
      const docSnap = await getDocs(query(collection(db, 'projects'), where('userId', '==', user.uid)));
      
      // Find the project by ID among user's projects
      const userProject = docSnap.docs.find(d => d.id === projectId);
      
      if (!userProject) {
        return null;
      }

      return {
        id: userProject.id,
        ...userProject.data(),
        createdAt: userProject.data().createdAt?.toDate() || new Date(),
        updatedAt: userProject.data().updatedAt?.toDate(),
      } as Project;
    } catch (error) {
      console.error('Error fetching project:', error);
      return null;
    }
  }

  // Create a new project
  async createProject(projectData: Omit<Project, 'id'>): Promise<string | null> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const docRef = await addDoc(collection(db, 'projects'), {
        ...projectData,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating project:', error);
      return null;
    }
  }

  // Update a project
  async updateProject(projectId: string, updates: Partial<Project>): Promise<boolean> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      await updateDoc(doc(db, 'projects', projectId), {
        ...updates,
        updatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      return false;
    }
  }

  // Delete a project
  async deleteProject(projectId: string): Promise<boolean> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      await deleteDoc(doc(db, 'projects', projectId));
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  // Listen to projects in real-time
  subscribeToProjects(callback: (projects: Project[]) => void): () => void {
    const user = this.getCurrentUser();
    if (!user) {
      console.warn('No authenticated user found');
      return () => {};
    }

    // Use only where clause to avoid composite index requirement
    const q = query(
      collection(db, 'projects'),
      where('userId', '==', user.uid)
    );

    return onSnapshot(q, (querySnapshot) => {
      const projects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Project[];
      
      // Sort by createdAt in descending order (most recent first)
      const sortedProjects = projects.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(sortedProjects);
    }, (error) => {
      console.error('Error listening to projects:', error);
      callback([]);
    });
  }
}

export default new FirebaseService();