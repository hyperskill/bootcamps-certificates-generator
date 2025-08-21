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
  const templateRenderer = require('../utils/templateRenderer');
  
  try {
    const { getCertificatesByUser, getProfile } = require('../utils/supabaseDatabase');
    const certificates = await getCertificatesByUser(req.user.id);
    const profile = await getProfile(req.user.id);
    
    // Handle error messages
    const error = req.query.error;
    let alertHtml = '';
    if (error === 'admin_required') {
      alertHtml = templateRenderer.createAlert('error', '🔒 Admin access required to view that page.');
    }
    
    // Generate certificates content HTML
    let certificatesContent = '';
    if (certificates.length === 0) {
      certificatesContent = '<div class="empty-state">No certificates yet. <a href="/generate">Generate your first certificate!</a></div>';
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
    
    const html = templateRenderer.renderAdvanced('dashboard', {
      title: 'Dashboard - Certificate Generator',
      userEmail: req.user.email,
      isAdmin: profile?.role === 'admin',
      certificateCount: certificates.length,
      alerts: alertHtml,
      certificatesContent
    }, ['common', 'dashboard', 'tables']);
    
    res.send(html);
  } catch (error) {
    console.error('Dashboard error:', error);
    const html = templateRenderer.renderAdvanced('verification', {
      title: 'Dashboard Error',
      error: true
    }, ['common', 'verification']);
    
    res.status(500).send(html);
  }
});

module.exports = router;
