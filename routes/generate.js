const express = require('express');
const router = express.Router();
const { getAdminForm, getUserManagement, updateUser, getAllCertificatesPage } = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Main certificate generation form - requires login
router.get('/', requireAuth, getAdminForm);

// User management routes - requires admin privileges
router.get('/users', requireAuth, requireAdmin, getUserManagement);
router.post('/users/update', requireAuth, requireAdmin, updateUser);
router.get('/certificates', requireAuth, requireAdmin, getAllCertificatesPage);

module.exports = router;
