const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const crypto = require('crypto');

// Memuat variabel lingkungan dari file .env (hanya untuk pengembangan lokal)
// Di Vercel, variabel ini akan diatur di dashboard
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Menggunakan middleware untuk mem-parsing body JSON
app.use(express.json());

// Token BotFather kamu dan token penyedia pembayaran
const BOT_TOKEN = process.env.BOT_TOKEN;
const PAYMENT_PROVIDER_TOKEN = process.env.PAYMENT_PROVIDER_TOKEN;

// Endpoint root untuk mengecek status server
app.get('/', (req, res) => {
    res.status(200).send('Server berjalan dengan sukses.');
});

// Endpoint untuk Mini App membuat invoice
app.post('/createInvoice', async (req, res) => {
    try {
        const { amount, currency, description, bankDetails } = req.body;
        
        // Payload unik untuk melacak transaksi.
        // Kita gabungkan dengan bankDetails agar mudah dilacak saat webhook diterima.
        const payload = crypto.randomUUID();
        const invoicePayload = JSON.stringify({
            uuid: payload,
            bankDetails: bankDetails
        });
        
        const invoiceTitle = "Penukaran Crypto ke Rupiah";

        if (!BOT_TOKEN) {
            return res.status(500).json({ error: 'Bot token tidak ditemukan.' });
        }

        // URL API untuk membuat invoice
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`;
        
        // Data yang dikirim ke Telegram
        const telegramPayload = {
            title: invoiceTitle,
            description: description,
            payload: invoicePayload, // Menggunakan payload yang lebih rinci
            provider_token: PAYMENT_PROVIDER_TOKEN,
            currency: currency,
            prices: [{ label: 'Jumlah', amount: amount }]
        };

        const response = await axios.post(url, telegramPayload);
        
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
    
    if (update.message && update.message.successful_payment) {
        // Pembayaran berhasil! Ini adalah inti dari sistem kita.
        const payment = update.message.successful_payment;
        const invoicePayload = JSON.parse(payment.invoice_payload);
        
        console.log('Pembayaran berhasil! Detail:', payment);
        console.log('Nomor Rekening:', invoicePayload.bankDetails.accountNumber);
        console.log('Nama Pemilik:', invoicePayload.bankDetails.accountName);
        console.log('Nama Bank:', invoicePayload.bankDetails.bankName);
        
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
