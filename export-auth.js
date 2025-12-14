const fs = require('fs');
const AUTH_FILE = './v1_auth.json';
try {
  const data = fs.readFileSync(AUTH_FILE, 'utf8');
  const b64 = Buffer.from(data, 'utf8').toString('base64');
  console.log(b64);
} catch (e) { console.error('No auth file found or read error:', e.message); process.exit(1); }
