const express = require('express');
const router = express.Router();
const { getAdminForm } = require('../controllers/adminController');

router.get('/', getAdminForm);

module.exports = router;
