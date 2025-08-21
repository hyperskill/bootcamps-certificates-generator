const getAdminForm = (_req, res) => {
  const templateRenderer = require('../utils/templateRenderer');
  
  const html = templateRenderer.renderAdvanced('admin-form', {
    title: 'Generate Certificate with QR Code'
  }, ['common', 'forms']);
  
  res.send(html);
};

const getUserManagement = async (req, res) => {
  const templateRenderer = require('../utils/templateRenderer');
  
  try {
    const { getAllUsers, getPendingUsersCount } = require('../utils/supabaseDatabase');
    const status = req.query.status || null;
    const users = await getAllUsers(status);
    const pendingCount = await getPendingUsersCount();
    
    // Generate filter tabs HTML
    const filterTabsHTML = `
      <div class="filter-tabs">
        <a href="/admin/users" class="filter-tab ${!status ? 'active' : ''}">All Users (${users.length})</a>
        <a href="/admin/users?status=pending" class="filter-tab ${status === 'pending' ? 'active' : ''}">Pending (${users.filter(u => u.status === 'pending').length})</a>
        <a href="/admin/users?status=approved" class="filter-tab ${status === 'approved' ? 'active' : ''}">Approved (${users.filter(u => u.status === 'approved').length})</a>
        <a href="/admin/users?status=rejected" class="filter-tab ${status === 'rejected' ? 'active' : ''}">Rejected (${users.filter(u => u.status === 'rejected').length})</a>
        <a href="/admin/users?status=suspended" class="filter-tab ${status === 'suspended' ? 'active' : ''}">Suspended (${users.filter(u => u.status === 'suspended').length})</a>
      </div>
    `;
    
    // Generate users table HTML
    let usersTableHTML = '';
    if (users.length === 0) {
      usersTableHTML = `<div class="empty-state"><p>${status ? `No ${status} users found.` : 'No users found.'}</p></div>`;
    } else {
      const usersRows = users.map(user => {
        const showApprove = user.status !== 'approved';
        const showReject = user.status !== 'rejected';
        const showSuspend = user.status !== 'suspended';
        
        return `
          <tr>
            <td>
              <strong>${user.full_name || 'No Name'}</strong><br>
              <small>${user.email}</small>
            </td>
            <td>
              <span class="status-badge status-${user.status || 'pending'}">${(user.status || 'pending').toUpperCase()}</span>
            </td>
            <td>${user.role === 'admin' ? 'Admin' : 'User'}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>${user.notes || 'None'}</td>
            <td class="user-actions">
              ${showApprove ? `<button class="action-btn btn-approve" onclick="updateUser('${user.id}', 'approved')">Approve</button>` : ''}
              ${showReject ? `<button class="action-btn btn-reject" onclick="updateUser('${user.id}', 'rejected')">Reject</button>` : ''}
              ${showSuspend ? `<button class="action-btn btn-suspend" onclick="updateUser('${user.id}', 'suspended')">Suspend</button>` : ''}
            </td>
          </tr>
        `;
      }).join('');
      
      usersTableHTML = `
        <table class="user-table">
          <thead>
            <tr>
              <th>Name/Email</th>
              <th>Status</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${usersRows}
          </tbody>
        </table>
      `;
    }
    
    const html = templateRenderer.renderAdvanced('user-management-simple', {
      title: 'User Management - Admin Panel',
      totalUsers: users.length,
      pendingCount,
      filterTabs: filterTabsHTML,
      usersTable: usersTableHTML
    }, ['common', 'dashboard', 'tables']);
    
    res.send(html);
  } catch (error) {
    console.error('User management error:', error);
    const html = templateRenderer.renderAdvanced('verification', {
      title: 'Error - Admin Panel',
      isValid: false,
      error: true
    }, ['common', 'verification']);
    
    res.status(500).send(html);
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
  const templateRenderer = require('../utils/templateRenderer');
  
  try {
    const { getAllCertificates } = require('../utils/supabaseDatabase');
    const certificates = await getAllCertificates(1000); // Get more certificates for admin view
    
    // Calculate statistics
    const totalCertificates = certificates.length;
    const completionCount = certificates.filter(c => c.type === 'completion').length;
    const participationCount = certificates.filter(c => c.type === 'participation').length;
    const uniqueBootcamps = new Set(certificates.map(c => c.bootcamp)).size;
    const uniqueUsers = new Set(certificates.map(c => c.user_id)).size;
    
    // Generate certificates table HTML
    let certificatesTableHTML = '';
    if (certificates.length === 0) {
      certificatesTableHTML = '<div class="empty-state">No certificates have been generated yet.</div>';
    } else {
      // Group certificates by bootcamp
      const groupedCerts = certificates.reduce((groups, cert) => {
        const bootcamp = cert.bootcamp || 'Unknown Bootcamp';
        if (!groups[bootcamp]) groups[bootcamp] = [];
        groups[bootcamp].push(cert);
        return groups;
      }, {});
      
      certificatesTableHTML = Object.entries(groupedCerts).map(([bootcamp, certs]) => `
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
    }
    
    const html = templateRenderer.renderAdvanced('admin-certificates-simple', {
      title: 'All Certificates - Admin Panel',
      totalCertificates,
      completionCount,
      participationCount,
      uniqueBootcamps,
      uniqueUsers,
      certificatesTable: certificatesTableHTML
    }, ['common', 'dashboard', 'tables']);
    
    res.send(html);
  } catch (error) {
    console.error('Get all certificates error:', error);
    const html = templateRenderer.renderAdvanced('verification', {
      title: 'Error - Admin Panel',
      isValid: false,
      error: true
    }, ['common', 'verification']);
    
    res.status(500).send(html);
  }
};

module.exports = {
  getAdminForm,
  getUserManagement,
  updateUser,
  getAllCertificatesPage
};
