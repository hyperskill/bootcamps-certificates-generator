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
  const templateRenderer = require('../utils/templateRenderer');
  
  try {
    const { getProfile, getCertificatesByUser } = require('../utils/supabaseDatabase');
    const profile = await getProfile(req.user.id);
    const certificates = await getCertificatesByUser(req.user.id);

    if (!profile) {
      const html = templateRenderer.renderAdvanced('verification', {
        title: 'Profile Not Found',
        isValid: false,
        error: true
      }, ['common', 'verification']);
      
      return res.status(404).send(html);
    }

    // Get user statistics
    const totalCerts = certificates.length;
    const completionCerts = certificates.filter(c => c.type === 'completion').length;
    const participationCerts = certificates.filter(c => c.type === 'participation').length;

    // Generate certificates content HTML
    let certificatesContent = '';
    if (certificates.length === 0) {
      certificatesContent = '<div class="empty-state">No certificates yet</div>';
    } else {
      // Group certificates by bootcamp
      const groupedCerts = certificates.reduce((groups, cert) => {
        const bootcamp = cert.bootcamp || 'Unknown Bootcamp';
        if (!groups[bootcamp]) groups[bootcamp] = [];
        groups[bootcamp].push(cert);
        return groups;
      }, {});
      
      certificatesContent = Object.entries(groupedCerts).map(([bootcamp, certs]) => `
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
    }

    const html = templateRenderer.renderAdvanced('profile-simple', {
      title: 'My Profile - Certificate Generator',
      avatar: (profile.full_name || profile.email || 'U').charAt(0).toUpperCase(),
      fullName: profile.full_name || 'No Name Set',
      email: profile.email,
      status: profile.status || 'pending',
      statusLabel: (profile.status || 'pending').toUpperCase(),
      isAdmin: profile.role === 'admin',
      memberSince: new Date(profile.created_at).toLocaleDateString(),
      totalCerts,
      completionCerts,
      participationCerts,
      certificatesContent
    }, ['common', 'dashboard', 'tables']);

    res.send(html);
  } catch (error) {
    console.error('Profile error:', error);
    const html = templateRenderer.renderAdvanced('verification', {
      title: 'Profile Error',
      isValid: false,
      error: true
    }, ['common', 'verification']);
    
    res.status(500).send(html);
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
  const templateRenderer = require('../utils/templateRenderer');
  const message = req.query.message;
  const error = req.query.error;
  
  let alertHtml = '';
  
  // Success messages
  if (message === 'logged_out') {
    alertHtml = templateRenderer.createAlert('success', '✅ You have been successfully logged out.');
  } else if (message === 'signup_success') {
    alertHtml = templateRenderer.createAlert('success', '✅ Account created successfully! Your account is pending approval. You will be able to login once an administrator approves your account.');
  }
  
  // Error messages
  else if (error === 'logout_failed') {
    alertHtml = templateRenderer.createAlert('error', '❌ Logout failed. Please try again.');
  } else if (error === 'login_failed') {
    alertHtml = templateRenderer.createAlert('error', '❌ Login failed. Please check your credentials and try again.');
  } else if (error === 'unauthorized') {
    alertHtml = templateRenderer.createAlert('error', '🔒 You need to login to access that page.');
  }
  
  const html = templateRenderer.renderAdvanced('login', {
    title: 'Login - Certificate Generator',
    alerts: alertHtml
  }, ['common', 'forms']);
  
  res.send(html);
};

const getSignupForm = (req, res) => {
  const templateRenderer = require('../utils/templateRenderer');
  const error = req.query.error;
  
  let alertHtml = '';
  if (error === 'signup_failed') {
    alertHtml = templateRenderer.createAlert('error', '❌ Signup failed. Please try again or contact support.');
  }
  
  const html = templateRenderer.renderAdvanced('signup', {
    title: 'Sign Up - Certificate Generator',
    alerts: alertHtml
  }, ['common', 'forms']);
  
  res.send(html);
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
