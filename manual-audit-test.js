// Test POST to audit-trails API
const testAuditPost = {
  actorId: 999,
  actorName: 'Manual Test User',
  actorRole: 'SUPERADMIN',
  action: 'CREATE',
  entity: 'ManualTest',
  entityId: '999',
  details: JSON.stringify({
    summary: 'Manual test audit record created at ' + new Date().toISOString(),
    after: { manualTest: true, timestamp: new Date() }
  })
};

console.log('Test audit data:', JSON.stringify(testAuditPost, null, 2));