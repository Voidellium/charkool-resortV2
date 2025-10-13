#!/usr/bin/env node

// Simple test to add an audit record and verify it appears
const { recordAudit } = require('./src/lib/audit.js');

async function testAuditSystem() {
  console.log('🧪 Testing Audit System...\n');
  
  try {
    // Create a test audit record
    const testRecord = await recordAudit({
      actorId: 1,
      actorName: 'Test User',
      actorRole: 'SUPERADMIN', 
      action: 'CREATE',
      entity: 'Test',
      entityId: '12345',
      details: JSON.stringify({
        summary: 'Testing audit system functionality',
        after: {
          timestamp: new Date().toISOString(),
          testField: 'This is a test audit entry'
        }
      })
    });
    
    console.log('✅ Audit record created successfully!');
    console.log('📝 Record details:', {
      id: testRecord.id,
      actorName: testRecord.actorName,
      action: testRecord.action,
      entity: testRecord.entity,
      timestamp: testRecord.timestamp
    });
    
    // Check if it was written to fallback file
    const fs = require('fs').promises;
    const fallbackFile = require('path').join(process.cwd(), 'data', 'audit-fallback.json');
    
    try {
      const data = await fs.readFile(fallbackFile, 'utf8');
      const records = JSON.parse(data);
      const latestRecord = records[0];
      
      console.log('\n📄 Latest record in fallback file:');
      console.log('   Actor:', latestRecord.actorName);
      console.log('   Action:', latestRecord.action, latestRecord.entity);
      console.log('   Time:', latestRecord.timestamp);
      
      if (latestRecord.id === testRecord.id) {
        console.log('\n🎉 SUCCESS: Audit system is working correctly!');
      } else {
        console.log('\n⚠️  WARNING: Test record not found as latest entry');
      }
      
    } catch (fileErr) {
      console.log('\n⚠️  Could not read fallback file:', fileErr.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing audit system:', error);
  }
}

// Run the test
testAuditSystem();