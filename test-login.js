const fetch = require('node-fetch');

// Import config (for Node.js, we'll use the URL directly)
const API_URL = 'https://api.votechs7academygroup.com/api';

async function testLogin() {
  try {
    console.log('Testing login...');
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin1234',
        password: 'admin4321'
      }),
    });

    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Raw response:', text);

    try {
      const data = JSON.parse(text);
      console.log('Parsed response:', data);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testLogin(); 