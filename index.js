const fs = require('fs');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@adiwajshing/baileys');
const { gTTS } = require('gtts');

const CONFIG_PATH = './bot-config.json';

// In-memory game state for tic-tac-toe
const tttGames = new Map();

async function start() {
  const config = loadConfig();
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    version
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    console.log('connection update:', connection);
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
      console.log('closed connection, reconnecting?', shouldReconnect);
      if (shouldReconnect) start().catch(() => {});
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    try {
      for (const msg of m.messages) {
        if (!msg.message || msg.key?.remoteJid === 'status@broadcast') continue;
        await handleMessage(sock, msg, config, sock);
      }
    } catch (e) {
      console.error('messages.upsert error', e);
    }
  });

  console.log('Bot started. Scan QR if prompted.');
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    const defaults = {
      autoread: true,
      autoreact: true,
      reactEmoji: '👍',
      autoviewstatus: false,
      groupMenuEnabled: true
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaults, null, 2));
    return defaults;
  }
}

async function saveConfig(newConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
}

async function handleMessage(sock, msg, config) {
  const jid = msg.key.remoteJid;
  const from = jid;
  const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || '';

  if (config.autoread) {
    try { await sock.sendReadReceipt(from, msg.key.participant || from, [msg.key.id]); } catch (e) {}
  }

  if (config.autoreact) {
    try { await sock.sendMessage(from, { react: { text: config.reactEmoji || '👍', key: msg.key } }); } catch (e) {}
  }

  if (config.autoviewstatus) {
    try { await sock.presenceSubscribe(from); } catch (e) {}
  }

  const trimmed = text.trim();
  if (!trimmed) return;

  if (trimmed === '!menu' || trimmed === '/menu') {
    const menu = `*WhatsApp Bot Menu*\n\n*Author:* ${config.authorName} (${config.authorPhone})\n\n*Features:*\n- autoread: ${config.autoread}\n- autoreact: ${config.autoreact}\n- autoviewstatus: ${config.autoviewstatus}\n\n*Commands:*\n!menu or /menu - show this menu\n!toggle <feature> on|off - toggle features (autoread, autoreact, autoviewstatus)\n!group add <phone> - add a participant to this group (bot must be admin)\n!group promote <@jid> - promote a user to admin (group only)\n!group demote <@jid> - demote a user from admin (group only)\n!ttt - start tic-tac-toe\n!move <1-9> - make a move in tic-tac-toe`;

    // Send audio TTS for the menu
    try {
      const tts = new gTTS(`Hello! Here's the bot menu. ${config.authorName} welcomes you. Check the chat for commands.`);
      const tmpFile = `./menu-tts-${Date.now()}.mp3`;
      await new Promise((res, rej) => tts.save(tmpFile, (err) => err ? rej(err) : res()));
      await sock.sendMessage(from, { audio: fs.createReadStream(tmpFile), mimetype: 'audio/mpeg', ptt: true });
      fs.unlinkSync(tmpFile);
    } catch (e) {
      console.error('TTS error', e);
    }

    await sock.sendMessage(from, { text: menu });
    return;
  }

  // Tic-tac-toe commands
  if (trimmed === '!ttt') {
    if (tttGames.has(from)) {
      await sock.sendMessage(from, { text: 'A game is already in progress in this chat.' });
      return;
    }
    const board = Array(9).fill(' ');
    const game = { board, turn: 'X' };
    tttGames.set(from, game);
    await sock.sendMessage(from, { text: 'Tic-Tac-Toe started! You are X. Make a move with `!move 1` to `!move 9`.' });
    await sock.sendMessage(from, { text: renderBoard(board) });
    return;
  }

  if (trimmed.startsWith('!move')) {
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return;
    const pos = parseInt(parts[1], 10) - 1;
    if (!tttGames.has(from)) {
      await sock.sendMessage(from, { text: 'No TTT game in this chat. Start one with `!ttt`.' });
      return;
    }
    const game = tttGames.get(from);
    if (pos < 0 || pos > 8) {
      await sock.sendMessage(from, { text: 'Invalid move. Use numbers 1-9.' });
      return;
    }
    if (game.board[pos] !== ' ') {
      await sock.sendMessage(from, { text: 'Cell already taken.' });
      return;
    }
    game.board[pos] = game.turn;
    // check win
    const winner = checkWinner(game.board);
    if (winner) {
      await sock.sendMessage(from, { text: renderBoard(game.board) });
      await sock.sendMessage(from, { text: `Game over! ${winner} wins.` });
      tttGames.delete(from);
      return;
    }
    if (!game.board.includes(' ')) {
      await sock.sendMessage(from, { text: renderBoard(game.board) });
      await sock.sendMessage(from, { text: `Draw!` });
      tttGames.delete(from);
      return;
    }
    game.turn = game.turn === 'X' ? 'O' : 'X';
    await sock.sendMessage(from, { text: renderBoard(game.board) });
    return;
  }

  if (trimmed.startsWith('!toggle ')) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3) {
      const feature = parts[1];
      const value = parts[2].toLowerCase();
      const cfg = loadConfig();
      if (cfg.hasOwnProperty(feature)) {
        cfg[feature] = value === 'on' || value === 'true';
        await saveConfig(cfg);
        await sock.sendMessage(from, { text: `Feature ${feature} set to ${cfg[feature]}` });
      } else {
        await sock.sendMessage(from, { text: `Unknown feature: ${feature}` });
      }
    }
    return;
  }

  function renderBoard(b) {
    return `\n${b[0]} | ${b[1]} | ${b[2]}\n---------\n${b[3]} | ${b[4]} | ${b[5]}\n---------\n${b[6]} | ${b[7]} | ${b[8]}\n`;
  }

  function checkWinner(b) {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const [a,c,d] of lines) {
      if (b[a] !== ' ' && b[a] === b[c] && b[c] === b[d]) return b[a];
    }
    return null;
  }

  // Group management helpers
  async function groupAdd(sock, groupJid, phone) {
    try {
      const id = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      await sock.groupAdd(groupJid, [id]);
      return true;
    } catch (e) {
      console.error('groupAdd error', e);
      return false;
    }
  }


  if (trimmed.startsWith('!group ')) {
    const parts = trimmed.split(/\s+/);
    const action = parts[1];
    if (!from.endsWith('@g.us')) {
      await sock.sendMessage(from, { text: 'Group commands must be run from a group chat.' });
      return;
    }
    if (action === 'add' && parts.length >= 3) {
      const phone = parts[2];
      const ok = await groupAdd(sock, from, phone);
      if (ok) await sock.sendMessage(from, { text: `Attempted to add ${phone}. If the bot is admin the user will be added.` });
      else await sock.sendMessage(from, { text: `Failed to add ${phone}. Ensure the bot is group admin and the number is correct.` });
      return;
    }
    if ((action === 'promote' || action === 'demote') && parts.length >= 3) {
      const phone = parts[2];
      const id = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      try {
        const mode = action === 'promote' ? 'promote' : 'demote';
        await sock.groupParticipantsUpdate(from, [id], mode);
        await sock.sendMessage(from, { text: `${action} request processed for ${phone}` });
      } catch (e) {
        console.error('group participants update error', e);
        await sock.sendMessage(from, { text: `Failed to ${action} ${phone}.` });
      }
      return;
    }
    await sock.sendMessage(from, { text: 'Usage: !group add <phone> | !group promote <phone> | !group demote <phone>' });
    return;
  }
}

start().catch(err => console.error(err));
