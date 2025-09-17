const express = require('express');
const crypto = require('crypto');
const dotenv = require('dotenv');
const app = express();
const port = process.env.PORT || 3000;

// Memuat variabel lingkungan dari file .env
dotenv.config();

app.use(express.json());

// Variabel lingkungan
const TON_WALLET_ADDRESS = process.env.TON_WALLET_ADDRESS; // Alamat TON untuk menerima pembayaran
const BOT_TOKEN = process.env.BOT_TOKEN; // Untuk validasi initData (opsional)

// Fungsi untuk memvalidasi initData dari Telegram
function validateInitData(initData, botToken) {
    const dataCheckString = Object.keys(initData).sort()
        .filter(k => k !== 'hash')
        .map(k => `${k}=${initData[k]}`).join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return hash === initData.hash;
}

// Endpoint root untuk mengecek status server
app.get('/', (req, res) => {
    res.status(200).send('Server berjalan dengan sukses.');
});

// Endpoint untuk membuat transaksi TON
app.post('/api/createInvoice', (req, res) => {
    try {
        const { amount, cryptoAmount, cryptoType, bankDetails, walletAddress, initData } = req.body;

        // Validasi data
        if (!amount || !cryptoAmount || !cryptoType || !bankDetails || !walletAddress) {
            return res.status(400).json({ error: 'Data tidak lengkap' });
        }

        // Validasi initData (opsional, untuk keamanan)
        if (initData && BOT_TOKEN) {
            if (!validateInitData(JSON.parse(initData), BOT_TOKEN)) {
                return res.status(401).json({ error: 'Invalid initData' });
            }
        }

        // Payload unik untuk melacak transaksi
        const payload = crypto.randomUUID();

        // Simpan detail transaksi (opsional, bisa ke database seperti MongoDB)
        const transaction = {
            address: TON_WALLET_ADDRESS, // Alamat TON untuk menerima pembayaran
            amount: cryptoAmount,
            idrAmount: amount,
            cryptoType,
            bankDetails,
            walletAddress,
            payload,
            createdAt: new Date()
        };

        console.log('Transaksi yang dibuat:', transaction);

        // Kembalikan alamat wallet tujuan untuk transaksi TON
        res.status(200).json({ transaction });
    } catch (error) {
        console.error('Error saat membuat transaksi:', error.message);
        res.status(500).json({ error: 'Gagal membuat transaksi.' });
    }
});

// Hapus atau ubah endpoint webhook (opsional)
// Jika ingin memverifikasi transaksi di blockchain TON, tambahkan logika di bawah
/*
app.post('/webhook', (req, res) => {
    const update = req.body;
    // Logika untuk memverifikasi transaksi TON di blockchain (membutuhkan API seperti Toncenter)
    console.log('Webhook diterima:', update);
    res.status(200).send('OK');
});
*/

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});

module.exports = app; // Untuk Vercel