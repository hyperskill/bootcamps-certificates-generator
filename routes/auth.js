const express = require('express');
const router = express.Router();
const { 
  signup, 
  login, 
  logout, 
  getProfileHandler, 
  refreshToken, 
  getLoginForm, 
  getSignupForm 
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// API routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/logout', logout); // Add GET route for logout links
router.post('/refresh', refreshToken);
router.get('/profile', requireAuth, getProfileHandler);

// HTML form routes (for development/testing)
router.get('/login', getLoginForm);
router.get('/signup', getSignupForm);

// Dashboard route (protected)
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { getCertificatesByUser, getProfile } = require('../utils/supabaseDatabase');
    const certificates = await getCertificatesByUser(req.user.id);
    const profile = await getProfile(req.user.id);
    
    // Handle error messages
    const error = req.query.error;
    let alertHtml = '';
    if (error === 'admin_required') {
      alertHtml = '<div class="error" style="background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 20px;">🔒 Admin access required to view that page.</div>';
    }
    
    res.send(`<!doctype html><meta charset="utf-8">
<title>Dashboard - Certificate Generator</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 1000px; margin: 50px auto; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
  .user-info { background: #f8f9fa; padding: 15px; border-radius: 6px; }
  .cert-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
  .cert-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
  .cert-card h3 { margin-top: 0; color: #007bff; }
  .cert-meta { font-size: 14px; color: #666; margin-bottom: 10px; }
  .cert-actions a { display: inline-block; margin-right: 10px; padding: 8px 16px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; font-size: 14px; }
  .cert-actions a:hover { background: #0056b3; }
  .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; }
  .btn:hover { background: #0056b3; }
  .btn-secondary { background: #6c757d; }
  .btn-secondary:hover { background: #545b62; }
  .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
</style>
<div class="header">
  <h1>Certificate Dashboard</h1>
  <div class="user-info">
    <strong>Welcome, ${req.user.email}</strong>
    <a href="/auth/logout" style="margin-left: 15px; color: #dc3545;">Logout</a>
  </div>
</div>
${alertHtml}

<div style="margin-bottom: 30px;">
  <a href="/admin" class="btn">Generate New Certificate</a>
  <a href="/auth/profile" class="btn btn-secondary">View Profile</a>
  ${profile?.role === 'admin' ? '<a href="/admin/users" class="btn" style="background: #fd7e14;">👥 Manage Users</a>' : ''}
</div>

<h2>Your Certificates (${certificates.length})</h2>
<div class="cert-grid">
  ${certificates.map(cert => `
    <div class="cert-card">
      <h3>${cert.bootcamp}</h3>
      <div class="cert-meta">
        <div><strong>Type:</strong> ${cert.type}</div>
        <div><strong>Format:</strong> ${cert.format}</div>
        <div><strong>Created:</strong> ${new Date(cert.created_at).toLocaleDateString()}</div>
      </div>
      <div class="cert-actions">
        <a href="${cert.file_url}" target="_blank">View PDF</a>
        <a href="${cert.verify_url}" target="_blank">Verify</a>
      </div>
    </div>
  `).join('')}
</div>

${certificates.length === 0 ? '<p style="text-align: center; color: #666; margin-top: 50px;">No certificates yet. <a href="/admin">Generate your first certificate!</a></p>' : ''}
`);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

module.exports = router;
