const express = require('express');
const router = express.Router();
const { getAdminForm, getUserManagement, updateUser } = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', getAdminForm);
router.get('/users', requireAuth, requireAdmin, getUserManagement);
router.post('/users/update', requireAuth, requireAdmin, updateUser);

module.exports = router;
