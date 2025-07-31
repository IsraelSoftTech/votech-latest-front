const fetch = require('node-fetch').default;

const API_URL = 'http://localhost:5000/api';

async function testSpecificUser() {
  console.log('Testing specific user issue...\n');
  
  try {
    // Step 1: Login with the specific user credentials
    console.log('1. Logging in with Teacher user...');
    const loginResponse = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Teacher',
        password: 'teacher123'
      }),
    });
    
    console.log('Login status:', loginResponse.status);
    const loginData = await loginResponse.text();
    console.log('Login response:', loginData);
    console.log('---\n');
    
    if (loginResponse.ok) {
      const loginJson = JSON.parse(loginData);
      const authToken = loginJson.token;
      
      // Step 2: Check if this user has existing applications
      console.log('2. Checking existing applications for this user...');
      const appsResponse = await fetch(`${API_URL}/teachers`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('Applications status:', appsResponse.status);
      const appsData = await appsResponse.text();
      console.log('Applications response:', appsData);
      console.log('---\n');
      
      // Step 3: Try to submit a new application
      console.log('3. Testing application submission...');
      const FormData = require('form-data');
      const formData = new FormData();
      
      formData.append('full_name', 'Test Teacher Submission');
      formData.append('sex', 'Male');
      formData.append('id_card', 'TEST456');
      formData.append('dob', '1990-01-01');
      formData.append('pob', 'Test City');
      formData.append('subjects', 'Mathematics');
      formData.append('classes', 'Form 1');
      formData.append('contact', '+1234567890');
      
      const submitResponse = await fetch(`${API_URL}/teacher-application`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });
      
      console.log('Submit status:', submitResponse.status);
      const submitData = await submitResponse.text();
      console.log('Submit response:', submitData);
      console.log('---\n');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testSpecificUser(); 