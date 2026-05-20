const midtransClient = require('midtrans-client');

const snap = new midtransClient.Snap({
  isProduction: false, // ganti true kalau sudah live
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(order_id, username, gamepass_id, robux, gross_amount, payment_method) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return;

  const now = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) + ' WIB';

  const text = `🛒 *ORDER TOP UP ROBUX*\n\n` +
    `📋 ID Pesanan: \`${order_id}\`\n` +
    `🕐 Waktu: ${now}\n` +
    `👤 Username Roblox: ${username}\n` +
    `🎮 Gamepass ID: ${gamepass_id}\n` +
    `💎 Paket: ${Number(robux).toLocaleString('id')} Robux\n` +
    `💰 Total: Rp ${Number(gross_amount).toLocaleString('id')}\n` +
    `💳 Pembayaran: ${payment_method}\n` +
    `📌 Status: ⏳ Menunggu Pembayaran`;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'Markdown',
    }),
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { order_id, gross_amount, item_name, username, gamepass_id, robux, payment_method } = req.body;

  if (!order_id || !gross_amount || !item_name) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }

  try {
    const parameter = {
      transaction_details: {
        order_id,
        gross_amount: Number(gross_amount),
      },
      item_details: [
        {
          id: order_id,
          price: Number(gross_amount),
          quantity: 1,
          name: item_name,
        },
      ],
      customer_details: {
        first_name: username || 'Player',
        notes: `Gamepass ID: ${gamepass_id} | Robux: ${robux}`,
      },
      callbacks: {
        finish: 'https://chisatobobaaaa.vercel.app',
      },
    };

    const transaction = await snap.createTransaction(parameter);

    // Kirim notifikasi Telegram (tidak blocking)
    sendTelegram(order_id, username, gamepass_id, robux, gross_amount, payment_method || '-').catch(console.error);

    return res.status(200).json({
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url,
    });

  } catch (err) {
    console.error('Midtrans error:', err);
    return res.status(500).json({ error: 'Gagal membuat transaksi', detail: err.message });
  }
};
