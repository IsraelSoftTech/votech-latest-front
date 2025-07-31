const fetch = require('node-fetch').default;

const API_URL = 'http://localhost:5000/api';

async function testLocalBackend() {
  console.log('Testing LOCAL backend endpoints...\n');
  
  try {
    // Test 1: Basic server test
    console.log('1. Testing basic server endpoint...');
    const testResponse = await fetch(`${API_URL}/test`);
    console.log('Status:', testResponse.status);
    const testData = await testResponse.text();
    console.log('Response:', testData);
    console.log('---\n');
    
    // Test 2: Teacher application test endpoint
    console.log('2. Testing teacher application test endpoint...');
    const teacherTestResponse = await fetch(`${API_URL}/teacher-application/test`);
    console.log('Status:', teacherTestResponse.status);
    const teacherTestData = await teacherTestResponse.text();
    console.log('Response:', teacherTestData);
    console.log('---\n');
    
    // Test 3: Check if teacher application endpoint exists
    console.log('3. Testing teacher application endpoint (should return 401 for no auth)...');
    const teacherResponse = await fetch(`${API_URL}/teacher-application`);
    console.log('Status:', teacherResponse.status);
    const teacherData = await teacherResponse.text();
    console.log('Response:', teacherData);
    console.log('---\n');
    
    // Test 4: Test login endpoint
    console.log('4. Testing login endpoint...');
    const loginResponse = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin1234',
        password: 'admin4321'
      }),
    });
    console.log('Status:', loginResponse.status);
    const loginData = await loginResponse.text();
    console.log('Response:', loginData);
    console.log('---\n');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testLocalBackend(); 