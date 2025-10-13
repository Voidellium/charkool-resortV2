import { recordAudit } from './src/lib/audit.js';

console.log('Creating test audit record...');

recordAudit({
  actorId: 999,
  actorName: 'Test User NOW',
  actorRole: 'SUPERADMIN',
  action: 'CREATE', 
  entity: 'TestRecord',
  entityId: '999',
  details: JSON.stringify({
    summary: 'Test record created at ' + new Date().toLocaleString(),
    after: { testField: 'This is a NEW test record' }
  })
}).then(result => {
  console.log('✅ Test audit record created:', result.id);
  console.log('   Actor:', result.actorName);
  console.log('   Time:', result.timestamp);
}).catch(error => {
  console.error('❌ Error:', error);
});