const midtransClient = require('midtrans-client');

const snap = new midtransClient.Snap({
  isProduction: false, // ganti true kalau sudah live
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

module.exports = async function handler(req, res) {
  // Allow CORS dari frontend kamu
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { order_id, gross_amount, item_name, username, gamepass_id, robux } = req.body;

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
          name: item_name, // contoh: "Top Up 800 Robux"
        },
      ],
      customer_details: {
        first_name: username || 'Player',
        notes: `Gamepass ID: ${gamepass_id} | Robux: ${robux}`,
      },
      callbacks: {
        finish: 'https://your-store.com/finish', // ← ganti URL redirect setelah bayar
      },
    };

    const transaction = await snap.createTransaction(parameter);

    return res.status(200).json({
      snap_token: transaction.token,
      redirect_url: transaction.redirect_url,
    });

  } catch (err) {
    console.error('Midtrans error:', err);
    return res.status(500).json({ error: 'Gagal membuat transaksi', detail: err.message });
  }
};
