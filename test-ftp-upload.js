const fetch = require('node-fetch').default;
const FormData = require('form-data');

const API_URL = 'http://localhost:5000/api';

async function testFTPUpload() {
  console.log('Testing FTP upload functionality...\n');
  
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
    
    // Step 2: Test student photo upload
    console.log('2. Testing student photo upload...');
    
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    
    const studentFormData = new FormData();
    studentFormData.append('studentId', `STU${Date.now()}`);
    studentFormData.append('regDate', '2024-01-15');
    studentFormData.append('fullName', 'Test Student FTP');
    studentFormData.append('sex', 'Male');
    studentFormData.append('dob', '2000-01-01');
    studentFormData.append('pob', 'Test City');
    studentFormData.append('father', 'Test Father');
    studentFormData.append('mother', 'Test Mother');
    studentFormData.append('contact', '+1234567890');
    studentFormData.append('class', 'Form 1');
    studentFormData.append('dept', 'Computer Science');
    studentFormData.append('photo', testImageBuffer, {
      filename: 'test-student.png',
      contentType: 'image/png'
    });
    
    const studentResponse = await fetch(`${API_URL}/students`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: studentFormData
    });
    
    console.log('Student upload status:', studentResponse.status);
    const studentData = await studentResponse.text();
    console.log('Student upload response:', studentData);
    console.log('---\n');
    
    console.log('✅ FTP upload test completed!');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testFTPUpload(); 