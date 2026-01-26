const fetch = require('node-fetch').default;
const FormData = require('form-data');

const API_URL = 'http://localhost:5000/api';

async function testTeacherFormFields() {
  console.log('Testing teacher application form fields...\n');
  
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
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }
    
    const loginData = await loginResponse.json();
    const authToken = loginData.token;
    console.log('✅ Login successful');
    console.log('---\n');
    
    // Step 2: Test form submission with correct field names
    console.log('2. Testing form submission with correct field names...');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    
    const formData = new FormData();
    formData.append('full_name', 'Test Teacher Form Fields');
    formData.append('sex', 'Male');
    formData.append('id_card', 'TEST123');
    formData.append('dob', '1990-01-01');
    formData.append('pob', 'Test City');
    formData.append('subjects', 'Mathematics, Physics');
    formData.append('classes', 'Form 1, Form 2');
    formData.append('contact', '+1234567890');
    formData.append('certificate', testImageBuffer, {
      filename: 'test-certificate.png',
      contentType: 'image/png'
    });
    formData.append('cv', testImageBuffer, {
      filename: 'test-cv.png',
      contentType: 'image/png'
    });
    formData.append('photo', testImageBuffer, {
      filename: 'test-photo.png',
      contentType: 'image/png'
    });
    
    const response = await fetch(`${API_URL}/teacher-application`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    console.log('Form submission status:', response.status);
    const responseData = await response.text();
    console.log('Form submission response:', responseData);
    console.log('---\n');
    
    console.log('✅ Form field test completed!');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testTeacherFormFields(); 