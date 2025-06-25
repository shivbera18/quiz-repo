const https = require('https');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, url, data = null, headers = {}) {
  const urlObj = new URL(url);
  
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  return new Promise((resolve, reject) => {
    const req = require(urlObj.protocol === 'https:' ? 'https' : 'http').request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function debugLogin() {
  console.log('🔍 Debugging Login Issue');
  console.log('=' .repeat(30));

  try {
    // Check server health
    const healthCheck = await makeRequest('GET', `${BASE_URL}/api/results`);
    console.log(`Server status: ${healthCheck.status}`);

    // Try login with debug info
    const loginResponse = await makeRequest('POST', `${BASE_URL}/api/auth/login`, {
      email: 'student@test.com',
      password: 'password123',
      userType: 'student'
    });

    console.log(`Login status: ${loginResponse.status}`);
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));

    // Try with another user
    const adminLogin = await makeRequest('POST', `${BASE_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123',
      userType: 'admin'
    });

    console.log(`Admin login status: ${adminLogin.status}`);
    console.log('Admin response:', JSON.stringify(adminLogin.data, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

debugLogin().catch(console.error);
