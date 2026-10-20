import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import pino from 'pino'

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ['ريو-بوت', 'Chrome', '1.0']
  })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) startBot()
    } else if (connection === 'open') {
      console.log('✅ بوت ريو اشتغل!')
    }
  })
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    const from = msg.key.remoteJid
    if (text === '.الاوامر' || text === '.منيو') {
      await sock.sendMessage(from, { text: `*🤖 أوامر بوت ريو:*\n\n.الكل - منشن للكل\n.ترحيب - رسالة ترحيب\n.قوانين - قوانين القروب\n.منيو - عرض الأوامر\n.ريو - معلومات البوت` })
    }
    if (text === '.الكل' || text === '.منشن') {
      const groupMetadata = await sock.groupMetadata(from).catch(() => null)
      if (groupMetadata) {
        const participants = groupMetadata.participants.map(p => p.id)
        await sock.sendMessage(from, { text: '📢 *منشن للجميع:*\n\n' + groupMetadata.participants.map(p => `@${p.id.split('@')[0]}`).join(' '), mentions: participants })
      }
    }
    if (text === '.ترحيب') {
      await sock.sendMessage(from, { text: '👋 هلا والله نورت القروب!\n\nأنا بوت ريو 🤖' })
    }
    if (text === '.ريو') {
      await sock.sendMessage(from, { text: '🤖 أنا ريو بوت - صنع بحب في اليمن 🇾🇪' })
    }
  })
}
startBot()
