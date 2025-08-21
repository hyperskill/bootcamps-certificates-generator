const getAdminForm = (_req, res) => {
  res.send(`<!doctype html><meta charset="utf-8">
<title>Generate Certificate with QR Code</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 50px auto; padding: 20px; }
  .form-group { margin-bottom: 20px; }
  label { display: block; margin-bottom: 8px; font-weight: bold; color: #333; }
  input[type="file"] { width: 100%; padding: 12px; border: 2px dashed #007bff; border-radius: 6px; background: #f8f9fa; }
  input[type="text"] { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
  .radio-group { display: flex; gap: 20px; margin-top: 8px; }
  .radio-option { display: flex; align-items: center; gap: 8px; }
  input[type="radio"] { margin: 0; }
  .radio-option label { margin: 0; font-weight: normal; }
  button { background: #007bff; color: white; padding: 14px 28px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; }
  button:hover { background: #0056b3; }
  .info { background: #e7f3ff; border-left: 4px solid #007bff; padding: 20px; border-radius: 6px; margin-bottom: 30px; }
  .form-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
  .form-section h3 { margin-top: 0; color: #495057; }
</style>
<div class="info">
  <h2>Certificate Generator with QR Code</h2>
  <p>Fill out the details below and upload your certificate to add a verification QR code.</p>
</div>

<form method="POST" action="/certs" enctype="multipart/form-data">
  <div class="form-section">
    <h3>Certificate Details</h3>
    
    <div class="form-group">
      <label>Bootcamp Name</label>
      <input type="text" name="bootcamp" placeholder="Bootcamp name" required>
    </div>
    
    <div class="form-group">
      <label>Student Name</label>
      <input type="text" name="studentName" placeholder="Student's full name" required>
    </div>
    
    <div class="form-group">
      <label>Certificate Format</label>
      <div class="radio-group">
        <div class="radio-option">
          <input type="radio" id="portrait" name="format" value="portrait" required>
          <label for="portrait">Portrait</label>
        </div>
        <div class="radio-option">
          <input type="radio" id="landscape" name="format" value="landscape" required>
          <label for="landscape">Landscape</label>
        </div>
      </div>
    </div>
    
    <div class="form-group">
      <label>Certificate Type</label>
      <div class="radio-group">
        <div class="radio-option">
          <input type="radio" id="completion" name="type" value="completion" required>
          <label for="completion">Completion</label>
        </div>
        <div class="radio-option">
          <input type="radio" id="participation" name="type" value="participation" required>
          <label for="participation">Participation</label>
        </div>
      </div>
    </div>
  </div>

  <div class="form-section">
    <h3>Upload Certificate</h3>
    
    <div class="form-group">
      <label>Certificate File (PNG, JPG, PDF)</label>
      <input type="file" name="certificate" accept=".png,.jpg,.jpeg,.pdf" required>
    </div>
  </div>
  
  <button type="submit">Generate Certificate with QR Code</button>
</form>

<div style="margin-top: 40px; text-align: center; padding-top: 30px; border-top: 2px solid #e9ecef;">
  <h3 style="margin-bottom: 20px;">Admin Tools</h3>
  <a href="/admin/users" style="display: inline-block; padding: 12px 24px; background: #fd7e14; color: white; text-decoration: none; border-radius: 6px; margin-right: 15px;">👥 Manage Users</a>
  <a href="/admin/certificates" style="display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; margin-right: 15px;">📄 All Certificates</a>
  <a href="/auth/dashboard" style="display: inline-block; padding: 12px 24px; background: #6c757d; color: white; text-decoration: none; border-radius: 6px;">← Back to Dashboard</a>
</div>
`);
};

const getUserManagement = async (req, res) => {
  try {
    const { getAllUsers, getPendingUsersCount } = require('../utils/supabaseDatabase');
    const status = req.query.status || null;
    const users = await getAllUsers(status);
    const pendingCount = await getPendingUsersCount();
    
    res.send(`<!doctype html><meta charset="utf-8">
<title>User Management - Admin Panel</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 1200px; margin: 20px auto; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
  .stats { display: flex; gap: 20px; margin-bottom: 30px; }
  .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; min-width: 120px; }
  .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
  .filters { margin-bottom: 20px; }
  .filters a { display: inline-block; margin-right: 15px; padding: 8px 16px; background: #e9ecef; text-decoration: none; border-radius: 4px; color: #333; }
  .filters a.active { background: #007bff; color: white; }
  .user-table { width: 100%; border-collapse: collapse; }
  .user-table th, .user-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
  .user-table th { background: #f8f9fa; }
  .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .status-pending { background: #fff3cd; color: #856404; }
  .status-approved { background: #d4edda; color: #155724; }
  .status-rejected { background: #f8d7da; color: #721c24; }
  .status-suspended { background: #e2e3e5; color: #495057; }
  .action-btn { padding: 6px 12px; margin: 2px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .btn-approve { background: #28a745; color: white; }
  .btn-reject { background: #dc3545; color: white; }
  .btn-suspend { background: #6c757d; color: white; }
  .back-link { display: inline-block; margin-bottom: 20px; color: #007bff; text-decoration: none; }
</style>
<a href="/auth/dashboard" class="back-link">← Back to Dashboard</a>
<div class="header">
  <h1>User Management</h1>
  <div>Admin Panel</div>
</div>

<div class="stats">
  <div class="stat-card">
    <div class="stat-number">${users.filter(u => u.status === 'pending').length}</div>
    <div>Pending</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">${users.filter(u => u.status === 'approved').length}</div>
    <div>Approved</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">${users.filter(u => u.status === 'rejected').length}</div>
    <div>Rejected</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">${users.length}</div>
    <div>Total</div>
  </div>
</div>

<div class="filters">
  <a href="/admin/users" ${!status ? 'class="active"' : ''}>All Users</a>
  <a href="/admin/users?status=pending" ${status === 'pending' ? 'class="active"' : ''}>Pending (${users.filter(u => u.status === 'pending').length})</a>
  <a href="/admin/users?status=approved" ${status === 'approved' ? 'class="active"' : ''}>Approved</a>
  <a href="/admin/users?status=rejected" ${status === 'rejected' ? 'class="active"' : ''}>Rejected</a>
  <a href="/admin/users?status=suspended" ${status === 'suspended' ? 'class="active"' : ''}>Suspended</a>
</div>

<table class="user-table">
  <thead>
    <tr>
      <th>User</th>
      <th>Email</th>
      <th>Status</th>
      <th>Created</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    ${users.map(user => `
      <tr>
        <td>${user.full_name || 'No Name'}</td>
        <td>${user.email}</td>
        <td><span class="status-badge status-${user.status || 'pending'}">${(user.status || 'pending').toUpperCase()}</span></td>
        <td>${new Date(user.created_at).toLocaleDateString()}</td>
        <td>
          ${user.status !== 'approved' ? `<button class="action-btn btn-approve" onclick="updateUser('${user.id}', 'approved')">Approve</button>` : ''}
          ${user.status !== 'rejected' ? `<button class="action-btn btn-reject" onclick="updateUser('${user.id}', 'rejected')">Reject</button>` : ''}
          ${user.status !== 'suspended' ? `<button class="action-btn btn-suspend" onclick="updateUser('${user.id}', 'suspended')">Suspend</button>` : ''}
        </td>
      </tr>
    `).join('')}
  </tbody>
</table>

<script>
async function updateUser(userId, status) {
  const reason = status === 'rejected' ? prompt('Reason for rejection (optional):') : null;
  
  try {
    const response = await fetch('/admin/users/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status, reason })
    });
    
    const result = await response.json();
    if (result.success) {
      location.reload();
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    alert('Error updating user status');
         }
     }
   </script>

   <div style="margin-top: 40px; text-align: center; padding-top: 30px; border-top: 2px solid #e9ecef;">
     <h3 style="margin-bottom: 20px;">Admin Tools</h3>
     <a href="/admin" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; margin-right: 15px;">Generate Certificate</a>
     <a href="/admin/certificates" style="display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; margin-right: 15px;">📄 All Certificates</a>
     <a href="/auth/dashboard" style="display: inline-block; padding: 12px 24px; background: #6c757d; color: white; text-decoration: none; border-radius: 6px;">← Back to Dashboard</a>
   </div>
   `);
  } catch (error) {
    console.error('User management error:', error);
    res.status(500).send('Error loading user management');
  }
};

const updateUser = async (req, res) => {
  try {
    const { updateUserStatus } = require('../utils/supabaseDatabase');
    const { userId, status, reason, notes } = req.body;
    
    await updateUserStatus(userId, status, req.user.id, reason, notes);
    
    res.json({ success: true, message: `User ${status} successfully` });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllCertificatesPage = async (req, res) => {
  try {
    const { getAllCertificates } = require('../utils/supabaseDatabase');
    const certificates = await getAllCertificates(1000); // Get more certificates for admin view
    
    res.send(`<!doctype html><meta charset="utf-8">
<title>All Certificates - Admin Panel</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 1400px; margin: 20px auto; padding: 20px; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
  .back-link { color: #007bff; text-decoration: none; font-weight: bold; }
  .back-link:hover { text-decoration: underline; }
  .stats { display: flex; gap: 20px; margin-bottom: 30px; }
  .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; min-width: 120px; }
  .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
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
  .created-by { color: #666; font-size: 12px; }
  .empty-state { text-align: center; color: #666; padding: 40px; background: white; border-radius: 8px; border: 1px solid #dee2e6; }
</style>

<div class="header">
  <a href="/auth/dashboard" class="back-link">← Back to Dashboard</a>
  <div>
    <h1>All Certificates - Admin Panel</h1>
  </div>
</div>

<div class="stats">
  <div class="stat-card">
    <div class="stat-number">${certificates.length}</div>
    <div>Total Certificates</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">${certificates.filter(c => c.type === 'completion').length}</div>
    <div>Completion</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">${certificates.filter(c => c.type === 'participation').length}</div>
    <div>Participation</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">${new Set(certificates.map(c => c.bootcamp)).size}</div>
    <div>Bootcamps</div>
  </div>
  <div class="stat-card">
    <div class="stat-number">${new Set(certificates.map(c => c.user_id)).size}</div>
    <div>Users</div>
  </div>
</div>

${certificates.length === 0 ? '<div class="empty-state">No certificates have been generated yet.</div>' : 
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
              <th>Created By</th>
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
                <td class="created-by">${cert.profiles?.full_name || cert.profiles?.email || 'Unknown User'}</td>
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

<div style="margin-top: 40px; text-align: center;">
  <a href="/admin" style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; margin-right: 15px;">Generate New Certificate</a>
  <a href="/admin/users" style="display: inline-block; padding: 12px 24px; background: #fd7e14; color: white; text-decoration: none; border-radius: 6px;">👥 Manage Users</a>
</div>
`);
  } catch (error) {
    console.error('Get all certificates error:', error);
    res.status(500).send(`
      <!doctype html><meta charset="utf-8">
      <title>Error - Admin Panel</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
        .error { background: #f8d7da; color: #721c24; padding: 20px; border-radius: 8px; }
      </style>
      <div class="error">
        <h1>❌ Error Loading Certificates</h1>
        <p>There was an error loading the certificates. Please try again later.</p>
        <a href="/auth/dashboard">← Back to Dashboard</a>
      </div>
    `);
  }
};

module.exports = {
  getAdminForm,
  getUserManagement,
  updateUser,
  getAllCertificatesPage
};
