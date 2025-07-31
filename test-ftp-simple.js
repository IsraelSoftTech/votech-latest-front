const fetch = require('node-fetch').default;

const API_URL = 'http://localhost:5000/api';

async function testFTPSimple() {
  console.log('Testing FTP service directly...\n');
  
  try {
    // Test 1: Check if backend is running
    console.log('1. Testing backend connection...');
    const testResponse = await fetch(`${API_URL}/test`);
    console.log('Backend status:', testResponse.status);
    const testData = await testResponse.text();
    console.log('Backend response:', testData);
    console.log('---\n');
    
    // Test 2: Check if we can get classes (to see if they exist)
    console.log('2. Testing classes endpoint...');
    const classesResponse = await fetch(`${API_URL}/classes`);
    console.log('Classes status:', classesResponse.status);
    const classesData = await classesResponse.text();
    console.log('Classes response:', classesData);
    console.log('---\n');
    
    // Test 3: Check if we can get specialties
    console.log('3. Testing specialties endpoint...');
    const specialtiesResponse = await fetch(`${API_URL}/specialties`);
    console.log('Specialties status:', specialtiesResponse.status);
    const specialtiesData = await specialtiesResponse.text();
    console.log('Specialties response:', specialtiesData);
    console.log('---\n');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testFTPSimple(); 