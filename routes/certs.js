const express = require('express');
const router = express.Router();
const { generateCertificate, upload } = require('../controllers/certController');

router.post('/', upload, generateCertificate);

module.exports = router;
