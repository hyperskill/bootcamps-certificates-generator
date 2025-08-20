const express = require('express');
const router = express.Router();
const { verifyCertificate } = require('../controllers/verifyController');

router.get('/:uid', verifyCertificate);

module.exports = router;
