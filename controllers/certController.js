const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { saveCertificate } = require('../utils/supabaseDatabase');
const CertificateGenerator = require('../utils/pdfGenerator');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

// Utility function to convert string to snake_case
function toSnakeCase(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s-]+/g, '_'); // Replace spaces and hyphens with underscores
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOADS_DIR || 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (PNG, JPG) and PDF files are allowed!'));
    }
  }
});

const generateCertificate = async (req, res) => {
  try {
    console.log('📥 Certificate generation request received');
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Certificate file is required' });
    }

    // Check authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Extract form data - updated field name
    const { bootcamp, format, type, student_name } = req.body;
    
    console.log('📋 Form data received:', { bootcamp, format, type, student_name });
    
    // Validate required fields
    if (!bootcamp || !format || !type || !student_name) {
      return res.status(400).json({ 
        error: 'Missing required fields: bootcamp, format, type, student_name' 
      });
    }

    // Validate format and type values
    if (!['portrait', 'landscape'].includes(format)) {
      return res.status(400).json({ error: 'Format must be portrait or landscape' });
    }
    
    if (!['completion', 'participation'].includes(type)) {
      return res.status(400).json({ error: 'Type must be completion or participation' });
    }

    // Generate unique identifiers
    const uid = uuidv4();
    const verifyUrl = `${BASE_URL}/verify/${uid}`;
    
    console.log(`🎯 Generating certificate for ${student_name} - ${bootcamp}`);
    console.log(`🔗 Verification URL: ${verifyUrl}`);

    // Create folder structure based on bootcamp and type
    const bootcampFolder = toSnakeCase(bootcamp);
    const typeFolder = type === 'completion' ? 'completed' : 'participated';
    const relativeFolderPath = path.join(process.env.CERTS_DIR || 'public/certs', bootcampFolder, typeFolder);
    const absoluteFolderPath = path.join(__dirname, '..', relativeFolderPath);
    
    // Create directories if they don't exist
    fs.mkdirSync(absoluteFolderPath, { recursive: true });
    console.log(`📁 Created directory: ${absoluteFolderPath}`);

    // Generate certificate using new PDF generator
    console.log('🎨 Initializing PDF generator...');
    const generator = new CertificateGenerator();
    const pdfBuffer = await generator.generateCertificate(req.file, uid, verifyUrl, format);

    // Save PDF file
    const outPath = path.join(absoluteFolderPath, `${uid}.pdf`);
    fs.writeFileSync(outPath, pdfBuffer);
    console.log(`💾 Certificate saved to: ${outPath}`);

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
      console.log('🧹 Temporary upload file cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ Could not delete temporary file:', cleanupError.message);
    }

    // Save to Supabase database
    const relativeFilePath = path.join(bootcampFolder, typeFolder, `${uid}.pdf`).replace(/\\/g, '/');
    const record = { 
      uid, 
      user_id: req.user.id,
      bootcamp,
      format,
      type,
      student_name, 
      original_filename: req.file.originalname,
      file_url: `/certs/${relativeFilePath}`, 
      verify_url: `/verify/${uid}` 
    };

    try {
      const savedRecord = await saveCertificate(record);
      console.log('Certificate saved to Supabase:', savedRecord.uid);
    } catch (dbError) {
      console.error('Database save failed:', dbError);
      // Continue with response even if DB save fails
    }

    // Return response
    if (req.headers['content-type']?.includes('application/json')) {
      res.json({ 
        ok: true, 
        ...record, 
        absolute_pdf: `${BASE_URL}${record.file_url}`, 
        absolute_verify: `${BASE_URL}${record.verify_url}` 
      });
    } else {
      res.send(`
        <!doctype html><meta charset="utf-8">
        <title>Certificate Generated</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .links a { display: inline-block; margin: 10px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
          .links a:hover { background: #0056b3; }
          .back { margin-top: 20px; }
          .back a { background: #6c757d; }
        </style>
        <div class="success">
          <h2>✅ Certificate Generated Successfully!</h2>
          <p>Your ${format} ${type} certificate for <strong>${bootcamp}</strong> has been processed and QR code added.</p>
          <p><strong>Student:</strong> ${student_name}</p>
          <p><strong>Certificate ID:</strong> ${uid}</p>
          <p><strong>Stored in:</strong> ${bootcampFolder}/${typeFolder}/</p>
        </div>
        <div class="links">
          <a href="${record.file_url}" target="_blank">📄 Open Certificate PDF</a>
          <a href="${record.verify_url}" target="_blank">🔍 Test Verification</a>
        </div>
        <div class="back">
          <a href="/generate">← Upload Another Certificate</a>
        </div>
      `);
    }

  } catch (error) {
    console.error('❌ Certificate generation error:', error);
    
    // Clean up uploaded file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🧹 Cleaned up temporary file after error');
      } catch (cleanupError) {
        console.warn('⚠️ Could not delete temporary file after error:', cleanupError.message);
      }
    }
    
    res.status(500).json({ 
      error: `Failed to generate certificate: ${error.message}` 
    });
  }
};

module.exports = {
  generateCertificate,
  upload: upload.single('certificate')
};