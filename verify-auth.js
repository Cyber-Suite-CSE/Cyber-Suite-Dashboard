// Native fetch is available in Node 22
// const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@cybersec.cse';
const ADMIN_PASSWORD = 'CyberSec2025@C$E'; 

async function runTests() {
  console.log('--- Starting Authentication & Gateway Tests ---\n');

  // 1. Test Gateway Access Without Token (Should Fail)
  console.log('1. Testing Gateway Access Without Token...');
  // Note: trailingSlash: true in next.config.mjs requires a trailing slash here
  const res1 = await fetch(`${BASE_URL}/api/gateway/test/`, { redirect: 'manual' });
  if (res1.status === 401) {
    console.log('✅ PASS: Gateway rejected unauthenticated request (401)\n');
  } else {
    console.error(`❌ FAIL: Expected 401, got ${res1.status}\n`);
  }

  // 2. Test Login (Should Succeed)
  console.log('2. Testing Login with Valid Credentials...');
  const res2 = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  
  if (res2.status === 200) {
    const data = await res2.json();
    const cookie = res2.headers.get('set-cookie');
    
    if (data.success && data.token && cookie) {
      console.log('✅ PASS: Login successful, token and cookie received');
      console.log(`   Token: ${data.token.substring(0, 20)}...`);
      console.log(`   Cookie: ${cookie.substring(0, 20)}...\n`);
      
      // Extract auth_token from Set-Cookie header for subsequent requests
      // This simple extraction assumes the first cookie is what we need or node-fetch handling
      const authToken = cookie.split(';')[0];

      // 3. Test Gateway Access With Token (Should Succeed)
      console.log('3. Testing Gateway Access With Valid Token...');
      const res3 = await fetch(`${BASE_URL}/api/gateway/users/123/`, {
        headers: { 
            'Cookie': authToken
        }
      });

      if (res3.status === 200) {
        const gatewayData = await res3.json();
        console.log('✅ PASS: Gateway accepted authenticated request (200)');
        console.log(`   Response: ${JSON.stringify(gatewayData)}\n`);
      } else {
        console.error(`❌ FAIL: Expected 200, got ${res3.status}`);
        console.log(await res3.text());
        console.log('\n');
      }

    } else {
      console.error('❌ FAIL: Login successful but missing token or cookie\n');
    }
  } else {
    console.error(`❌ FAIL: Login failed with status ${res2.status}`);
    console.log(await res2.text());
    console.log('\n');
  }
}

runTests().catch(console.error);
