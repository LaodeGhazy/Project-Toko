const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const pool = new Pool({
    connectionString: 'postgresql://postgres:781877@db.mobjwjgyspiwnvhsunvx.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});


app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Kantor.html'));
});

app.post('/update-stock', async (req, res) => {
    const { kodeBarang, namaBarang, warna, quantity, ukuran, harga } = req.body;

    try {
        const check = await pool.query(
            'SELECT * FROM stock WHERE kode_barang = $1 AND LOWER(warna) = LOWER($2) AND ukuran = $3',
            [kodeBarang, warna, ukuran]
        );
        

        if (check.rows.length > 0) {
            // Jika warna dan ukuran sudah ada, update quantity di stock
            await pool.query(
                'UPDATE stock SET quantity = quantity + $1, tanggal = CURRENT_DATE WHERE kode_barang = $2 AND LOWER(warna) = LOWER($3) AND ukuran = $4',
                [quantity, kodeBarang, warna, ukuran]
            );
            
            
        } else {
            // Jika ukuran berbeda, tambahkan row baru
            await pool.query(
                `INSERT INTO stock (kode_barang, nama_barang, warna, quantity, ukuran, harga, tanggal) 
                 VALUES ($1, $2, LOWER($3), $4, $5, $6, CURRENT_DATE)`,
                [kodeBarang, namaBarang, warna, quantity, ukuran, harga]
            );
            
            
        }

        // Simpan ke history_stock
        await pool.query(
            `INSERT INTO history_stock (kode_barang, nama_barang, warna, quantity, ukuran, harga, tanggal) 
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)`,
            [kodeBarang, namaBarang, warna, quantity, ukuran, harga]
        );

        res.status(200).json({ message: 'Stock updated successfully' });
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/get-history-stock', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT   id_history, kode_barang, nama_barang, warna, quantity, ukuran, harga, 
            TO_CHAR(tanggal, 'DD-MM-YYYY') AS tanggal FROM history_stock ORDER BY tanggal DESC`
        );        
        
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post("/deleteStock", async (req, res) => {
    console.log("Request Body:", req.body); // Cek isi request body

    const { id_history, kodeBarang } = req.body; // Sesuaikan dengan nama dari request

    if (!id_history || kodeBarang === "undefined") {
        return res.status(400).json({ message: "id_history atau kodeBarang tidak valid!" });
    }

    try {
        const historyResult = await pool.query(
            "SELECT quantity FROM history_stock WHERE id_history = $1", 
            [id_history]
        );

        if (historyResult.rows.length === 0) {
            return res.status(404).json({ message: "Data tidak ditemukan di history_stock!" });
        }

        const quantityToDeduct = historyResult.rows[0].quantity;

        // Hapus data dari history_stock berdasarkan id_history
        const deleteResult = await pool.query(
            "DELETE FROM history_stock WHERE id_history = $1 RETURNING *", 
            [id_history]
        );

        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ message: "Data tidak ditemukan di history_stock!" });
        }

        // Kurangi quantity di tabel stock sesuai dengan quantity dari history_stock
        await pool.query(
            "UPDATE stock SET quantity = quantity - $1 WHERE kode_barang = $2", 
            [quantityToDeduct, kodeBarang]
        );

        res.json({ message: "Data berhasil dihapus dan stok diperbarui!", quantityDeducted: quantityToDeduct });

    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ message: "Gagal menghapus data!" });
    }
});




app.get('/get-barang', async (req, res) => {
    const { kodeBarang } = req.query;
    try {
        const result = await pool.query(
            'SELECT DISTINCT nama_barang, harga FROM stock WHERE kode_barang = $1 LIMIT 1',
            [kodeBarang]
        );

        if (result.rows.length > 0) {
            res.status(200).json(result.rows[0]);
        } else {
            res.status(404).json({ error: "Barang tidak ditemukan" });
        }
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/get-stock', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT kode_barang, nama_barang, warna, quantity, ukuran, harga, 
            TO_CHAR(tanggal, 'DD-MM-YYYY') AS tanggal FROM stock`
        );
        
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});
app.get('/get-stock-summary', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT kode_barang, nama_barang, SUM(quantity) AS total_stok
            FROM stock
            GROUP BY kode_barang, nama_barang
            ORDER BY kode_barang;
        `);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/get-kasir', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM penjualan p, detail_penjualan dp where p.id = dp.id_penjualan ');
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/get-warna', async (req, res) => {
    const { kodeBarang } = req.query;
    try {
        const result = await pool.query(
            'SELECT DISTINCT warna FROM stock WHERE kode_barang = $1',
            [kodeBarang]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/add-to-cart', async (req, res) => {
    const { kodeBarang, warna, quantity } = req.body;
    try {
        const result = await pool.query(
            'SELECT nama_barang, harga, ukuran FROM stock WHERE kode_barang = $1 AND warna = $2',
            [kodeBarang, warna]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Barang tidak ditemukan!" });
        }

        res.status(200).json(result.rows[0]); // 🔹 Pastikan mengembalikan `ukuran`
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Terjadi kesalahan di server" });
    }
});

app.post('/checkout', async (req, res) => {
    const { cart, pembayaran, metodePembayaran, dpAmount } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let totalPembayaran = 0;
        cart.forEach(item => {
            let harga = parseFloat(item.hargaSatuan) || 0;
            let diskon = parseFloat(item.diskon) || 0;
            let totalHarga = harga * item.quantity;
            let hargaSetelahDiskon = totalHarga - (totalHarga * (diskon / 100));
            totalPembayaran += hargaSetelahDiskon;
        });

        let pembayaranAwal = pembayaran === 'DP' ? parseFloat(dpAmount) || 0 : totalPembayaran;

        // 🔹 Simpan total_harga (harga asli sebelum DP) hanya di tabel `penjualan`
        const penjualanResult = await client.query(
            `INSERT INTO penjualan (tanggal, pembayaran, total_pembayaran, metode_pembayaran, total_harga) 
             VALUES (CURRENT_DATE, $1, $2, $3, $4) RETURNING id`,
            [pembayaran, pembayaranAwal, metodePembayaran, totalPembayaran] // total_harga tetap harga asli
        );

        const idPenjualan = penjualanResult.rows[0].id;

        for (const item of cart) {
            let hargaAsli = parseFloat(item.hargaSatuan) || 0; // 🔹 Harga satuan tanpa DP
            let hargaSetelahDiskon = hargaAsli - (hargaAsli * (parseFloat(item.diskon) / 100)); // 🔹 Harga satuan setelah diskon
            let totalHarga = hargaSetelahDiskon * item.quantity; // 🔹 Perhitungan total harga sudah benar

            await client.query(
                `INSERT INTO detail_penjualan (id_penjualan, kode_barang, nama_barang, warna, ukuran, quantity, harga, diskon, tanggal, metode_pembayaran, pembayaran, total_harga) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9, $10, $11)`,
                [idPenjualan, item.kodeBarang, item.namaBarang || "Unknown", item.warna, item.ukuran || "Unknown", item.quantity, 
                 hargaSetelahDiskon, item.diskon, metodePembayaran, pembayaran, totalHarga] // 🔹 Ukuran tetap tersimpan & total harga benar
            );
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Checkout successful', id_penjualan: idPenjualan });
    } catch (err) {
        await client.query('ROLLBACK');
        console.log(err);
        res.status(500).json({ error: 'Checkout failed' });
    } finally {
        client.release();
    }
});

app.get('/get-transaction-details/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`📝 Mengambil detail transaksi untuk ID: ${id}`); // ✅ Debugging

    try {
        const transaksiResult = await pool.query(
            `SELECT id, pembayaran, total_pembayaran, 
            TO_CHAR(tanggal, 'DD-MM-YYYY') AS tanggal FROM penjualan WHERE id = $1`, 
            [id]
        );
        

        if (transaksiResult.rows.length === 0) {
            console.error("❌ Transaksi tidak ditemukan!");
            return res.status(404).json({ error: "Transaksi tidak ditemukan" });
        }

        const itemsResult = await pool.query(
            `SELECT kode_barang, nama_barang, warna, quantity, harga 
             FROM detail_penjualan 
             WHERE id_penjualan = $1`, [id]
        );

        console.log(`✅ Data transaksi:`, transaksiResult.rows[0]);
        console.log(`✅ Data detail_penjualan:`, itemsResult.rows); // ✅ Debugging

        res.status(200).json({
            id: transaksiResult.rows[0].id,
            tanggal: transaksiResult.rows[0].tanggal,
            pembayaran: transaksiResult.rows[0].pembayaran,
            total_pembayaran: transaksiResult.rows[0].total_pembayaran,
            items: itemsResult.rows.length > 0 ? itemsResult.rows : []
        });
    } catch (error) {
        console.error("❌ Error mengambil detail transaksi:", error);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

app.post('/process-lunas/:id', async (req, res) => {
    const id = req.params.id;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // ✅ Ambil transaksi utama
        const transaksi = await client.query("SELECT * FROM penjualan WHERE id = $1", [id]);
        
        if (transaksi.rows.length === 0) {
            return res.status(404).json({ error: "Transaksi tidak ditemukan." });
        }

        // ✅ Ambil detail barang
        const items = await client.query(
            "SELECT * FROM detail_penjualan WHERE id_penjualan = $1",
            [id]
        );

        if (items.rows.length === 0) {
            return res.status(404).json({ error: "Detail transaksi tidak ditemukan." });
        }

        // ✅ Update status transaksi menjadi "Lunas"
        await client.query(
            "UPDATE penjualan SET pembayaran = 'Lunas' WHERE id = $1",
            [id]
        );

        // ✅ Kurangi stok barang
        for (const item of items.rows) {
            await client.query(
                "UPDATE stock SET quantity = quantity - $1 WHERE kode_barang = $2 AND warna = $3",
                [item.quantity, item.kode_barang, item.warna]
            );
        }

        await client.query('COMMIT');

        res.status(200).json({
            message: "Transaksi berhasil dilunasi",
            transaksi: transaksi.rows[0],
            items: items.rows
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Error di Backend:", err);
        res.status(500).json({ error: "Terjadi kesalahan di server" });
    } finally {
        client.release();
    }
});

app.get('/get-ukuran', async (req, res) => {
    const { kodeBarang } = req.query;
    
    if (!kodeBarang) {
        return res.status(400).json({ error: "Kode barang diperlukan" });
    }

    try {
        const result = await pool.query(
            "SELECT DISTINCT ukuran FROM stock WHERE kode_barang = $1 ORDER BY ukuran", 
            [kodeBarang]
        );

        if (result.rows.length === 0) {
            return res.json([]); // Jika tidak ada ukuran, kirim array kosong
        }

        res.json(result.rows); // Kirim daftar ukuran ke frontend
    } catch (error) {
        console.error("Gagal mengambil ukuran:", error);
        res.status(500).json({ error: "Terjadi kesalahan saat mengambil data ukuran" });
    }
});


app.get('/get-pending', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM penjualan WHERE pembayaran = 'DP'");
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/delete-pending/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM detail_penjualan WHERE id_penjualan = $1", [id]);
        await pool.query("DELETE FROM penjualan WHERE id = $1", [id]);
        res.status(200).json({ message: 'Transaksi pending berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ error: 'Gagal menghapus transaksi' });
    }
});


app.post('/clear-database', async (req, res) => {
    try {
        // await pool.query('DELETE FROM stock');
        await pool.query('DELETE FROM history_stock');
        await pool.query('DELETE FROM detail_penjualan');
        await pool.query('DELETE FROM penjualan');
        res.status(200).json({ message: 'Semua data telah dihapus!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});