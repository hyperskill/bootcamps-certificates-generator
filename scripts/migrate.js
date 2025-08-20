#!/usr/bin/env node

/**
 * Migration Script for Supabase Integration
 * 
 * This script:
 * 1. Tests Supabase connection
 * 2. Migrates existing JSON data to Supabase
 * 3. Backs up the original JSON file
 */

require('dotenv').config();
const { migrateFromJson, testConnection } = require('../utils/supabaseDatabase');

async function runMigration() {
  console.log('🚀 Starting Supabase Migration...\n');

  try {
    // Test Supabase connection
    console.log('1. Testing Supabase connection...');
    const connectionTest = await testConnection();
    
    if (!connectionTest.connected) {
      console.error('❌ Supabase connection failed:', connectionTest.error);
      console.log('\n📋 Please check:');
      console.log('   - SUPABASE_URL is set correctly');
      console.log('   - SUPABASE_SERVICE_KEY is set correctly');
      console.log('   - Your Supabase database is set up (run setup-supabase.sql)');
      process.exit(1);
    }
    
    console.log('✅ Supabase connection successful\n');

    // Run migration
    console.log('2. Starting data migration...');
    const result = await migrateFromJson();
    
    if (result.migrated > 0) {
      console.log(`✅ Successfully migrated ${result.migrated} certificates`);
      console.log(`📁 Original file backed up to: ${result.backup}`);
    } else {
      console.log('ℹ️  No certificates found to migrate');
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Start your server: npm run dev');
    console.log('   2. Visit: http://localhost:3000/auth/login');
    console.log('   3. Create your first user account');
    console.log('   4. Generate certificates!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Check your .env file has all Supabase variables');
    console.log('   - Ensure you ran setup-supabase.sql in your Supabase dashboard');
    console.log('   - Verify your Supabase project is active');
    process.exit(1);
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Supabase Migration Tool

Usage: node scripts/migrate.js [options]

Options:
  --help, -h     Show this help message
  --test, -t     Only test connection, don't migrate data

Environment Variables Required:
  SUPABASE_URL           Your Supabase project URL
  SUPABASE_SERVICE_KEY   Your Supabase service role key

Before running:
1. Set up your Supabase project
2. Run scripts/setup-supabase.sql in Supabase SQL Editor
3. Configure your .env file with Supabase credentials
`);
  process.exit(0);
}

if (args.includes('--test') || args.includes('-t')) {
  console.log('🧪 Testing Supabase connection only...\n');
  testConnection()
    .then((result) => {
      if (result.connected) {
        console.log('✅ Connection test successful!');
        console.log('ℹ️  Ready to run full migration');
      } else {
        console.log('❌ Connection test failed:', result.error);
      }
    })
    .catch((error) => {
      console.error('❌ Connection test error:', error.message);
    });
} else {
  runMigration();
}
