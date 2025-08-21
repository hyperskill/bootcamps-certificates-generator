const { supabaseAdmin, supabase } = require('../utils/supabase');
const { createProfile, getProfile } = require('../utils/supabaseDatabase');

const signup = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm for development
    });

    if (authError) {
      console.error('Signup auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    // Check if profile already exists (created by trigger) or create it manually
    try {
      let profile = await getProfile(authData.user.id);
      
      if (!profile) {
        // Profile doesn't exist, create it manually
        profile = await createProfile({
          id: authData.user.id,
          email,
          full_name: fullName || email.split('@')[0],
          role: 'user'
        });
      } else {
        // Profile exists, update the full_name if provided
        if (fullName && profile.full_name !== fullName) {
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', authData.user.id);
          
          if (updateError) {
            console.error('Profile update error:', updateError);
          }
        }
      }
    } catch (profileError) {
      console.error('Profile handling error:', profileError);
      // Don't fail signup if profile already exists - the trigger might have created it
      if (profileError.message?.includes('duplicate key')) {
        console.log('Profile already exists (likely created by trigger), continuing...');
      } else {
        // For other errors, clean up the auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return res.status(400).json({ error: 'Failed to create user profile' });
      }
    }

    // Check if this is an API request or browser request
    if (req.headers.accept?.includes('application/json')) {
      res.json({ 
        message: 'Account created successfully! Your account is pending approval. You will be able to login once an administrator approves your account.', 
        user: {
          id: authData.user.id,
          email: authData.user.email
        },
        status: 'pending'
      });
    } else {
      // Browser request - redirect to login with success message
      res.redirect('/auth/login?message=signup_success');
    }
  } catch (error) {
    console.error('Signup error:', error);
    if (req.headers.accept?.includes('application/json')) {
      res.status(500).json({ error: 'Signup failed' });
    } else {
      res.redirect('/auth/signup?error=signup_failed');
    }
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Get user profile and check approval status
    const profile = await getProfile(data.user.id);
    
    if (!profile) {
      await supabase.auth.signOut();
      return res.status(403).json({ 
        error: 'Profile not found. Please contact administrator.' 
      });
    }

    // Check if user is approved
    const status = profile.status || 'pending';
    
    if (status === 'pending') {
      // Sign out the user since they're not approved
      await supabase.auth.signOut();
      return res.status(403).json({ 
        error: 'Your account is pending approval. Please wait for an administrator to approve your account.',
        status: 'pending'
      });
    }
    
    if (status === 'rejected') {
      await supabase.auth.signOut();
      return res.status(403).json({ 
        error: profile.rejection_reason || 'Your account has been rejected. Please contact administrator.',
        status: 'rejected'
      });
    }
    
    if (status === 'suspended') {
      await supabase.auth.signOut();
      return res.status(403).json({ 
        error: 'Your account has been suspended. Please contact administrator.',
        status: 'suspended'
      });
    }

    // Only approved users can proceed
    if (status !== 'approved') {
      await supabase.auth.signOut();
      return res.status(403).json({ 
        error: 'Account access denied. Please contact administrator.',
        status: status
      });
    }

    // Store session information for approved users only
    req.session.access_token = data.session.access_token;
    req.session.refresh_token = data.session.refresh_token;
    req.session.user = data.user;

    // Check if this is an API request or browser request
    if (req.headers.accept?.includes('application/json')) {
      res.json({ 
        message: 'Login successful', 
        user: data.user,
        profile: profile,
        session: {
          access_token: data.session.access_token,
          expires_at: data.session.expires_at
        }
      });
    } else {
      // Browser request - redirect to dashboard
      res.redirect('/auth/dashboard');
    }
  } catch (error) {
    console.error('Login error:', error);
    if (req.headers.accept?.includes('application/json')) {
      res.status(500).json({ error: 'Login failed' });
    } else {
      res.redirect('/auth/login?error=login_failed');
    }
  }
};

const logout = async (req, res) => {
  try {
    // If we have a token, sign out from Supabase
    if (req.session?.access_token) {
      await supabase.auth.signOut();
    }

    // Clear session data manually first
    req.session.access_token = null;
    req.session.refresh_token = null;
    req.session.user = null;

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        if (req.headers.accept?.includes('application/json')) {
          return res.status(500).json({ error: 'Logout failed' });
        } else {
          return res.redirect('/auth/login?error=logout_failed');
        }
      }
      
      // Clear the session cookie
      res.clearCookie('connect.sid');
      
      // Check if this is an API request or browser request
      if (req.headers.accept?.includes('application/json')) {
        res.json({ message: 'Logout successful' });
      } else {
        // Browser request - redirect to login with success message
        res.redirect('/auth/login?message=logged_out');
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
    if (req.headers.accept?.includes('application/json')) {
      res.status(500).json({ error: 'Logout failed' });
    } else {
      res.redirect('/auth/login?error=logout_failed');
    }
  }
};

const getProfileHandler = async (req, res) => {
  try {
    const { getProfile, getCertificatesByUser } = require('../utils/supabaseDatabase');
    const profile = await getProfile(req.user.id);
    const certificates = await getCertificatesByUser(req.user.id);

    if (!profile) {
      return res.status(404).send(`
        <!doctype html><meta charset="utf-8">
        <title>Profile Not Found</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
          .error { background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; }
        </style>
        <div class="error">
          <h1>❌ Profile Not Found</h1>
          <p>We couldn't find your profile. Please contact support.</p>
          <a href="/auth/dashboard">← Back to Dashboard</a>
        </div>
      `);
    }

    // Get user statistics
    const totalCerts = certificates.length;
    const completionCerts = certificates.filter(c => c.type === 'completion').length;
    const participationCerts = certificates.filter(c => c.type === 'participation').length;

    res.send(`<!doctype html><meta charset="utf-8">
<title>My Profile - Certificate Generator</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
  .back-link { color: #007bff; text-decoration: none; font-weight: bold; }
  .back-link:hover { text-decoration: underline; }
  .profile-card { background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px; }
  .profile-header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
  .avatar { width: 80px; height: 80px; background: #007bff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; }
  .profile-info h1 { margin: 0; color: #333; }
  .profile-info p { margin: 5px 0; color: #666; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
  .status-approved { background: #d4edda; color: #155724; }
  .status-pending { background: #fff3cd; color: #856404; }
  .status-rejected { background: #f8d7da; color: #721c24; }
  .status-suspended { background: #e2e3e5; color: #495057; }
  .role-badge { background: #17a2b8; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 30px; }
  .stat-card { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; text-align: center; }
  .stat-number { font-size: 24px; font-weight: bold; color: #007bff; margin-bottom: 5px; }
  .stat-label { color: #666; font-size: 14px; }
  .section { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 25px; margin-bottom: 20px; }
  .section h3 { margin-top: 0; color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
  .bootcamp-group { margin-bottom: 30px; }
  .bootcamp-title { color: #007bff; font-size: 18px; font-weight: bold; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e9ecef; }
  .cert-table { width: 100%; border-collapse: collapse; background: white; border-radius: 6px; overflow: hidden; }
  .cert-table th { background: #f8f9fa; padding: 10px 12px; text-align: left; font-weight: 600; color: #495057; border-bottom: 1px solid #dee2e6; font-size: 14px; }
  .cert-table td { padding: 10px 12px; border-bottom: 1px solid #f1f3f4; }
  .cert-table tr:last-child td { border-bottom: none; }
  .cert-table tr:hover { background: #f8f9fa; }
  .student-name { font-weight: 600; color: #333; }
  .cert-type { padding: 3px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; }
  .type-completion { background: #d4edda; color: #155724; }
  .type-participation { background: #cce8ff; color: #004085; }
  .cert-actions a { color: #007bff; text-decoration: none; margin-right: 8px; font-size: 12px; }
  .cert-actions a:hover { text-decoration: underline; }
  .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; margin-right: 10px; }
  .btn:hover { background: #0056b3; }
  .btn-secondary { background: #6c757d; }
  .btn-secondary:hover { background: #545b62; }
  .empty-state { text-align: center; color: #666; padding: 40px; }
</style>

<div class="header">
  <a href="/auth/dashboard" class="back-link">← Back to Dashboard</a>
  <div>
    <a href="/auth/logout" class="btn btn-secondary">Logout</a>
  </div>
</div>

<div class="profile-card">
  <div class="profile-header">
    <div class="avatar">${(profile.full_name || profile.email || 'U').charAt(0).toUpperCase()}</div>
    <div class="profile-info">
      <h1>${profile.full_name || 'No Name Set'}</h1>
      <p><strong>Email:</strong> ${profile.email}</p>
      <p>
        <strong>Status:</strong> 
        <span class="status-badge status-${profile.status || 'pending'}">${(profile.status || 'pending').toUpperCase()}</span>
        ${profile.role === 'admin' ? '<span class="role-badge">ADMIN</span>' : ''}
      </p>
      <p><strong>Member since:</strong> ${new Date(profile.created_at).toLocaleDateString()}</p>
    </div>
  </div>
</div>

<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-number">${totalCerts}</div>
    <div class="stat-label">Total Certificates</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">${completionCerts}</div>
    <div class="stat-label">Completion</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">${participationCerts}</div>
    <div class="stat-label">Participation</div>
  </div>
</div>

<div class="section">
  <h3>My Certificates</h3>
  ${certificates.length === 0 ? '<div class="empty-state">No certificates yet</div>' : 
    (() => {
      // Group certificates by bootcamp
      const groupedCerts = certificates.reduce((groups, cert) => {
        const bootcamp = cert.bootcamp || 'Unknown Bootcamp';
        if (!groups[bootcamp]) groups[bootcamp] = [];
        groups[bootcamp].push(cert);
        return groups;
      }, {});
      
      return Object.entries(groupedCerts).map(([bootcamp, certs]) => `
        <div class="bootcamp-group">
          <div class="bootcamp-title">${bootcamp} (${certs.length} certificate${certs.length === 1 ? '' : 's'})</div>
          <table class="cert-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Type</th>
                <th>Format</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${certs.map(cert => `
                <tr>
                  <td class="student-name">${cert.student_name || 'Unknown Student'}</td>
                  <td><span class="cert-type type-${cert.type}">${cert.type === 'completion' ? 'Completion' : 'Participation'}</span></td>
                  <td>${cert.format === 'portrait' ? 'Portrait' : 'Landscape'}</td>
                  <td>${new Date(cert.created_at).toLocaleDateString()}</td>
                  <td class="cert-actions">
                    <a href="${cert.file_url}" target="_blank">View PDF</a>
                    <a href="${cert.verify_url}" target="_blank">Verify</a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('');
    })()
  }
</div>

<div class="section">
  <h3>Quick Actions</h3>
  <a href="/admin" class="btn">Generate New Certificate</a>
  <a href="/auth/dashboard" class="btn btn-secondary">View Dashboard</a>
  ${profile.role === 'admin' ? '<a href="/admin/users" class="btn" style="background: #fd7e14;">👥 Manage Users</a>' : ''}
  ${profile.role === 'admin' ? '<a href="/admin/certificates" class="btn" style="background: #28a745;">📄 All Certificates</a>' : ''}
</div>
`);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).send(`
      <!doctype html><meta charset="utf-8">
      <title>Profile Error</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
        .error { background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; }
      </style>
      <div class="error">
        <h1>❌ Profile Error</h1>
        <p>There was an error loading your profile. Please try again later.</p>
        <a href="/auth/dashboard">← Back to Dashboard</a>
      </div>
    `);
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.session;

    if (!refresh_token) {
      return res.status(401).json({ error: 'No refresh token available' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Update session
    req.session.access_token = data.session.access_token;
    req.session.refresh_token = data.session.refresh_token;
    req.session.user = data.user;

    res.json({ 
      message: 'Token refreshed successfully',
      session: {
        access_token: data.session.access_token,
        expires_at: data.session.expires_at
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

// Simple HTML forms for development/testing
const getLoginForm = (req, res) => {
  const message = req.query.message;
  const error = req.query.error;
  
  let alertHtml = '';
  
  // Success messages
  if (message === 'logged_out') {
    alertHtml = '<div class="success">✅ You have been successfully logged out.</div>';
  } else if (message === 'signup_success') {
    alertHtml = '<div class="success">✅ Account created successfully! Your account is pending approval. You will be able to login once an administrator approves your account.</div>';
  }
  
  // Error messages
  else if (error === 'logout_failed') {
    alertHtml = '<div class="error">❌ Logout failed. Please try again.</div>';
  } else if (error === 'login_failed') {
    alertHtml = '<div class="error">❌ Login failed. Please check your credentials and try again.</div>';
  } else if (error === 'unauthorized') {
    alertHtml = '<div class="error">🔒 You need to login to access that page.</div>';
  }
  
  res.send(`<!doctype html><meta charset="utf-8">
<title>Login - Certificate Generator</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
  .form-group { margin-bottom: 20px; }
  label { display: block; margin-bottom: 5px; font-weight: bold; }
  input[type="email"], input[type="password"] { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; }
  button { background: #007bff; color: white; padding: 14px 28px; border: none; border-radius: 6px; cursor: pointer; width: 100%; }
  button:hover { background: #0056b3; }
  .links { text-align: center; margin-top: 20px; }
  .links a { color: #007bff; text-decoration: none; }
  .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
  .success { background: #d4edda; color: #155724; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
</style>
<h2>Login to Certificate Generator</h2>
${alertHtml}
<form method="POST" action="/auth/login">
  <div class="form-group">
    <label>Email</label>
    <input type="email" name="email" required>
  </div>
  <div class="form-group">
    <label>Password</label>
    <input type="password" name="password" required>
  </div>
  <button type="submit">Login</button>
</form>
<div class="links">
  <a href="/auth/signup">Don't have an account? Sign up</a>
</div>`);
};

const getSignupForm = (req, res) => {
  const error = req.query.error;
  
  let alertHtml = '';
  if (error === 'signup_failed') {
    alertHtml = '<div class="error">❌ Signup failed. Please try again or contact support.</div>';
  }
  
  res.send(`<!doctype html><meta charset="utf-8">
<title>Sign Up - Certificate Generator</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
  .form-group { margin-bottom: 20px; }
  label { display: block; margin-bottom: 5px; font-weight: bold; }
  input[type="email"], input[type="password"], input[type="text"] { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; }
  button { background: #007bff; color: white; padding: 14px 28px; border: none; border-radius: 6px; cursor: pointer; width: 100%; }
  button:hover { background: #0056b3; }
  .links { text-align: center; margin-top: 20px; }
  .links a { color: #007bff; text-decoration: none; }
  .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
</style>
<h2>Sign Up for Certificate Generator</h2>
${alertHtml}
<form method="POST" action="/auth/signup">
  <div class="form-group">
    <label>Full Name</label>
    <input type="text" name="fullName" required>
  </div>
  <div class="form-group">
    <label>Email</label>
    <input type="email" name="email" required>
  </div>
  <div class="form-group">
    <label>Password</label>
    <input type="password" name="password" required minlength="6">
  </div>
  <button type="submit">Sign Up</button>
</form>
<div class="links">
  <a href="/auth/login">Already have an account? Login</a>
</div>`);
};

module.exports = { 
  signup, 
  login, 
  logout, 
  getProfileHandler, 
  refreshToken, 
  getLoginForm, 
  getSignupForm 
};
