# Certificate Generator with QR Code Verification

A modern, full-featured certificate generation system that adds QR codes to uploaded certificates for verification purposes. Designed for bootcamps, workshops, and educational programs.

## ✨ Features

### 🎯 Smart Certificate Processing
- **Upload any certificate** (PNG, JPG, PDF) and add QR code overlay
- **Form-driven workflow** with bootcamp details before upload
- **Format selection** - Portrait or Landscape with optimized QR positioning
- **Type categorization** - Completion vs Participation certificates
- **Automatic folder organization** by bootcamp and certificate type

### 🏗️ Professional Architecture
- **MVC Pattern** - Controllers, Routes, and Utilities properly separated
- **Environment-based configuration** - All paths configurable via `.env`
- **Smart file organization** - Certificates stored in `bootcamp_name/completed|participated/` structure
- **Comprehensive verification system** with detailed certificate information

### 🔍 Verification & Security
- **QR code verification** - Each certificate gets a unique QR code linking to verification page
- **Detailed verification pages** showing bootcamp, format, type, and creation details
- **Secure file storage** with proper .gitignore protecting sensitive data
- **UUID-based certificate IDs** for unique identification

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd certs-proto
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env if you need custom paths
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   ```
   http://localhost:3000/admin
   ```

## 📝 Usage Workflow

### 1. Fill Certificate Details
- **Bootcamp Name**: The program name (used for folder organization)
- **Format**: Portrait (vertical) or Landscape (horizontal) 
- **Type**: Completion or Participation
- **Description**: Optional additional details

### 2. Upload Certificate
- Drag & drop or select your certificate file
- Supports PNG, JPG, and PDF formats
- Files up to 10MB

### 3. Generate & Verify
- System adds QR code overlay with optimal positioning
- Certificate saved to organized folder structure
- QR code links to verification page with full details

## 📂 Folder Structure

### Generated Certificates
```
public/certs/
├── react_frontend_bootcamp/
│   ├── completed/
│   │   └── [certificate-uuid].pdf
│   └── participated/
│       └── [certificate-uuid].pdf
├── python_data_science/
│   ├── completed/
│   └── participated/
└── ui_ux_design_workshop/
    ├── completed/
    └── participated/
```

### Project Structure
```
certs-proto/
├── app.js                 # Main application entry point
├── controllers/           # Business logic
│   ├── adminController.js # Admin form handling
│   ├── certController.js  # Certificate generation
│   └── verifyController.js# Verification pages
├── routes/               # Route definitions
│   ├── admin.js         # Admin routes
│   ├── certs.js         # Certificate routes
│   └── verify.js        # Verification routes
├── utils/               # Shared utilities
│   ├── database.js      # Database operations
│   └── helpers.js       # Helper functions
├── db/                  # Data storage
│   └── certs.json      # Certificate database
├── public/             # Static files
│   ├── certs/         # Generated certificates
│   ├── uploads/       # Temporary uploads
│   └── assets/        # Static assets
├── .env.example       # Environment template
└── package.json       # Dependencies
```

## ⚙️ Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3000
BASE_URL=http://localhost:3000

# Directory Paths (relative to project root)
PUBLIC_DIR=public
UPLOADS_DIR=public/uploads
CERTS_DIR=public/certs
ASSETS_DIR=public/assets
DB_DIR=db

# File Paths
DB_FILE=certs.json
```

### Format-Specific Settings

| Format | PDF Layout | Dimensions | QR Position |
|--------|------------|------------|-------------|
| Portrait | Vertical A4 | 794×1123px | `bottom: 60px, right: 50px` |
| Landscape | Horizontal A4 | 1123×794px | `bottom: 60px, right: 80px` |

## 🔍 API Endpoints

### Admin Interface
- `GET /admin` - Certificate generation form

### Certificate Generation  
- `POST /certs` - Generate certificate with QR code
  - **Form fields**: `bootcamp`, `format`, `type`, `certificate` (file), `description`
  - **Response**: Success page with links to PDF and verification

### Verification
- `GET /verify/:uid` - Verify certificate by UUID
  - **Response**: Detailed verification page with certificate information

## 💾 Database Schema

Each certificate record contains:
```json
{
  "uid": "unique-uuid",
  "bootcamp": "React Frontend Bootcamp", 
  "format": "landscape",
  "type": "completion",
  "description": "Advanced React Development",
  "originalFilename": "certificate.png",
  "createdAt": "2025-08-20T18:38:04.821Z",
  "file_url": "/certs/react_frontend_bootcamp/completed/unique-uuid.pdf",
  "verify_url": "/verify/unique-uuid"
}
```

## 🛠️ Development

### Available Scripts
```bash
npm run dev    # Start development server with auto-reload
npm start      # Start production server
```

### Adding New Features
1. **Controllers** - Add business logic in `controllers/`
2. **Routes** - Define endpoints in `routes/`
3. **Utilities** - Shared functions in `utils/`
4. **Environment** - Configure paths in `.env`

## 🔒 Security Features

### File Protection
- `.env` files excluded from Git
- Generated certificates ignored (contain personal data)
- Database file protected from version control
- Comprehensive `.gitignore` with 4700+ files protected

### Input Validation
- File type restrictions (PNG, JPG, PDF only)
- File size limits (10MB max)
- Required field validation
- HTML escaping for XSS protection

## 🚢 Deployment

### Production Setup
1. **Environment configuration**
   ```bash
   # Set production environment variables
   PORT=80
   BASE_URL=https://your-domain.com
   CERTS_DIR=/var/certificates
   ```

2. **Process management**
   ```bash
   # Use PM2 or similar for production
   npm install -g pm2
   pm2 start app.js --name "certificate-generator"
   ```

3. **Reverse proxy** (Nginx/Apache)
   ```nginx
   location / {
     proxy_pass http://localhost:3000;
     proxy_set_header Host $host;
   }
   ```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check existing documentation
- Review environment configuration

---

**Built with Node.js, Express, Puppeteer, and QRCode.js**