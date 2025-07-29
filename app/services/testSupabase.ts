// Test Supabase connection and data fetching
import { SupabaseService } from '../services/supabaseService';

export async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...');
  
  try {
    // Test fetching projects
    console.log('📂 Fetching projects...');
    const projects = await SupabaseService.getProjects();
    console.log(`✅ Found ${projects.length} projects:`, projects.map(p => p.name));
    
    // Test fetching dashboard stats
    console.log('📊 Fetching dashboard stats...');
    const stats = await SupabaseService.getDashboardStats();
    console.log('✅ Dashboard stats:', stats);
    
    // Test fetching recent activity
    console.log('📝 Fetching recent activity...');
    const activity = await SupabaseService.getRecentActivity(5);
    console.log(`✅ Found ${activity.length} recent activities`);
    
    if (projects.length > 0) {
      // Test fetching project details
      const firstProject = projects[0];
      console.log(`🔍 Testing project details for: ${firstProject.name}`);
      
      const projectDetails = await SupabaseService.getProject(firstProject.id);
      const projectStats = await SupabaseService.getProjectStats(firstProject.id);
      const projectActivity = await SupabaseService.getRecentActivity(3, firstProject.id);
      
      console.log('✅ Project details:', projectDetails?.name);
      console.log('✅ Project stats:', projectStats);
      console.log(`✅ Project activity: ${projectActivity.length} items`);
    }
    
    console.log('🎉 All Supabase tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Supabase test failed:', error);
    return false;
  }
}

// Export for use in components
export default testSupabaseConnection;
