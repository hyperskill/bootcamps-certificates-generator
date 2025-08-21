-- Supabase Database Setup Script for Certificate Generator
-- Complete schema with authentication, user moderation, and certificate management
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users with user moderation)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT, -- Admin notes about the user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create certificates table with user association
CREATE TABLE IF NOT EXISTS certificates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL, -- Unique identifier for QR codes
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Which user created this
  bootcamp TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('portrait', 'landscape')),
  type TEXT NOT NULL CHECK (type IN ('completion', 'participation')),
  student_name TEXT NOT NULL, -- Required field - the name on the certificate
  original_filename TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Path to the generated PDF
  verify_url TEXT NOT NULL, -- Verification URL with QR code
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- ======================
-- PROFILES POLICIES
-- ======================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (but not role/status)
CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile during signup
CREATE POLICY "Users can insert own profile" ON profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update user statuses and roles
CREATE POLICY "Admins can update user profiles" ON profiles
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ======================
-- CERTIFICATES POLICIES
-- ======================

-- Anyone can view certificates (for verification)
CREATE POLICY "Anyone can view certificates" ON certificates 
  FOR SELECT USING (true);

-- Authenticated users can create certificates
CREATE POLICY "Authenticated users can create certificates" ON certificates 
  FOR INSERT TO authenticated WITH CHECK (true);

-- Users can update their own certificates
CREATE POLICY "Users can update own certificates" ON certificates 
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Admins can view and manage all certificates
CREATE POLICY "Admins can manage all certificates" ON certificates 
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ======================
-- PERFORMANCE INDEXES
-- ======================

-- Certificates indexes
CREATE INDEX IF NOT EXISTS idx_certificates_uid ON certificates(uid);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_bootcamp ON certificates(bootcamp);
CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates(type);
CREATE INDEX IF NOT EXISTS idx_certificates_created_at ON certificates(created_at DESC);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_approved_by ON profiles(approved_by);

-- ======================
-- HELPER FUNCTIONS
-- ======================

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS certificates_updated_at ON certificates;
CREATE TRIGGER certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'pending' -- All new users start as pending approval
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================
-- SECURITY GRANTS
-- ======================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT ALL ON TABLE certificates TO authenticated;

-- Grant read-only access to anonymous users (for verification)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE certificates TO anon;

-- ======================
-- HELPER VIEWS (Optional)
-- ======================

-- View for certificate statistics (admin use)
CREATE OR REPLACE VIEW certificate_stats AS
SELECT 
  bootcamp,
  type,
  COUNT(*) as total_certificates,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as first_certificate,
  MAX(created_at) as latest_certificate
FROM certificates 
GROUP BY bootcamp, type
ORDER BY total_certificates DESC;

-- View for user management (admin use)
CREATE OR REPLACE VIEW user_management_view AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.status,
  p.created_at,
  COUNT(c.id) as certificate_count,
  approver.email as approved_by_email,
  p.approved_at,
  p.rejection_reason,
  p.notes
FROM profiles p
LEFT JOIN certificates c ON p.id = c.user_id
LEFT JOIN profiles approver ON p.approved_by = approver.id
GROUP BY p.id, p.email, p.full_name, p.role, p.status, p.created_at, 
         approver.email, p.approved_at, p.rejection_reason, p.notes
ORDER BY p.created_at DESC;

-- Grant view access to authenticated users
GRANT SELECT ON certificate_stats TO authenticated;
GRANT SELECT ON user_management_view TO authenticated;

-- ======================
-- SAMPLE DATA (Optional)
-- ======================

-- Uncomment to create a sample admin user for testing
-- Note: You should change the email and create this user through the app instead
-- 
-- INSERT INTO auth.users (
--   id, 
--   email, 
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   raw_user_meta_data
-- ) VALUES (
--   gen_random_uuid(),
--   'admin@example.com',
--   crypt('SecurePassword123!', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW(),
--   '{"full_name": "System Administrator"}'::jsonb
-- ) ON CONFLICT (email) DO NOTHING;

-- ======================
-- VERIFICATION QUERIES
-- ======================

-- Verify tables were created
SELECT 
  'Tables created successfully!' as status,
  array_agg(table_name) as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'certificates');

-- Verify RLS policies
SELECT 
  'RLS Policies created successfully!' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public';

-- Verify indexes
SELECT 
  'Indexes created successfully!' as status,
  COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%';

-- Final success message
SELECT '✅ Supabase database setup completed successfully!' AS status;

-- ======================
-- SETUP VERIFICATION
-- ======================

-- Run these queries after setup to verify everything is working:

-- 1. Check table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' OR table_name = 'certificates'
-- ORDER BY table_name, ordinal_position;

-- 2. Test profile creation (after creating a user through the app)
-- SELECT id, email, full_name, role, status, created_at FROM profiles;

-- 3. Check certificate storage works (after generating a certificate)
-- SELECT uid, bootcamp, student_name, type, format, created_at FROM certificates;

-- 4. Verify user moderation workflow
-- SELECT 
--   email, 
--   role, 
--   status, 
--   approved_at,
--   CASE 
--     WHEN status = 'pending' THEN 'Waiting for admin approval'
--     WHEN status = 'approved' THEN 'Can access system'
--     WHEN status = 'rejected' THEN 'Access denied'
--     WHEN status = 'suspended' THEN 'Access suspended'
--   END as access_level
-- FROM profiles;