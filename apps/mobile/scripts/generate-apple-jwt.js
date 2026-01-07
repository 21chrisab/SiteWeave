/**
 * Script to generate Apple Sign In JWT for Supabase
 * 
 * Usage: node scripts/generate-apple-jwt.js
 * 
 * This script generates a JWT token from your Apple private key
 * that Supabase requires for Apple Sign In configuration.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  // Your Team ID from Apple Developer (e.g., "ABC123DEF4")
  teamId: 'V34B4NYQAF',
  
  // Your Services ID from Apple Developer (e.g., "com.siteweave.mobile.signin")
  servicesId: 'com.siteweavesignin.mobile',
  
  // Your Key ID (from the .p8 filename, e.g., "CKTKTSC6SB")
  keyId: 'CKTKTSC6SB',
  
  // Path to your .p8 private key file
  // Update this path to where your .p8 file is located
  privateKeyPath: path.join(require('os').homedir(), 'Downloads', 'AuthKey_CKTKTSC6SB.p8'),
};

function generateAppleJWT() {
  try {
    // Read the private key
    if (!fs.existsSync(CONFIG.privateKeyPath)) {
      console.error('❌ Private key file not found at:', CONFIG.privateKeyPath);
      console.log('\nPlease update CONFIG.privateKeyPath in the script to point to your .p8 file.');
      process.exit(1);
    }

    const privateKey = fs.readFileSync(CONFIG.privateKeyPath, 'utf8');

    // Validate configuration
    if (CONFIG.teamId === 'YOUR_TEAM_ID_HERE') {
      console.error('❌ Please set your Team ID in CONFIG.teamId');
      process.exit(1);
    }

    if (CONFIG.servicesId === 'YOUR_SERVICES_ID_HERE') {
      console.error('❌ Please set your Services ID in CONFIG.servicesId');
      process.exit(1);
    }

    // JWT Header
    const header = {
      alg: 'ES256',
      kid: CONFIG.keyId,
    };

    // JWT Payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: CONFIG.teamId, // Issuer (Team ID)
      iat: now, // Issued at
      exp: now + (365 * 24 * 60 * 60), // Expires in 1 year
      aud: 'https://appleid.apple.com', // Audience
      sub: CONFIG.servicesId, // Subject (Services ID)
    };

    // Encode header and payload
    const encodedHeader = Buffer.from(JSON.stringify(header))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const encodedPayload = Buffer.from(JSON.stringify(payload))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Create signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const sign = crypto.createSign('SHA256');
    sign.update(signatureInput);
    sign.end();

    const signature = sign.sign(privateKey, 'base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Create JWT
    const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;

    console.log('\n✅ Apple Sign In JWT generated successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Copy this JWT and paste it into Supabase Dashboard → Authentication → Providers → Apple → Secret Key:\n');
    console.log(jwt);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 Configuration Summary:');
    console.log(`   Team ID: ${CONFIG.teamId}`);
    console.log(`   Services ID: ${CONFIG.servicesId}`);
    console.log(`   Key ID: ${CONFIG.keyId}`);
    console.log(`   JWT Expires: ${new Date((now + (365 * 24 * 60 * 60)) * 1000).toISOString()}\n`);
    console.log('⚠️  Note: This JWT expires in 1 year. You\'ll need to regenerate it before expiration.\n');

    return jwt;
  } catch (error) {
    console.error('❌ Error generating JWT:', error.message);
    if (error.message.includes('PEM')) {
      console.error('\n💡 Tip: Make sure your .p8 file is in the correct format (PEM).');
    }
    process.exit(1);
  }
}

// Run the script
generateAppleJWT();

