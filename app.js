require('dotenv').config();
const express = require('express');
const path = require('path');

// Import routes
const adminRoutes = require('./routes/admin');
const certRoutes = require('./routes/certs');
const verifyRoutes = require('./routes/verify');

const PORT = process.env.PORT || 3000;

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, process.env.PUBLIC_DIR || 'public')));

// Routes
app.use('/admin', adminRoutes);
app.use('/certs', certRoutes);
app.use('/verify', verifyRoutes);

// Start server
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));