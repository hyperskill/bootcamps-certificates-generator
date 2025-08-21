# Supabase Integration Setup Guide

Complete setup guide for the Certificate Generator with authentication, user moderation, and admin interface.

## 📋 Prerequisites

- Node.js 16+ and npm installed
- Git (for cloning the repository)
- Supabase account (free tier available)
- Basic knowledge of SQL and environment variables

## 🚀 Complete Setup from Scratch

### 1. Clone and Install Project

```bash
git clone <repository-url>
cd certs-proto
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in:
   - **Name**: `certificate-generator` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest to your users
5. Click "Create new project" and wait for setup to complete (~2 minutes)

### 3. Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (something like `https://abcdefgh.supabase.co`)
   - **anon public** key (starts with `eyJhb...`)
   - **service_role** key (starts with `eyJhb...`) ⚠️ **Keep this secret!**

### 4. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual Supabase values:
   ```bash
   # Server Configuration
   PORT=3000
   BASE_URL=http://localhost:3000
   SESSION_SECRET=your_super_secret_session_key_change_this_in_production

   # Supabase Configuration (REQUIRED - Replace with your actual values)
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   # Directory Paths (relative to project root)
   PUBLIC_DIR=public
   UPLOADS_DIR=public/uploads
   CERTS_DIR=public/certs
   ASSETS_DIR=public/assets
   ```

**🚨 Important**: Replace `your-project-id`, `your_anon_key_here`, and `your_service_role_key_here` with your actual Supabase credentials!

### 5. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `scripts/setup-supabase.sql` into the editor
4. Click "Run" to execute the script
5. You should see: "✅ Supabase database setup completed successfully!"

### 6. Create Required Directories

```bash
mkdir -p public/certs public/uploads public/assets
```

### 7. Start the Development Server

```bash
npm run dev
```

You should see:
```
🚀 Certificate Generator running on http://localhost:3000
📊 Dashboard: http://localhost:3000/auth/dashboard
🔐 Login: http://localhost:3000/auth/login
🎓 Generate: http://localhost:3000/generate
💾 Health: http://localhost:3000/health
```

### 8. Test the Setup

1. **Health Check**: Visit http://localhost:3000/health
   - Should show "status": "ok" and database connection successful

2. **Create First Admin User**:
   - Visit http://localhost:3000/auth/signup
   - Register with your email and password
   - Go to Supabase Dashboard → **Authentication** → **Users**
   - Find your user and note the UUID
   - Go to **Table Editor** → **profiles**
   - Find your profile and change `role` from `user` to `admin`
   - Change `status` from `pending` to `approved`

3. **Test Authentication**:
   - Logout and login again
   - You should now have admin access
   - Visit http://localhost:3000/generate to access certificate generation

## 🎯 Application URLs and Features

### Public Access
- **Certificate Verification**: http://localhost:3000/verify/[certificate-id]
- **Health Check**: http://localhost:3000/health

### Authentication Required
- **Login**: http://localhost:3000/auth/login
- **Sign Up**: http://localhost:3000/auth/signup
- **User Dashboard**: http://localhost:3000/auth/dashboard
- **User Profile**: http://localhost:3000/auth/profile
- **Certificate Generation**: http://localhost:3000/generate

### Admin Only (Admin Role Required)
- **User Management**: http://localhost:3000/generate/users
- **All Certificates**: http://localhost:3000/generate/certificates

## 🔐 User Flow and Authentication

### New User Registration Flow
1. **Sign Up**: User registers at `/auth/signup`
2. **Pending Status**: Account automatically set to "pending" status
3. **Admin Approval**: Admin must approve the user via `/generate/users`
4. **Access Granted**: Approved users can login and generate certificates

### User Roles and Permissions

#### **Regular Users** (role: 'user', status: 'approved')
- Generate certificates with their name attached
- View their personal certificate history
- Access their profile page
- Cannot access admin features

#### **Admin Users** (role: 'admin', status: 'approved')
- All regular user capabilities
- Approve/reject/suspend user accounts
- View all certificates across all users
- Access user management interface
- Full system oversight

#### **Pending Users** (status: 'pending')
- Cannot login until approved by admin
- Receive "pending approval" message on login attempts

#### **Rejected/Suspended Users**
- Cannot access the system
- Shown appropriate messages on login attempts

## 📊 Database Schema

### Tables Created

#### **profiles** (User Management)
```sql
profiles (
  id: UUID (primary key, links to auth.users)
  email: TEXT (unique, not null)
  full_name: TEXT
  role: TEXT ('user' | 'admin') DEFAULT 'user'
  status: TEXT ('pending' | 'approved' | 'rejected' | 'suspended') DEFAULT 'pending'
  approved_by: UUID (references profiles.id)
  approved_at: TIMESTAMP
  rejection_reason: TEXT
  notes: TEXT (admin notes)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
)
```

#### **certificates** (Certificate Storage)
```sql
certificates (
  id: UUID (primary key)
  uid: TEXT (unique, for QR codes and verification)
  user_id: UUID (references profiles.id, nullable)
  bootcamp: TEXT (not null)
  format: TEXT ('portrait' | 'landscape')
  type: TEXT ('completion' | 'participation')
  student_name: TEXT (not null) -- Required field for personalization
  original_filename: TEXT
  file_url: TEXT (path to generated PDF)
  verify_url: TEXT (verification URL)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
)
```

### Security Features
- **Row Level Security (RLS)** enabled on all tables
- **Authentication required** for certificate generation
- **Admin-only policies** for user management
- **Public access** only for certificate verification

## 🛠️ Administration Tasks

### Managing Users (Admin Interface)

1. **Access User Management**: http://localhost:3000/generate/users
2. **Filter Users**: View by status (All, Pending, Approved, Rejected, Suspended)
3. **User Actions**:
   - **Approve**: Grant access to the system
   - **Reject**: Deny access with reason
   - **Suspend**: Temporarily disable existing user

### Certificate Oversight

1. **View All Certificates**: http://localhost:3000/generate/certificates
2. **Organized by Bootcamp**: See system-wide certificate generation
3. **User Attribution**: See which user generated each certificate

### Database Management

```sql
-- Make a user admin
UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';

-- Approve a pending user
UPDATE profiles SET status = 'approved', approved_at = NOW() WHERE email = 'user@example.com';

-- View certificate statistics
SELECT 
  bootcamp, 
  type, 
  COUNT(*) as certificate_count,
  COUNT(DISTINCT user_id) as unique_users
FROM certificates 
GROUP BY bootcamp, type 
ORDER BY certificate_count DESC;
```

## 🔧 Development and Testing

### Available Scripts
```bash
npm run dev          # Start development server with auto-reload
npm start           # Start production server
npm run setup-help  # Show Supabase setup instructions
```

### Testing the Application

1. **Create Test Certificates**:
   - Upload sample images/PDFs
   - Test both portrait and landscape formats
   - Verify QR codes link to correct verification pages

2. **Test User Moderation**:
   - Create multiple test accounts
   - Practice approving/rejecting users
   - Test access control for different user states

3. **Admin Interface Testing**:
   - Test user management interface
   - Verify certificate oversight functionality
   - Check role-based access restrictions

## 🚨 Troubleshooting

### Common Issues

#### **Database Connection Failed**
- Check `.env` file has correct Supabase credentials
- Verify Supabase project is active (not paused)
- Ensure no extra spaces or quotes around values

#### **Authentication Not Working**
- Verify `SESSION_SECRET` is set in `.env`
- Check Supabase Auth settings allow signups
- Confirm RLS policies were created correctly

#### **Admin Features Not Accessible**
- Ensure user has `role = 'admin'` in profiles table
- Check user status is `approved`
- Verify admin middleware is working

#### **Certificate Generation Fails**
- Check directory permissions for `public/certs` and `public/uploads`
- Verify user is authenticated and approved
- Check Puppeteer dependencies are installed

### Database Issues

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Verify RLS policies
SELECT schemaname, tablename, policyname FROM pg_policies;

-- Check user statuses
SELECT email, role, status, created_at FROM profiles ORDER BY created_at DESC;
```

## 🚢 Production Deployment

### Environment Configuration
```bash
# Production .env example
PORT=80
BASE_URL=https://your-domain.com
SESSION_SECRET=very_secure_production_secret_min_32_chars
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
```

### Security Checklist
- [ ] Strong session secret (32+ characters)
- [ ] HTTPS enabled (`secure: true` for cookies)
- [ ] Supabase environment isolated from development
- [ ] Service role key properly secured
- [ ] File upload limits configured
- [ ] Regular database backups enabled

### Deployment Steps
1. Set up production Supabase project
2. Configure production environment variables
3. Run database setup script on production
4. Create first admin user
5. Configure reverse proxy (Nginx/Apache)
6. Set up process management (PM2)
7. Configure SSL certificates

## 🎉 Success! What You Have Now

✅ **Complete Authentication System** with Supabase  
✅ **User Moderation** - Admin approval required for new users  
✅ **Certificate Generation** with QR codes and verification  
✅ **Admin Interface** for user and certificate management  
✅ **Role-based Access Control** with proper security  
✅ **Personal Dashboards** for users to track their certificates  
✅ **Professional Architecture** with templates and MVC pattern  

Your certificate generation system is now production-ready with enterprise-level user management! 🚀

## 📞 Support

If you encounter issues:
1. Check the application logs in your terminal
2. Verify Supabase dashboard for authentication/database errors
3. Review this setup guide step-by-step
4. Check environment variables are correctly set
5. Test database connection with `/health` endpoint

For additional help, create an issue in the repository with:
- Error messages from console
- Steps to reproduce the issue
- Screenshots of Supabase dashboard if relevant