# Certificate Generator with QR Code Verification

A modern, full-featured certificate generation system with **Supabase authentication** and **admin moderation**. Upload certificates, add QR code overlays, and manage users through a comprehensive admin interface.

## ✨ Features

### 🔐 Authentication & User Management
- **Supabase Authentication** - Secure login/signup with session management
- **Admin Moderation** - New users require admin approval before accessing the system
- **Role-based Access** - Admin and regular user permissions
- **User Dashboard** - Personal certificate history and profile management
- **Admin Interface** - User management and system-wide certificate oversight

### 🎯 Smart Certificate Processing
- **Upload any certificate** (PNG, JPG, PDF) and add QR code overlay
- **Form-driven workflow** with bootcamp details and student information
- **Format selection** - Portrait or Landscape with optimized QR positioning
- **Type categorization** - Completion vs Participation certificates
- **Automatic folder organization** by bootcamp and certificate type
- **Student name tracking** - Required field for certificate personalization

### 🏗️ Professional Architecture
- **MVC Pattern** - Controllers, Routes, Templates, and Utilities properly separated
- **Supabase Backend** - PostgreSQL database with Row Level Security (RLS)
- **Template System** - External HTML/CSS templates with custom renderer
- **Environment-based configuration** - All paths configurable via `.env`
- **Smart file organization** - Certificates stored in `bootcamp_name/completed|participated/` structure

### 🔍 Verification & Security
- **QR code verification** - Each certificate gets a unique QR code linking to verification page
- **Detailed verification pages** showing bootcamp, type, student name, and creation details
- **Secure authentication** with proper session management and redirects
- **Admin-only features** protected by role-based middleware
- **UUID-based certificate IDs** for unique identification

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Supabase account (free tier available)

### Installation

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd certs-proto
   npm install
   ```

2. **Configure Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL script from `scripts/setup-supabase.sql` in your Supabase SQL Editor
   - Get your project URL and anon key from Supabase settings

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials and custom paths
   ```

4. **Start development server**
   ```bash
npm run dev
   ```

5. **Access the application**
   ```
   http://localhost:3000/auth/login
   ```

## 📝 Usage Workflow

### 1. User Registration & Approval
- New users sign up at `/auth/signup`
- Account enters "pending" status awaiting admin approval
- Admins can approve, reject, or suspend users through the admin interface
- Approved users can log in and access the certificate generation system

### 2. Certificate Generation (Authenticated Users)
- **Student Name**: Required field for certificate personalization
- **Bootcamp Name**: The program name (used for folder organization)
- **Format**: Portrait (vertical) or Landscape (horizontal)
- **Type**: Completion or Participation
- **File Upload**: Drag & drop or select certificate file (PNG, JPG, PDF up to 10MB)

### 3. Certificate Management
- **Personal Dashboard**: View your generated certificates organized by bootcamp
- **Table View**: Certificates displayed in organized tables grouped by bootcamp name
- **Quick Actions**: Generate new certificates, view profile, access admin features (if admin)
- **Verification**: Each certificate includes QR code linking to public verification page

### 4. Admin Features (Admin Users Only)
- **User Management**: Approve/reject/suspend user accounts at `/generate/users`
- **All Certificates**: View system-wide certificate overview at `/generate/certificates`
- **User Oversight**: Filter users by status, manage pending approvals
- **Certificate Analytics**: See all certificates across all users, grouped by bootcamp

## 📂 Project Structure

### Current Architecture
```
certs-proto/
├── app.js                          # Main application entry point
├── controllers/                    # Business logic
│   ├── adminController.js         # Admin interface and user management
│   ├── authController.js          # Authentication, signup, login, profile
│   ├── certController.js          # Certificate generation logic
│   └── verifyController.js        # Certificate verification pages
├── routes/                        # Route definitions
│   ├── auth.js                   # Authentication routes (/auth/*)
│   ├── certs.js                  # Certificate generation (/certs/*)
│   ├── generate.js               # Main generation interface (/generate/*)
│   └── verify.js                 # Verification routes (/verify/*)
├── middleware/                    # Custom middleware
│   └── auth.js                   # Authentication and authorization middleware
├── templates/                    # HTML templates and CSS
│   ├── html/                    # HTML template files
│   └── css/                     # Modular CSS files
├── utils/                        # Shared utilities
│   ├── helpers.js               # Helper functions
│   ├── supabase.js             # Supabase client configuration
│   ├── supabaseDatabase.js     # Database operation abstractions
│   └── templateRenderer.js     # Custom template rendering engine
├── scripts/                     # Setup and migration scripts
│   └── setup-supabase.sql      # Database schema and RLS policies
├── public/                      # Static files and generated certificates
│   ├── certs/                  # Generated certificates (organized by bootcamp)
│   ├── uploads/               # Temporary file uploads
│   └── assets/               # Static assets
├── .env.example              # Environment configuration template
├── .gitignore               # Comprehensive file exclusions
└── package.json            # Dependencies and scripts
```

### Generated Certificates Organization
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

## ⚙️ Configuration

### Environment Variables
```bash
# Server Configuration
PORT=3000
BASE_URL=http://localhost:3000
SESSION_SECRET=your-session-secret-change-this

# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Directory Paths (relative to project root)
PUBLIC_DIR=public
UPLOADS_DIR=public/uploads
CERTS_DIR=public/certs
ASSETS_DIR=public/assets
```

### Format-Specific Settings

| Format | PDF Layout | Dimensions | QR Position |
|--------|------------|------------|-------------|
| Portrait | Vertical A4 | 794×1123px | `bottom: 60px, right: 50px` |
| Landscape | Horizontal A4 | 1123×794px | `bottom: 60px, right: 80px` |

## 🔍 API Endpoints

### Authentication Routes
- `GET /auth/login` - Login form
- `POST /auth/login` - Process login
- `GET /auth/signup` - Signup form  
- `POST /auth/signup` - Process registration
- `GET /auth/logout` - Logout user
- `GET /auth/dashboard` - User dashboard (authenticated)
- `GET /auth/profile` - User profile page (authenticated)

### Certificate Generation (Authenticated Required)
- `GET /generate` - Certificate generation form
- `POST /certs` - Generate certificate with QR code
  - **Form fields**: `bootcamp`, `format`, `type`, `student_name`, `certificate` (file)
  - **Response**: Success page with links to PDF and verification

### Admin Interface (Admin Role Required)
- `GET /generate/users` - User management interface
- `POST /generate/users/update` - Update user status (approve/reject/suspend)
- `GET /generate/certificates` - View all certificates across all users

### Verification (Public)
- `GET /verify/:uid` - Verify certificate by UUID
  - **Response**: Detailed verification page with certificate information

### System
- `GET /health` - Health check and system status
- `GET /` - Redirects to dashboard

## 💾 Database Schema

### Certificates Table (Supabase)
```sql
certificates (
  id: uuid (primary key),
  uid: text (unique),
  user_id: uuid (foreign key to auth.users),
  bootcamp: text,
  format: text,
  type: text,
  student_name: text (not null),
  original_filename: text,
  file_url: text,
  verify_url: text,
  created_at: timestamp
)
```

### Profiles Table (Supabase)
```sql
profiles (
  id: uuid (primary key, foreign key to auth.users),
  email: text,
  full_name: text,
  role: text (default 'user'),
  status: text (default 'pending'),
  approved_by: uuid,
  approved_at: timestamp,
  rejection_reason: text,
  notes: text,
  created_at: timestamp,
  updated_at: timestamp
)
```

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server with auto-reload
npm start           # Start production server
npm run setup-help  # Show Supabase setup instructions
```

### User Roles and Permissions

#### Regular Users (Authenticated)
- Generate certificates for their own use
- View their personal dashboard and certificate history
- Access their profile page
- View verification pages

#### Admin Users
- All regular user capabilities
- Approve/reject/suspend user accounts
- View all certificates across all users  
- Access user management interface
- System-wide oversight and analytics

### Adding New Features
1. **Controllers** - Add business logic in `controllers/`
2. **Routes** - Define endpoints in `routes/`
3. **Templates** - Create HTML templates in `templates/html/`
4. **Styles** - Add CSS in `templates/css/`
5. **Database** - Update Supabase schema as needed
6. **Middleware** - Add authentication/authorization in `middleware/`

## 🔒 Security Features

### Authentication & Authorization
- **Supabase Auth** - Industry-standard authentication with JWT tokens
- **Session Management** - Secure Express sessions with proper cookie handling
- **Row Level Security (RLS)** - Database-level access control
- **Role-based Access** - Middleware protection for admin routes
- **User Moderation** - Admin approval required for new accounts

### File Protection & Input Validation
- **File type restrictions** - PNG, JPG, PDF only
- **File size limits** - 10MB maximum
- **Required field validation** - Student name and bootcamp details
- **HTML escaping** - XSS protection for user inputs
- **Comprehensive `.gitignore`** - Protects sensitive files and certificates

### Database Security
- **Environment variables** - Sensitive credentials never committed
- **RLS Policies** - Users can only access their own data
- **Service role protection** - Admin operations use elevated permissions
- **Audit trail** - User approval/rejection tracking

## 🚢 Deployment

### Production Setup

1. **Supabase Configuration**
   ```bash
   # Set up production Supabase project
   # Configure RLS policies
   # Set environment variables for production URLs
   ```

2. **Environment Configuration**
   ```bash
   # Production environment variables
   PORT=80
   BASE_URL=https://your-domain.com
   SUPABASE_URL=https://your-prod-project.supabase.co
   SESSION_SECRET=secure-production-secret
   ```

3. **Process Management**
   ```bash
   # Use PM2 or similar for production
   npm install -g pm2
   pm2 start app.js --name "certificate-generator"
   ```

4. **Reverse Proxy** (Nginx/Apache)
   ```nginx
   location / {
     proxy_pass http://localhost:3000;
     proxy_set_header Host $host;
     proxy_set_header X-Real-IP $remote_addr;
   }
   ```

## 📊 Key Improvements Made

### From Original Version
- ✅ **Authentication System** - Added complete user management with Supabase
- ✅ **Admin Moderation** - New users require approval before system access
- ✅ **Database Migration** - Moved from JSON file to Supabase PostgreSQL
- ✅ **Template Externalization** - HTML/CSS moved to external templates
- ✅ **Route Security** - `/admin` renamed to `/generate` with authentication required
- ✅ **User Experience** - Personal dashboards, profile pages, organized certificate views
- ✅ **Admin Tools** - Comprehensive user management and certificate oversight
- ✅ **Data Organization** - Certificate lists displayed as organized tables
- ✅ **Personalization** - Student names required for all certificates
- ✅ **Code Organization** - Clean MVC architecture with proper separation of concerns

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
- Check Supabase setup documentation in `SUPABASE_SETUP.md`
- Review environment configuration
- Check authentication and user approval status

---

**Built with Node.js, Express, Supabase, Puppeteer, and QRCode.js**