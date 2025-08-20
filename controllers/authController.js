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

    res.json({ 
      message: 'Account created successfully! Your account is pending approval. You will be able to login once an administrator approves your account.', 
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      status: 'pending'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
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

    res.json({ 
      message: 'Login successful', 
      user: data.user,
      profile: profile,
      session: {
        access_token: data.session.access_token,
        expires_at: data.session.expires_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const logout = async (req, res) => {
  try {
    // If we have a token, sign out from Supabase
    if (req.session?.access_token) {
      await supabase.auth.signOut();
    }

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ message: 'Logout successful' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

const getProfileHandler = async (req, res) => {
  try {
    const profile = await getProfile(req.user.id);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
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
</style>
<h2>Login to Certificate Generator</h2>
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
</style>
<h2>Sign Up for Certificate Generator</h2>
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
