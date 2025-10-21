const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const file = path.resolve(__dirname, '../app/cashier/page.js');
const code = fs.readFileSync(file, 'utf8');

try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx', 'classProperties', 'optionalChaining'] });
  console.log('Parse OK');
} catch (err) {
  console.error('Parse error:', err.message);
  process.exit(1);
}
