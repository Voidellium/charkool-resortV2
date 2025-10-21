// Test script for account linking functionality
// Run this in the browser console to test the API routes

async function testAccountLinkingAPI() {
  const testEmail = 'test@example.com';
  const testGoogleData = {
    id: 'google-test-id',
    name: 'Test User',
    email: testEmail,
    image: 'https://example.com/image.jpg'
  };

  console.log('Testing Account Linking API...');

  try {
    // Test 1: Check account linking
    console.log('1. Testing account linking check...');
    const checkResponse = await fetch('/api/account-linking/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: testEmail, 
        googleData: testGoogleData 
      }),
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      console.log('✅ Account linking check successful:', checkData);
    } else {
      const checkError = await checkResponse.json();
      console.log('❌ Account linking check failed:', checkError);
    }

    // Test 2: Test OTP verification with invalid OTP
    console.log('2. Testing OTP verification...');
    const otpResponse = await fetch('/api/account-linking/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: testEmail, 
        otp: '123456' 
      }),
    });

    if (otpResponse.ok) {
      const otpData = await otpResponse.json();
      console.log('✅ OTP verification response:', otpData);
    } else {
      const otpError = await otpResponse.json();
      console.log('⚠️ OTP verification failed (expected):', otpError);
    }

    console.log('Account linking API tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAccountLinkingAPI();