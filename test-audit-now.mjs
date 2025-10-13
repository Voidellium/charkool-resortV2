import { recordAudit } from './src/lib/audit.js';

console.log('Testing audit system...');

recordAudit({
  actorId: 99,
  actorName: 'Test Admin',
  actorRole: 'SUPERADMIN',
  action: 'CREATE',
  entity: 'TestEntity',
  entityId: '999',
  details: JSON.stringify({
    summary: 'Test audit record created at ' + new Date().toISOString(),
    after: { testField: 'This is a test audit record' }
  })
}).then(result => {
  console.log('✅ Audit record created successfully:', result);
}).catch(error => {
  console.error('❌ Error creating audit record:', error);
});