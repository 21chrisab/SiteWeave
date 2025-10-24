const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Read the latest.yml file
const latestYml = fs.readFileSync('release/latest.yml', 'utf8');
console.log('Latest.yml content:');
console.log(latestYml);

// Check if we have the setup file
const setupFile = 'release/SiteWeave Setup 1.0.6.exe';
if (fs.existsSync(setupFile)) {
  const stats = fs.statSync(setupFile);
  console.log(`\nSetup file exists: ${setupFile}`);
  console.log(`Size: ${stats.size} bytes`);
} else {
  console.log('Setup file not found!');
}

console.log('\nTo create a GitHub release:');
console.log('1. Go to https://github.com/21chrisab/SiteWeave/releases');
console.log('2. Click "Create a new release"');
console.log('3. Tag version: v1.0.6');
console.log('4. Release title: SiteWeave v1.0.6');
console.log('5. Upload the following files:');
console.log('   - SiteWeave Setup 1.0.6.exe');
console.log('   - latest.yml');
console.log('6. Publish the release');
