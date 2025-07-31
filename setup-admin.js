const fetch = require('node-fetch').default;

const API_URL = 'http://localhost:5000/api';

async function setupAdmin() {
  console.log('Setting up admin user...\n');
  
  try {
    // Call the setup-admin endpoint
    console.log('Calling setup-admin endpoint...');
    const setupResponse = await fetch(`${API_URL}/setup-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Setup Status:', setupResponse.status);
    const setupData = await setupResponse.text();
    console.log('Setup Response:', setupData);
    console.log('---\n');
    
    // Test login with the created credentials
    console.log('Testing login with created credentials...');
    const loginResponse = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin1234',
        password: 'admin1234'
      }),
    });
    
    console.log('Login Status:', loginResponse.status);
    const loginData = await loginResponse.text();
    console.log('Login Response:', loginData);
    
  } catch (error) {
    console.error('Setup failed:', error.message);
  }
}

setupAdmin(); 