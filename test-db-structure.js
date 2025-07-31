const fetch = require('node-fetch').default;

const API_URL = 'http://localhost:5000/api';

async function testDatabaseStructure() {
  console.log('Testing database structure...\n');
  
  try {
    // Test 1: Check if we can get teachers (this will show table structure)
    console.log('1. Testing GET teachers endpoint...');
    const teachersResponse = await fetch(`${API_URL}/teachers`);
    console.log('Status:', teachersResponse.status);
    const teachersData = await teachersResponse.text();
    console.log('Response:', teachersData);
    console.log('---\n');
    
    // Test 2: Try to create a simple teacher record to see the exact error
    console.log('2. Testing simple teacher creation...');
    const simpleTeacherResponse = await fetch(`${API_URL}/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        full_name: 'Test Teacher',
        sex: 'Male',
        id_card: 'TEST123',
        dob: '1990-01-01',
        pob: 'Test City',
        subjects: 'Math',
        classes: 'Form 1',
        contact: '+1234567890'
      })
    });
    
    console.log('Status:', simpleTeacherResponse.status);
    const simpleTeacherData = await simpleTeacherResponse.text();
    console.log('Response:', simpleTeacherData);
    console.log('---\n');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testDatabaseStructure(); 