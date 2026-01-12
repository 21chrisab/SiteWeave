/**
 * Monday Launch Flow Test Script
 * Run this in browser console or Node.js to test the complete workflow
 */

// Test Configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || window?.VITE_SUPABASE_URL,
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || window?.VITE_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY, // Only for server-side
  appUrl: process.env.APP_URL || 'https://app.siteweave.org',
  testEmail: 'test-launch@example.com',
  testOrgName: 'Test Launch Organization',
  testOwnerName: 'Test Owner',
  testOwnerEmail: 'test-owner-launch@example.com',
  testWorkerEmail: 'test-worker-launch@example.com'
};

// Test Results
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

function logTest(name, passed, message = '') {
  if (passed) {
    testResults.passed.push(name);
    console.log(`✅ ${name}${message ? ': ' + message : ''}`);
  } else {
    testResults.failed.push({ name, message });
    console.error(`❌ ${name}${message ? ': ' + message : ''}`);
  }
}

function logWarning(name, message) {
  testResults.warnings.push({ name, message });
  console.warn(`⚠️ ${name}: ${message}`);
}

// Test 1: Check Environment Variables
async function testEnvironmentVariables() {
  console.log('\n📋 Testing Environment Variables...');
  
  if (!TEST_CONFIG.supabaseUrl) {
    logTest('Environment: SUPABASE_URL', false, 'Missing');
    return false;
  }
  logTest('Environment: SUPABASE_URL', true, 'Present');
  
  if (!TEST_CONFIG.supabaseKey) {
    logTest('Environment: SUPABASE_ANON_KEY', false, 'Missing');
    return false;
  }
  logTest('Environment: SUPABASE_ANON_KEY', true, 'Present');
  
  if (!TEST_CONFIG.appUrl) {
    logWarning('Environment: APP_URL', 'Using default');
  } else {
    logTest('Environment: APP_URL', true, TEST_CONFIG.appUrl);
  }
  
  return true;
}

// Test 2: Check Database Connection
async function testDatabaseConnection() {
  console.log('\n🔌 Testing Database Connection...');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey);
    
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    if (error) {
      logTest('Database Connection', false, error.message);
      return false;
    }
    
    logTest('Database Connection', true);
    return true;
  } catch (error) {
    logTest('Database Connection', false, error.message);
    return false;
  }
}

// Test 3: Check Edge Functions
async function testEdgeFunctions() {
  console.log('\n⚡ Testing Edge Functions...');
  
  const functions = [
    'create-org-admin',
    'team-invite',
    'team-create-user',
    'team-update-role',
    'team-remove-user'
  ];
  
  // Note: Can't directly test edge functions from client
  // This is a placeholder for manual verification
  logWarning('Edge Functions', 'Manual verification required. Check Supabase dashboard.');
  
  return true;
}

// Test 4: Check RLS Policies
async function testRLSPolicies() {
  console.log('\n🔒 Testing RLS Policies...');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey);
    
    // Test if we can query organizations (should work if RLS is set up)
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);
    
    if (error && error.code === '42501') {
      logTest('RLS Policies', false, 'RLS blocking queries - may need authentication');
    } else if (error) {
      logTest('RLS Policies', false, error.message);
    } else {
      logTest('RLS Policies', true, 'Queries working');
    }
    
    return true;
  } catch (error) {
    logTest('RLS Policies', false, error.message);
    return false;
  }
}

// Test 5: Check Invitation Schema
async function testInvitationSchema() {
  console.log('\n📧 Testing Invitation Schema...');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey);
    
    // Check if invitations table exists and has required columns
    const { data, error } = await supabase
      .from('invitations')
      .select('id, email, organization_id, role_id, invitation_token, status, expires_at')
      .limit(0); // Just check schema, don't fetch data
    
    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        logTest('Invitation Schema', false, 'invitations table does not exist');
      } else {
        logTest('Invitation Schema', false, error.message);
      }
      return false;
    }
    
    logTest('Invitation Schema', true, 'All required columns present');
    return true;
  } catch (error) {
    logTest('Invitation Schema', false, error.message);
    return false;
  }
}

// Test 6: Check Roles Schema
async function testRolesSchema() {
  console.log('\n👥 Testing Roles Schema...');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey);
    
    const { data, error } = await supabase
      .from('roles')
      .select('id, name, organization_id, permissions')
      .limit(0);
    
    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        logTest('Roles Schema', false, 'roles table does not exist');
      } else {
        logTest('Roles Schema', false, error.message);
      }
      return false;
    }
    
    logTest('Roles Schema', true, 'All required columns present');
    return true;
  } catch (error) {
    logTest('Roles Schema', false, error.message);
    return false;
  }
}

// Test 7: Check Profiles Schema
async function testProfilesSchema() {
  console.log('\n👤 Testing Profiles Schema...');
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, organization_id, role_id')
      .limit(0);
    
    if (error) {
      logTest('Profiles Schema', false, error.message);
      return false;
    }
    
    logTest('Profiles Schema', true, 'organization_id and role_id columns present');
    return true;
  } catch (error) {
    logTest('Profiles Schema', false, error.message);
    return false;
  }
}

// Test 8: Check Email Configuration
async function testEmailConfiguration() {
  console.log('\n📬 Testing Email Configuration...');
  
  // Check if Resend API key is configured (can't verify from client)
  logWarning('Email Configuration', 'Manual verification required. Check Supabase secrets for RESEND_API_KEY');
  
  return true;
}

// Run All Tests
async function runAllTests() {
  console.log('🚀 Starting Monday Launch Flow Tests...\n');
  console.log('='.repeat(50));
  
  await testEnvironmentVariables();
  await testDatabaseConnection();
  await testEdgeFunctions();
  await testRLSPolicies();
  await testInvitationSchema();
  await testRolesSchema();
  await testProfilesSchema();
  await testEmailConfiguration();
  
  // Print Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⚠️ Warnings: ${testResults.warnings.length}`);
  
  if (testResults.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.failed.forEach(test => {
      console.log(`   - ${test.name}: ${test.message}`);
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    testResults.warnings.forEach(warning => {
      console.log(`   - ${warning.name}: ${warning.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(50));
  
  return {
    passed: testResults.passed.length,
    failed: testResults.failed.length,
    warnings: testResults.warnings.length,
    allPassed: testResults.failed.length === 0
  };
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testResults };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  window.testLaunchFlow = runAllTests;
  console.log('💡 Run tests with: testLaunchFlow()');
}
