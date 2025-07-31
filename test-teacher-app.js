const fetch = require('node-fetch').default;

const API_URL = 'http://localhost:5000/api';

async function testTeacherApplication() {
  console.log('Testing Teacher Application functionality...\n');
  
  let authToken = null;
  
  try {
    // Step 1: Login to get authentication token
    console.log('1. Logging in to get authentication token...');
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
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.token;
      console.log('✅ Login successful, token received');
      console.log('User:', loginData.user);
    } else {
      const errorData = await loginResponse.text();
      console.log('❌ Login failed:', errorData);
      return;
    }
    
    console.log('---\n');
    
    // Step 2: Test getting teacher application (should return 404 if none exists)
    console.log('2. Testing GET teacher application...');
    const getResponse = await fetch(`${API_URL}/teacher-application`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('GET Status:', getResponse.status);
    const getData = await getResponse.text();
    console.log('GET Response:', getData);
    console.log('---\n');
    
    // Step 3: Test creating a teacher application
    console.log('3. Testing POST teacher application...');
    
    // Create form data for file upload
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('full_name', 'John Doe');
    formData.append('sex', 'Male');
    formData.append('id_card', 'ID123456');
    formData.append('dob', '1990-01-01');
    formData.append('pob', 'Test City');
    formData.append('subjects', 'Mathematics, Physics');
    formData.append('classes', 'Form 1, Form 2');
    formData.append('contact', '+1234567890');
    
    const createResponse = await fetch(`${API_URL}/teacher-application`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    console.log('POST Status:', createResponse.status);
    const createData = await createResponse.text();
    console.log('POST Response:', createData);
    console.log('---\n');
    
    // Step 4: If creation was successful, test getting the application
    if (createResponse.ok) {
      console.log('4. Testing GET teacher application after creation...');
      const getAfterResponse = await fetch(`${API_URL}/teacher-application`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('GET After Status:', getAfterResponse.status);
      const getAfterData = await getAfterResponse.text();
      console.log('GET After Response:', getAfterData);
      console.log('---\n');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testTeacherApplication(); 