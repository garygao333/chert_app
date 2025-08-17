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

      const projectId = docRef.id;

      // Initialize empty CSV if project has dataColumns
      if (projectData.dataColumns && projectData.dataColumns.length > 0) {
        console.log(`Initializing CSV for new project ${projectId} with columns:`, projectData.dataColumns);
        await this.initializeProjectCSV(projectId, projectData.dataColumns);
      }

      return projectId;
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

  // CSV Storage Methods
  
  // Initialize empty CSV for a project
  async initializeProjectCSV(projectId: string, columns: string[]): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Create CSV header row
      const csvHeader = columns.join(',');
      const csvData = csvHeader + '\n'; // Start with header and newline

      // Update project with CSV data
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        csvContent: csvData,
        csvMetadata: {
          totalRows: 0, // No data rows yet, just header
          fileName: `${projectId}_data.csv`,
          fileSize: csvData.length,
          sampleRows: [], // No sample rows yet
          lastUpdated: new Date()
        }
      });

      console.log(`Initialized CSV for project ${projectId} with columns:`, columns);
      return true;
    } catch (error) {
      console.error('Error initializing project CSV:', error);
      return false;
    }
  }

  // Append data rows to project CSV
  async appendToProjectCSV(projectId: string, records: Array<Record<string, any>>): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      console.log(`DEBUG: Looking for project_csvs document for project ${projectId}, user ${user.uid}`);

      // Find existing project_csvs document
      const q = query(
        collection(db, 'project_csvs'),
        where('projectId', '==', projectId),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`DEBUG: Found ${querySnapshot.size} project_csvs documents`);
      
      if (querySnapshot.empty) {
        console.log('DEBUG: No project_csvs document found, attempting to create one...');
        
        // Try to get project to initialize CSV
        const project = await this.getProject(projectId);
        if (project && project.dataColumns) {
          console.log('DEBUG: Creating project_csvs document with columns:', project.dataColumns);
          const success = await this.initializeProjectCSV(projectId, project.dataColumns);
          if (!success) {
            throw new Error('Failed to initialize project CSV');
          }
        } else {
          throw new Error('Project not found or has no dataColumns');
        }
      }
      
      // Get the document (either existing or newly created)
      const finalQuerySnapshot = await getDocs(q);
      if (finalQuerySnapshot.empty) {
        throw new Error('Project CSV document still not found after initialization');
      }

      const csvDoc = finalQuerySnapshot.docs[0];
      const csvData = csvDoc.data();
      
      console.log('DEBUG: CSV document data:', csvData);
      
      // Convert records to row format matching the columns
      const newRows = records.map(record => {
        const row: Record<string, any> = {};
        csvData.columns.forEach((column: string) => {
          row[column] = record[column] || '';
        });
        // Add timestamp and confidence if they exist
        if (record.timestamp) row.timestamp = record.timestamp;
        if (record.confidence !== undefined) row.confidence = record.confidence;
        return row;
      });

      console.log('DEBUG: New rows to add:', newRows);

      // Append to existing rows
      const updatedRows = [...(csvData.rows || []), ...newRows];
      console.log('DEBUG: Updated rows array length:', updatedRows.length);

      // Update the document
      await updateDoc(doc(db, 'project_csvs', csvDoc.id), {
        rows: updatedRows,
        updatedAt: new Date()
      });
      
      console.log('DEBUG: Successfully updated project_csvs document');

      // Create commit log entry
      await addDoc(collection(db, 'commit_logs'), {
        projectId,
        userId: user.uid,
        action: 'sync_local_data',
        recordsAdded: records.length,
        timestamp: new Date(),
        description: `Synced ${records.length} local records to project CSV`
      });

      console.log(`Appended ${records.length} records to project ${projectId} CSV`);
      return true;
    } catch (error) {
      console.error('Error appending to project CSV:', error);
      return false;
    }
  }

  // Get CSV content for download
  async getProjectCSV(projectId: string): Promise<string | null> {
    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectDoc = await getDoc(projectRef);
      
      if (!projectDoc.exists()) {
        throw new Error('Project not found');
      }

      const project = projectDoc.data() as Project;
      return project.csvContent || null;
    } catch (error) {
      console.error('Error getting project CSV:', error);
      return null;
    }
  }

  // Get commit logs for a project
  async getCommitLogs(projectId: string): Promise<Array<Record<string, any>>> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      console.log(`DEBUG: Getting commit logs for project ${projectId}, user ${user.uid}`);

      // Find commit logs for this project
      const q = query(
        collection(db, 'commit_logs'),
        where('projectId', '==', projectId),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`DEBUG: Found ${querySnapshot.size} commit log documents`);
      
      const commitLogs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));

      // Sort by timestamp (newest first)
      commitLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      console.log(`DEBUG: Returning ${commitLogs.length} commit logs:`, commitLogs);
      return commitLogs;
    } catch (error) {
      console.error('Error getting commit logs:', error);
      return [];
    }
  }

  // Get project analytics
  async getProjectAnalytics(projectId: string): Promise<Record<string, any>> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      console.log(`DEBUG: Getting analytics for project ${projectId}, user ${user.uid}`);

      // Get project_csvs data
      const q = query(
        collection(db, 'project_csvs'),
        where('projectId', '==', projectId),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return {
          totalRecords: 0,
          uniqueValues: {},
          fieldCompleteness: {},
          recentActivity: [],
          topValues: {}
        };
      }

      const csvData = querySnapshot.docs[0].data();
      const rows = csvData.rows || [];
      const columns = csvData.columns || [];

      // Calculate analytics
      const analytics = {
        totalRecords: rows.length,
        uniqueValues: {} as Record<string, number>,
        fieldCompleteness: {} as Record<string, number>,
        topValues: {} as Record<string, Array<{value: string, count: number}>>,
        recentActivity: rows.slice(-5).reverse() // Last 5 entries
      };

      // Calculate field statistics
      columns.forEach((column: string) => {
        if (column === 'timestamp' || column === 'confidence') return;

        const values = rows.map((row: any) => row[column]).filter(v => v && v !== '');
        const uniqueVals = new Set(values);
        
        analytics.uniqueValues[column] = uniqueVals.size;
        analytics.fieldCompleteness[column] = Math.round((values.length / rows.length) * 100);

        // Get top 3 values for each field
        const valueCounts: Record<string, number> = {};
        values.forEach(val => {
          const strVal = String(val);
          valueCounts[strVal] = (valueCounts[strVal] || 0) + 1;
        });

        analytics.topValues[column] = Object.entries(valueCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([value, count]) => ({ value, count }));
      });

      console.log(`DEBUG: Analytics calculated:`, analytics);
      return analytics;
    } catch (error) {
      console.error('Error getting project analytics:', error);
      return {
        totalRecords: 0,
        uniqueValues: {},
        fieldCompleteness: {},
        recentActivity: [],
        topValues: {}
      };
    }
  }

  // Get first 5 samples from project CSV
  async getProjectSamples(projectId: string): Promise<Array<Record<string, any>>> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      console.log(`DEBUG: Getting samples for project ${projectId}, user ${user.uid}`);

      // Find project_csvs document
      const q = query(
        collection(db, 'project_csvs'),
        where('projectId', '==', projectId),
        where('userId', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`DEBUG: Found ${querySnapshot.size} project_csvs documents for samples`);
      
      if (querySnapshot.empty) {
        console.log('DEBUG: No project_csvs document found for samples');
        return [];
      }

      const csvData = querySnapshot.docs[0].data();
      const rows = csvData.rows || [];
      console.log(`DEBUG: Total rows available: ${rows.length}`);

      // Filter out specific dummy data coordinates (more precise filtering)
      const dummyCoordinates = ['39.952583', '40.712776', '34.052235'];
      const filteredRows = rows.filter((row: any) => {
        const rowString = JSON.stringify(row);
        // Only filter out rows that contain the exact dummy coordinates
        return !dummyCoordinates.some(coordinate => rowString.includes(coordinate));
      });

      // Return first 5 non-dummy rows
      const samples = filteredRows.slice(0, 5);
      console.log(`DEBUG: Returning ${samples.length} filtered samples (excluded dummy data):`, samples);
      return samples;
    } catch (error) {
      console.error('Error getting project samples:', error);
      return [];
    }
  }
}

export default new FirebaseService();