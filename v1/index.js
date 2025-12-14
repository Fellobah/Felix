const fs = require('fs');
const pino = require('pino');
const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion } = require('@adiwajshing/baileys');

const AUTH_FILE = './v1_auth.json';

// If AUTH_STATE env var is present (base64), use it to populate auth file before starting.
if (process.env.AUTH_STATE) {
  try {
    const raw = Buffer.from(process.env.AUTH_STATE, 'base64').toString('utf8');
    fs.writeFileSync(AUTH_FILE, raw);
    console.log('Wrote auth from AUTH_STATE env var to', AUTH_FILE);
  } catch (e) { console.error('Failed to parse AUTH_STATE', e); }
}

async function start() {
  const { state, saveCreds } = await useSingleFileAuthState(AUTH_FILE);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    version
  });

  sock.ev.on('creds.update', async () => {
    try { await saveCreds(); } catch (e) {}
    try {
      // after saving, print base64 so users can set it as AUTH_STATE on Heroku/Render
      const data = fs.readFileSync(AUTH_FILE, 'utf8');
      const b64 = Buffer.from(data, 'utf8').toString('base64');
      console.log('\n=== AUTH_STATE_BASE64 START ===');
      console.log(b64);
      console.log('=== AUTH_STATE_BASE64 END ===\n');
    } catch (e) { console.error('Failed to export auth file', e); }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    console.log('connection update:', connection);
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
      if (shouldReconnect) start().catch(() => {});
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      for (const msg of m.messages) {
        if (!msg.message || msg.key?.remoteJid === 'status@broadcast') continue;
        // simple echo handler for deployment test
        const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || '';
        if (!text) continue;
        if (text === '!ping') await sock.sendMessage(msg.key.remoteJid, { text: 'pong' });
      }
    } catch (e) { console.error(e); }
  });

  console.log('v1 bot started');
}

start().catch(err => console.error(err));
