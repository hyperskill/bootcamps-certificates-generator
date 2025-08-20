require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

// Import routes
const adminRoutes = require('./routes/admin');
const certRoutes = require('./routes/certs');
const verifyRoutes = require('./routes/verify');
const authRoutes = require('./routes/auth');

// Import middleware
const { optionalAuth } = require('./middleware/auth');

const PORT = process.env.PORT || 3000;

const app = express();

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files middleware
app.use(express.static(path.join(__dirname, process.env.PUBLIC_DIR || 'public')));

// Routes
app.use('/auth', authRoutes);
app.use('/admin', optionalAuth, adminRoutes); // Optional auth - allows both authenticated and anonymous users
app.use('/certs', optionalAuth, certRoutes);  // Optional auth - allows both authenticated and anonymous users
app.use('/verify', verifyRoutes); // Keep verify public

// Root route
app.get('/', (req, res) => {
  res.redirect('/auth/dashboard');
});

// Health check route
app.get('/health', async (req, res) => {
  try {
    const { testConnection, getAllCertificates } = require('./utils/supabaseDatabase');
    const dbStatus = await testConnection();
    const certCount = await getAllCertificates(1); // Just get count
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      certificates_in_db: certCount.length > 0 ? 'Found certificates' : 'No certificates yet',
      endpoints: {
        dashboard: '/auth/dashboard',
        login: '/auth/login',
        signup: '/auth/signup',
        admin: '/admin',
        verify_example: '/verify/[certificate-uid]'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Certificate Generator running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/auth/dashboard`);
  console.log(`🔐 Login: http://localhost:${PORT}/auth/login`);
  console.log(`📋 Admin: http://localhost:${PORT}/admin`);
  console.log(`💾 Health: http://localhost:${PORT}/health`);
});