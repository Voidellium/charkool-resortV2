// Test script to manually create an audit record
import { recordAudit } from './src/lib/audit.js';

async function testAudit() {
  try {
    console.log('Testing audit record creation...');
    
    const result = await recordAudit({
      actorId: 1,
      actorName: 'Test User',
      actorRole: 'SUPERADMIN',
      action: 'CREATE',
      entity: 'Test',
      entityId: '123',
      details: JSON.stringify({
        summary: 'Test audit record created',
        after: { testField: 'test value' }
      })
    });
    
    console.log('Audit record created successfully:', result);
  } catch (error) {
    console.error('Error creating audit record:', error);
  }
}

testAudit();