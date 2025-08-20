# Supabase Integration Setup Guide

This guide will help you integrate Supabase authentication and database into your certificate generator.

## 📋 Prerequisites

- Node.js and npm installed
- Supabase account (free tier available)
- Basic knowledge of SQL

## 🚀 Step-by-Step Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Fill in:
   - **Name**: `certificate-generator` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the closest to your users
5. Click "Create new project" and wait for setup to complete

### 2. Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (something like `https://abcdefgh.supabase.co`)
   - **anon public** key (starts with `eyJhb...`)
   - **service_role** key (starts with `eyJhb...`) ⚠️ **Keep this secret!**

### 3. Update Environment Variables

1. Open your `.env` file in the project root
2. Update the Supabase section with your actual values:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Session Configuration
SESSION_SECRET=your_super_secret_session_key_change_this_in_production
JWT_SECRET=your_jwt_secret_key_change_this_in_production
```

**Important**: Replace the placeholder values with your actual Supabase credentials!

### 4. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `scripts/setup-supabase.sql` into the editor
4. Click "Run" to execute the script
5. You should see a success message: "Supabase database setup completed successfully!"

### 5. Test Connection

```bash
npm run test-db
```

This will test your Supabase connection. You should see:
```
✅ Supabase connection successful
```

### 6. Migrate Existing Data (Optional)

If you have existing certificates in the JSON database:

```bash
npm run migrate
```

This will:
- Move your existing certificates to Supabase
- Back up your original JSON file
- Show a summary of migrated records

### 7. Start the Server

```bash
npm run dev
```

## 🔗 New URLs and Features

After setup, you'll have these new endpoints:

- **Home/Dashboard**: http://localhost:3000/ (redirects to dashboard)
- **User Dashboard**: http://localhost:3000/auth/dashboard
- **Login**: http://localhost:3000/auth/login
- **Sign Up**: http://localhost:3000/auth/signup
- **Certificate Generation**: http://localhost:3000/admin (now supports user association)
- **Health Check**: http://localhost:3000/health

## 🔐 Authentication Flow

1. **New users** visit `/auth/signup` to create an account
2. **Existing users** visit `/auth/login` to sign in
3. **Authenticated users** can:
   - Generate certificates (associated with their account)
   - View their certificate history on the dashboard
   - Access their profile information
4. **Anonymous users** can:
   - Still generate certificates (with `user_id: null`)
   - Verify certificates via QR codes

## 📊 Database Schema

Your certificates are now stored in Supabase with this schema:

```sql
certificates:
  - id: UUID (primary key)
  - uid: TEXT (unique, for QR codes)
  - user_id: UUID (foreign key to profiles, nullable)
  - bootcamp: TEXT
  - format: TEXT ('portrait' | 'landscape')
  - type: TEXT ('completion' | 'participation')
  - description: TEXT
  - original_filename: TEXT
  - file_url: TEXT
  - verify_url: TEXT
  - created_at: TIMESTAMP
  - updated_at: TIMESTAMP

profiles:
  - id: UUID (foreign key to auth.users)
  - email: TEXT
  - full_name: TEXT
  - role: TEXT ('user' | 'admin')
  - created_at: TIMESTAMP
  - updated_at: TIMESTAMP
```

## 🛠 Troubleshooting

### Connection Issues
- Double-check your `.env` file has the correct Supabase credentials
- Ensure there are no extra spaces or quotes around the values
- Verify your Supabase project is active (not paused)

### Database Schema Issues
- Make sure you ran the entire `setup-supabase.sql` script
- Check the Supabase SQL Editor for any error messages
- Ensure RLS (Row Level Security) policies are created

### Migration Issues
- The migration will skip if no JSON file exists (this is normal for new setups)
- Backup files are created automatically with timestamps
- If migration fails, check the error messages for specific issues

### Authentication Issues
- Make sure session middleware is configured correctly
- Check that the `SESSION_SECRET` is set in your `.env` file
- Verify users can reach the login/signup pages

## 🔄 Development vs Production

### Development Settings (Current)
- Session cookies: `secure: false` (works with HTTP)
- Email confirmation: Auto-confirmed
- Error logging: Detailed console output

### Production Recommendations
- Set `secure: true` for session cookies (requires HTTPS)
- Enable email confirmation in Supabase Auth settings
- Use environment-specific secrets
- Set up proper logging and monitoring
- Consider rate limiting for auth endpoints

## 📈 Next Steps

After successful setup, consider these enhancements:

1. **Admin Panel**: Create admin users and add bulk operations
2. **Email Notifications**: Use Supabase Edge Functions for email sending
3. **File Storage**: Migrate PDF storage to Supabase Storage
4. **Analytics**: Track certificate generation and verification
5. **API Keys**: Add API key authentication for external integrations

## 🆘 Getting Help

If you encounter issues:

1. Check the console output for error messages
2. Verify all environment variables are set correctly
3. Run `npm run test-db` to test your connection
4. Check your Supabase project dashboard for any issues
5. Review the logs in both your application and Supabase dashboard

## 📝 Summary

Once completed, you'll have:
- ✅ User authentication and registration
- ✅ Secure database storage with Supabase
- ✅ User-associated certificate tracking
- ✅ Row-level security policies
- ✅ Automatic profile creation
- ✅ Migration from JSON to SQL database
- ✅ Production-ready authentication flow

Your certificate generator is now ready for production use! 🎉
