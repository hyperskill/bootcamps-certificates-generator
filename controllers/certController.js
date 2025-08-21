const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const multer = require('multer');
const { saveCertificate } = require('../utils/supabaseDatabase');

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
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Certificate file is required' });
    }

    // Extract form data
    const { bootcamp, format, type, studentName } = req.body;
    
    // Validate required fields
    if (!bootcamp || !format || !type || !studentName) {
      return res.status(400).json({ error: 'Bootcamp name, student name, format, and type are required' });
    }

    // Validate format and type values
    if (!['portrait', 'landscape'].includes(format)) {
      return res.status(400).json({ error: 'Format must be portrait or landscape' });
    }
    
    if (!['completion', 'participation'].includes(type)) {
      return res.status(400).json({ error: 'Type must be completion or participation' });
    }
    const uid = uuidv4();
    const verifyUrl = `${BASE_URL}/verify/${uid}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl);

    // Create folder structure based on bootcamp and type
    const bootcampFolder = toSnakeCase(bootcamp);
    const typeFolder = type === 'completion' ? 'completed' : 'participated';
    const relativeFolderPath = path.join(process.env.CERTS_DIR || 'public/certs', bootcampFolder, typeFolder);
    const absoluteFolderPath = path.join(__dirname, '..', relativeFolderPath);
    
    // Create directories if they don't exist
    fs.mkdirSync(absoluteFolderPath, { recursive: true });

    // Convert uploaded file to base64 for embedding
    const uploadedFilePath = req.file.path;
    const fileBuffer = fs.readFileSync(uploadedFilePath);
    const fileBase64 = fileBuffer.toString('base64');
    const fileMimeType = req.file.mimetype;
    const fileDataUri = `data:${fileMimeType};base64,${fileBase64}`;

    // Determine dimensions based on format
    let pageWidth, pageHeight, qrPosition;
    if (format === 'portrait') {
      pageWidth = 794;   // A4 portrait width
      pageHeight = 1123; // A4 portrait height
      qrPosition = {
        bottom: '60px',
        right: '50px'
      };
    } else {
      pageWidth = 1123;  // A4 landscape width
      pageHeight = 794;  // A4 landscape height
      qrPosition = {
        bottom: '60px',
        right: '80px'
      };
    }

    const html = `
<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  @page { size: A4 ${format}; margin: 0; }
  html, body { margin:0; padding:0; width:100%; height:100%; overflow: hidden; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page {
    position: relative;
    width: ${pageWidth}px;
    height: ${pageHeight}px;
    ${fileMimeType === 'application/pdf' ? 
      `background: white;` : 
      `background: url('${fileDataUri}') no-repeat center center / contain;`
    }
  }
  .overlay {
    position: absolute;
    bottom: ${qrPosition.bottom};
    right: ${qrPosition.right};
    padding: 12px;
    text-align: center;
    font-family: Arial, Helvetica, sans-serif;
  }
  .qr-code {
    width: 96px;
    height: 96px;
    background: url('${qrDataUrl}') no-repeat center / contain;
    margin: 0 auto 8px auto;
  }
  .uid {
    font-size: 8px;
    color: white;
    font-weight: bold;
    letter-spacing: 0.4px;
  }
  ${fileMimeType === 'application/pdf' ? `
  .pdf-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: url('${fileDataUri}') no-repeat center center / contain;
  }` : ''}
</style></head>
<body>
  <div class="page">
    ${fileMimeType === 'application/pdf' ? '<div class="pdf-bg"></div>' : ''}
    <div class="overlay">
      <div class="qr-code"></div>
      <div class="uid">${uid}</div>
    </div>
  </div>
</body></html>`;

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: pageWidth, height: pageHeight, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const outPath = path.join(absoluteFolderPath, `${uid}.pdf`);
    await page.pdf({ 
      path: outPath, 
      format: 'A4', 
      landscape: format === 'landscape', 
      printBackground: true, 
      preferCSSPageSize: true 
    });
    await browser.close();

    // Clean up uploaded file
    fs.unlinkSync(uploadedFilePath);

    // Save to Supabase database
    const relativeFilePath = path.join(bootcampFolder, typeFolder, `${uid}.pdf`).replace(/\\/g, '/');
    const record = { 
      uid, 
      user_id: req.user?.id || null, // Associate with user if authenticated
      bootcamp,
      format,
      type,
      student_name: studentName, 
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
  } catch (e) {
    console.error(e);
    
    // Clean up uploaded file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to generate certificate: ' + e.message });
  }
};

module.exports = {
  generateCertificate,
  upload: upload.single('certificate')
};