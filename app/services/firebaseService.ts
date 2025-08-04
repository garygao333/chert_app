import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  updateDoc,
  onSnapshot,
  getDoc,
  limit
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './firebase';
import type { Project } from '../types';

// Additional interfaces for Firebase service
interface DataRecord {
  id: string;
  projectId: string;
  userId: string;
  data: Record<string, string>;
  createdAt: Date;
  method: string;
  source?: string;
}

interface ProjectStats {
  totalRecords: number;
  lastActivity: Date | null;
}

interface RecentActivity {
  id: string;
  type: 'commit' | 'create' | 'update';
  description: string;
  projectId: string;
  projectName: string;
  timestamp: Date;
}

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

  // Get project statistics
  async getProjectStats(projectId: string): Promise<ProjectStats> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return { totalRecords: 0, lastActivity: null };
      }

      // Count records for this project
      const recordsQuery = query(
        collection(db, 'records'),
        where('projectId', '==', projectId),
        where('userId', '==', user.uid)
      );
      
      const recordsSnapshot = await getDocs(recordsQuery);
      const totalRecords = recordsSnapshot.size;

      // Get the most recent activity (latest record)
      let lastActivity: Date | null = null;
      if (recordsSnapshot.docs.length > 0) {
        const sortedRecords = recordsSnapshot.docs
          .map(doc => ({ ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date() }))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        if (sortedRecords.length > 0) {
          lastActivity = sortedRecords[0].createdAt;
        }
      }

      return { totalRecords, lastActivity };
    } catch (error) {
      console.error('Error getting project stats:', error);
      return { totalRecords: 0, lastActivity: null };
    }
  }

  // Get recent activity for a project
  async getRecentActivity(limitCount: number = 5, projectId?: string): Promise<RecentActivity[]> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return [];
      }

      let recordsQuery = query(
        collection(db, 'records'),
        where('userId', '==', user.uid)
      );

      if (projectId) {
        recordsQuery = query(
          collection(db, 'records'),
          where('userId', '==', user.uid),
          where('projectId', '==', projectId)
        );
      }

      const recordsSnapshot = await getDocs(recordsQuery);
      
      // Transform records into activity items
      const activities: RecentActivity[] = recordsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'create' as const,
          description: `Added new record via ${data.method || 'unknown'}`,
          projectId: data.projectId,
          projectName: 'Project', // We'd need to fetch project name if needed
          timestamp: data.createdAt?.toDate() || new Date(),
        };
      });

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limitCount);
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }

  // Get data records for a project
  async getDataRecords(projectId: string, limitCount: number = 50, offset: number = 0): Promise<{
    records: DataRecord[];
    total: number;
  }> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return { records: [], total: 0 };
      }

      const recordsQuery = query(
        collection(db, 'records'),
        where('projectId', '==', projectId),
        where('userId', '==', user.uid)
      );

      const recordsSnapshot = await getDocs(recordsQuery);
      
      const allRecords = recordsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as DataRecord[];

      // Sort by creation date (newest first)
      const sortedRecords = allRecords.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Apply pagination
      const paginatedRecords = sortedRecords.slice(offset, offset + limitCount);

      return {
        records: paginatedRecords,
        total: allRecords.length
      };
    } catch (error) {
      console.error('Error getting data records:', error);
      return { records: [], total: 0 };
    }
  }

  // Create a data record
  async createDataRecord(
    projectId: string,
    data: Record<string, string>,
    method: string = 'manual',
    source?: string
  ): Promise<string | null> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const recordData = {
        projectId,
        userId: user.uid,
        data,
        method,
        source: source || '',
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'records'), recordData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating data record:', error);
      return null;
    }
  }

  // Delete a data record
  async deleteDataRecord(recordId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'records', recordId));
      return true;
    } catch (error) {
      console.error('Error deleting data record:', error);
      return false;
    }
  }
}

export default new FirebaseService();