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
  .bootcamp-group { margin-bottom: 40px; }
  .bootcamp-title { color: #007bff; font-size: 20px; font-weight: bold; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e9ecef; }
  .cert-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .cert-table th { background: #f8f9fa; padding: 12px 15px; text-align: left; font-weight: 600; color: #495057; border-bottom: 1px solid #dee2e6; }
  .cert-table td { padding: 12px 15px; border-bottom: 1px solid #f1f3f4; }
  .cert-table tr:last-child td { border-bottom: none; }
  .cert-table tr:hover { background: #f8f9fa; }
  .student-name { font-weight: 600; color: #333; }
  .cert-type { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .type-completion { background: #d4edda; color: #155724; }
  .type-participation { background: #cce8ff; color: #004085; }
  .cert-actions a { color: #007bff; text-decoration: none; margin-right: 10px; font-size: 13px; }
  .cert-actions a:hover { text-decoration: underline; }
  .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; }
  .btn:hover { background: #0056b3; }
  .btn-secondary { background: #6c757d; }
  .btn-secondary:hover { background: #545b62; }
  .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
  .empty-state { text-align: center; color: #666; padding: 40px; background: white; border-radius: 8px; border: 1px solid #dee2e6; }
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
  ${profile?.role === 'admin' ? '<a href="/admin/certificates" class="btn" style="background: #28a745;">📄 All Certificates</a>' : ''}
</div>

<h2>Your Certificates (${certificates.length})</h2>

${certificates.length === 0 ? '<div class="empty-state">No certificates yet. <a href="/admin">Generate your first certificate!</a></div>' : 
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
`);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

module.exports = router;
