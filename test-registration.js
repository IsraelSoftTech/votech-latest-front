const fetch = require('node-fetch').default;

const API_URL = 'http://localhost:5000/api';

async function testRegistration() {
  console.log('Testing user registration...\n');
  
  try {
    // Test 1: Register a new test user
    console.log('1. Registering a new test user...');
    const registerResponse = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123',
        contact: '+1234567890',
        role: 'Teacher',
        name: 'Test User',
        email: 'test@example.com',
        gender: 'Male'
      }),
    });
    
    console.log('Register Status:', registerResponse.status);
    const registerData = await registerResponse.text();
    console.log('Register Response:', registerData);
    console.log('---\n');
    
    // Test 2: Login with the new user
    console.log('2. Logging in with the new user...');
    const loginResponse = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass123'
      }),
    });
    
    console.log('Login Status:', loginResponse.status);
    const loginData = await loginResponse.text();
    console.log('Login Response:', loginData);
    
    if (loginResponse.ok) {
      const loginJson = JSON.parse(loginData);
      console.log('✅ Login successful!');
      console.log('User:', loginJson.user);
      console.log('Token received:', loginJson.token ? 'Yes' : 'No');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testRegistration(); 