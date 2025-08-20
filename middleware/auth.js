const { supabaseAdmin } = require('../utils/supabase');

const requireAuth = async (req, res, next) => {
  try {
    // Check for token in Authorization header or session
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.session?.access_token;
    
    if (!token) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Authentication required' });
      } else {
        return res.redirect('/auth/login?error=unauthorized');
      }
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      // Clear invalid session
      if (req.session) {
        req.session.access_token = null;
        req.session.refresh_token = null;
        req.session.user = null;
      }
      
      if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      } else {
        return res.redirect('/auth/login?error=unauthorized');
      }
    }

    // Add user to request object
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (req.headers.accept?.includes('application/json')) {
      res.status(401).json({ error: 'Authentication failed' });
    } else {
      res.redirect('/auth/login?error=unauthorized');
    }
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Authentication required' });
      } else {
        return res.redirect('/auth/login?error=unauthorized');
      }
    }

    // Check if user has admin role in profiles table
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error) {
      console.error('Admin check error:', error);
      if (req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ error: 'Authorization check failed' });
      } else {
        return res.redirect('/auth/dashboard?error=admin_required');
      }
    }

    if (profile?.role !== 'admin') {
      if (req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ error: 'Admin access required' });
      } else {
        return res.redirect('/auth/dashboard?error=admin_required');
      }
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    if (req.headers.accept?.includes('application/json')) {
      res.status(403).json({ error: 'Authorization failed' });
    } else {
      res.redirect('/auth/dashboard?error=admin_required');
    }
  }
};

// Optional auth - doesn't block if no auth, but adds user if available
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.session?.access_token;
    
    if (token) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        req.user = user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Continue without auth if there's an error
    next();
  }
};

module.exports = { requireAuth, requireAdmin, optionalAuth };
