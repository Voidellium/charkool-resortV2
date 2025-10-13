/* Quick test script to POST an audit entry to the local API.
   Usage (PowerShell):
     node .\scripts\test-audit-post.js
*/
const fetch = require('node-fetch');

async function run() {
  const entry = {
    actorId: 9999,
    actorName: 'Script Tester',
    actorRole: 'SUPERADMIN',
    action: 'TEST',
    entity: 'Script',
    entityId: 'script-1',
    details: JSON.stringify({ summary: 'Test entry from script', test: true }),
  };

  try {
    const res = await fetch('http://localhost:3000/api/audit-trails', { method: 'POST', body: JSON.stringify(entry), headers: { 'Content-Type': 'application/json' } });
    const json = await res.json();
    console.log('Response status:', res.status);
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Failed to POST audit', err);
  }
}

run();
