const { execSync } = require('child_process');
const path = require('path');

/**
 * Install dependencies for all parts of the URL shortener project
 */

console.log('Installing dependencies for URL Shortener Microservice...');

try {
  // Install logging middleware dependencies
  console.log('\n1. Installing logging middleware dependencies...');
  process.chdir(path.join(__dirname, 'logging-middleware'));
  execSync('npm install', { stdio: 'inherit' });

  // Install backend dependencies
  console.log('\n2. Installing backend dependencies...');
  process.chdir(path.join(__dirname, 'backend-test-submission'));
  execSync('npm install', { stdio: 'inherit' });
  
  // Install frontend dependencies
  console.log('\n3. Installing frontend dependencies...');
  process.chdir(path.join(__dirname, 'frontend-test-submission'));
  execSync('npm install', { stdio: 'inherit' });

  console.log('\n✅ All dependencies installed successfully!');
  console.log('\nTo start the application:');
  console.log('1. Backend: cd backend-test-submission && npm start');
  console.log('2. Frontend: cd frontend-test-submission && npm start');
  console.log('3. Or use: npm run dev (from root directory)');

} catch (error) {
  console.error('❌ Error installing dependencies:', error.message);
  process.exit(1);
}