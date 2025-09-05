const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const crypto = require('crypto');
const app = express();
const port = 3000;

// Memuat variabel lingkungan dari file .env
dotenv.config();

// Menggunakan middleware untuk mem-parsing body JSON
app.use(express.json());

// Token BotFather kamu
const BOT_TOKEN = process.env.BOT_TOKEN;

// Token provider pembayaran (untuk saat ini bisa diisi string kosong, nanti kita ganti)
const PAYMENT_PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN;

// Endpoint untuk Mini App membuat invoice
app.post('/createInvoice', async (req, res) => {
    try {
        const { amount, currency, description } = req.body;
        const payload = crypto.randomUUID(); // Payload unik untuk melacak transaksi
        const invoiceTitle = "Penukaran Crypto ke Rupiah";

        if (!BOT_TOKEN) {
            return res.status(500).json({ error: 'Bot token tidak ditemukan.' });
        }

        const url = `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`;
        const response = await axios.post(url, {
            title: invoiceTitle,
            description: description,
            payload: payload,
            provider_token: PAYMENT_PROVIDER_TOKEN,
            currency: currency,
            prices: [{ label: 'Jumlah', amount: amount }]
        });
        
        const invoiceUrl = response.data.result;
        res.json({ invoiceUrl });

    } catch (error) {
        console.error('Error saat membuat invoice:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Gagal membuat invoice.' });
    }
});

// Endpoint untuk menerima notifikasi pembayaran (webhook)
app.post('/webhook', (req, res) => {
    const update = req.body;
    
    // Periksa apakah ini adalah callback dari pembayaran
    if (update.pre_checkout_query) {
        // Ini adalah pra-cek sebelum pembayaran, kirim OK ke Telegram
        res.json({ ok: true });
    } else if (update.shipping_query) {
        // Kita tidak menangani pengiriman, jadi kirim OK
        res.json({ ok: true });
    } else if (update.successful_payment) {
        // Pembayaran berhasil! Ini adalah inti dari sistem kita.
        const payment = update.successful_payment;
        console.log('Pembayaran berhasil! Detail:', payment);
        
        // Di sini kamu akan menambahkan logika untuk mengirim Rupiah ke rekening pengguna
        // ... Logika untuk transfer uang ...

        // Kirim respons sukses ke Telegram
        res.status(200).send('OK');
    } else {
        // Jika bukan webhook pembayaran, tetap kirim OK
        res.status(200).send('OK');
    }
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
