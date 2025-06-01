const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const moment = require('moment-timezone');

// === Setup web server agar Railway gak tidur ===
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('✅ Bot LapakinYa is alive!'));
app.listen(port, () => console.log(`🌐 Web server active on port ${port}`));

// === Auto ping ke server Railway sendiri tiap 5 menit ===
const selfURL = 'https://NAMA-APP-RAILWAY.up.railway.app'; // Ganti ini
setInterval(() => {
  fetch(selfURL).then(() => console.log('🔁 Self-ping')).catch(console.error);
}, 5 * 60 * 1000);

// === Bot WhatsApp ===
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }
});

const produk = JSON.parse(fs.readFileSync('./produk.json', 'utf8'));
const qrisMedia = MessageMedia.fromFilePath('./media/qris.jpg');
const grupTarget = "LapakinYa";
const grupLink = "https://chat.whatsapp.com/LZHOUhCJWeo5jmjY0gieR8";
const adminNumber = "6289520145125@c.us"; // Nomor admin WA (tanpa +)

function isJamTutup() {
  const now = moment().tz('Asia/Jakarta');
  const jam = now.hour();
  const menit = now.minute();
  return (jam >= 21 || jam < 8 || (jam === 12 && menit < 60));
}

client.on('ready', () => {
  console.log('✅ Bot LapakinYa aktif!');
});

client.on('message_create', async msg => {
  const chat = await msg.getChat();
  const pesan = msg.body.toLowerCase();
  const sender = msg.from;

  if (pesan === "list") {
    const daftar = Object.keys(produk).map((item, i) => `${i + 1}. ${item}`).join("\n");
    return msg.reply(`📦 *Daftar Produk:*\n${daftar}\n\nKetik nama produk untuk lihat detail.`);
  }

  if (produk[pesan]) {
    const now = moment().tz('Asia/Jakarta');
    const tanggal = now.format("DD MMMM YYYY");
    const jam = now.format("HH:mm:ss");
    client.sendMessage(adminNumber, `📥 *ORDER MASUK:*\nProduk: ${pesan}\nDari: ${sender}\nWaktu: ${tanggal} ${jam}`);
    return msg.reply(`🛒 ANDA BELI – KAMI HAPPY\n\n🕒 TRANSAKSI PENDING\n📅 ${tanggal}\n⏰ ${jam} WIB\n📦 PESANAN: ${pesan}\n\nWait yaa kak, admin LapakinYa sedang proses pesanan kamu 🙏`);
  }

  if (pesan === "payment" || pesan === "bayar") {
    return msg.reply(qrisMedia, undefined, {
      caption: `💰 *Pembayaran via QRIS*\n\nSilakan scan QR di atas. Setelah transfer, kirim bukti ya.`
    });
  }

  if (pesan === "gabung" || pesan === "invite") {
    return msg.reply(`🔗 Silakan bergabung ke grup *LapakinYa*:\n${grupLink}`);
  }

  if (pesan.startsWith("done ")) {
    const item = pesan.replace("done ", "").trim();
    const now = moment().tz('Asia/Jakarta');
    const tanggal = now.format("dddd, DD - MMMM - YYYY");
    const jam = now.format("HH:mm:ss");
    if (produk[item]) {
      return msg.reply(`『 TRANSAKSI BERHASIL 』\n📅 TANGGAL: ${tanggal}\n⏰ JAM: ${jam}\n📦 PESANAN: ${item}\n✨ STATUS: Berhasil\n\nTerimakasih, Next Order ya 🙏`);
    }
  }

  if (chat.isGroup && chat.name === grupTarget && msg.hasMedia && msg.type === 'image') {
    chat.sendMessage(`✅ Bukti pembayaran diterima!\n🕒 *LapakinYa* sedang proses pesanan kamu. Tunggu sebentar ya kak 🙏`);
    client.sendMessage(adminNumber, `📸 *BUKTI BAYAR MASUK DI GRUP*\nDari: ${sender}\nPesan: ${msg.body || "(tanpa teks)"}`);
  }

  if (chat.isGroup && chat.name === grupTarget) {
    if (isJamTutup() && !chat.isReadOnly) {
      await chat.sendMessage("⛔ Grup *LapakinYa* ditutup sementara (di luar jam layanan).");
      await chat.setMessagesAdminsOnly(true);
    } else if (!isJamTutup() && chat.isReadOnly) {
      await chat.sendMessage("✅ Grup *LapakinYa* dibuka kembali. Silakan berdiskusi atau order 😊");
      await chat.setMessagesAdminsOnly(false);
    }
  }
});

client.on('group_join', async notification => {
  const chat = await notification.getChat();
  if (chat.name !== grupTarget) return;
  const contact = await notification.getContact();
  const nama = contact.pushname || contact.number;
  chat.sendMessage(`👋 Selamat datang, *${nama}* di grup *LapakinYa*!\nKetik *list* untuk lihat produk digital kami ya 😊`);
});

client.initialize();
