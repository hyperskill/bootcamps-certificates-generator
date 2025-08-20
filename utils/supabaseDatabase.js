const { supabaseAdmin } = require('./supabase');

// Certificate operations
const saveCertificate = async (certificateData) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .insert([certificateData])
      .select()
      .single();

    if (error) {
      console.error('Supabase save error:', error);
      throw new Error(`Failed to save certificate: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Save certificate error:', error);
    throw error;
  }
};

const getCertificateByUid = async (uid) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('uid', uid)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Supabase get error:', error);
      throw new Error(`Failed to get certificate: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Get certificate error:', error);
    return null; // Return null for not found instead of throwing
  }
};

const getCertificatesByUser = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase get user certificates error:', error);
      throw new Error(`Failed to get user certificates: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Get user certificates error:', error);
    throw error;
  }
};

const getAllCertificates = async (limit = 100, offset = 0) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase get all certificates error:', error);
      throw new Error(`Failed to get all certificates: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Get all certificates error:', error);
    throw error;
  }
};

// Profile operations
const createProfile = async (userData) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.error('Supabase create profile error:', error);
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Create profile error:', error);
    throw error;
  }
};

const getProfile = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase get profile error:', error);
      throw new Error(`Failed to get profile: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Get profile error:', error);
    return null;
  }
};

// Migration function to import existing JSON data
const migrateFromJson = async () => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const jsonPath = path.join(__dirname, '..', process.env.DB_DIR || 'db', process.env.DB_FILE || 'certs.json');
    
    if (!fs.existsSync(jsonPath)) {
      console.log('No JSON file found to migrate');
      return { migrated: 0 };
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    let migratedCount = 0;
    
    console.log(`Found ${jsonData.length} certificates to migrate...`);
    
    for (const cert of jsonData) {
      try {
        // Create migration data with proper format
        const migrationData = {
          uid: cert.uid,
          user_id: null, // Will need to be assigned to users later
          bootcamp: cert.bootcamp || cert.name || 'Legacy Certificate',
          format: cert.format || 'landscape',
          type: cert.type || 'completion',
          description: cert.description || cert.program || '',
          original_filename: cert.originalFilename || 'legacy-certificate',
          file_url: cert.file_url,
          verify_url: cert.verify_url,
          created_at: cert.createdAt || cert.date || new Date().toISOString()
        };

        await saveCertificate(migrationData);
        migratedCount++;
        console.log(`Migrated certificate ${migratedCount}/${jsonData.length}: ${cert.uid}`);
      } catch (error) {
        console.error(`Failed to migrate certificate ${cert.uid}:`, error.message);
      }
    }

    console.log(`Successfully migrated ${migratedCount} certificates to Supabase`);
    
    // Backup and remove JSON file
    const backupPath = `${jsonPath}.backup-${Date.now()}`;
    fs.renameSync(jsonPath, backupPath);
    console.log(`Original JSON file backed up to: ${backupPath}`);
    
    return { migrated: migratedCount, backup: backupPath };
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Health check function
const testConnection = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('certificates')
      .select('count')
      .limit(1);

    if (error) {
      throw error;
    }

    return { connected: true, message: 'Supabase connection successful' };
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return { connected: false, error: error.message };
  }
};

// User management functions
const getAllUsers = async (status = null) => {
  try {
    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get users error:', error);
      throw new Error(`Failed to get users: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Get all users error:', error);
    throw error;
  }
};

const updateUserStatus = async (userId, status, adminId, reason = null, notes = null) => {
  try {
    const updateData = {
      status,
      approved_by: adminId,
      approved_at: status === 'approved' ? new Date().toISOString() : null,
      rejection_reason: status === 'rejected' ? reason : null,
      notes
    };

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Update user status error:', error);
      throw new Error(`Failed to update user status: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Update user status error:', error);
    throw error;
  }
};

const getPendingUsersCount = async () => {
  try {
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      console.error('Get pending count error:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Get pending users count error:', error);
    return 0;
  }
};

module.exports = {
  saveCertificate,
  getCertificateByUid,
  getCertificatesByUser,
  getAllCertificates,
  createProfile,
  getProfile,
  migrateFromJson,
  testConnection,
  getAllUsers,
  updateUserStatus,
  getPendingUsersCount
};
