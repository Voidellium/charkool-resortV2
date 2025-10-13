// Quick test to check if AmenityInventory data exists
const fetch = require('node-fetch');

async function testAPI() {
  try {
    // Test the actual API endpoint
    const response = await fetch('http://localhost:3000/api/amenities/inventory');
    
    if (!response.ok) {
      console.log('❌ API error:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('📦 API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.length === 0) {
      console.log('\n❌ No amenity data returned from API!');
    } else {
      console.log('\n✅ Amenity data found:');
      data.forEach(item => {
        console.log(`${item.name}: ${item.quantity} in stock`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testAPI();