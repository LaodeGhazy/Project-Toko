const stockStore = "stock";
const kasirStore = "kasir";
const dbName = "TokoBajuDB";

let cart = [];

function showPage(page) {
    // Sembunyikan semua halaman
    document.getElementById("updateStock").style.display = "none";
    document.getElementById("historyStock").style.display = "none";
    document.getElementById("kasir").style.display = "none";
    document.getElementById("stokPage").style.display = "none";
    document.getElementById("kasirPage").style.display = "none";
    document.getElementById("pendingPage").style.display = "none";
    


    document.getElementById(page).style.display = "block";
}

function formatHarga(input) {
    input.value = input.value.replace(/\D/g, "").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}

function openDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open(dbName, 2);

        request.onupgradeneeded = function(event) {
            let db = event.target.result;

            if (db.objectStoreNames.contains(stockStore)) {
                db.deleteObjectStore(stockStore);
            }

            let stockStoreObj = db.createObjectStore(stockStore, { keyPath: ["kodeBarang", "warna"] });

            if (!db.objectStoreNames.contains(kasirStore)) {
                db.createObjectStore(kasirStore, { autoIncrement: true });
            }
        };

        request.onsuccess = function(event) {
            resolve(event.target.result);
        };

        request.onerror = function(event) {
            reject("Database error: " + event.target.errorCode);
        };
    });
}

async function updateWarnaDropdown() {
    const kode = document.getElementById("kodeInput").value;
    const warnaDropdown = document.getElementById("warnaDropdown");
    
    if (!kode) {
        warnaDropdown.innerHTML = '<option value="">Pilih Warna</option>';
        return;
    }

    try {
        const response = await fetch(`/get-warna?kodeBarang=${kode}`);
        const data = await response.json();

        warnaDropdown.innerHTML = '<option value="">Pilih Warna</option>';
        data.forEach(item => {
            let option = document.createElement("option");
            option.value = item.warna;
            option.textContent = item.warna;
            warnaDropdown.appendChild(option);
        });
    } catch (error) {
        console.error("Gagal mengambil data warna:", error);
    }
}

async function updateUkuranDropdown() {
    const kode = document.getElementById("kodeInput").value;
    const ukuranDropdown = document.getElementById("ukuranDropdown");

    if (!kode) {
        ukuranDropdown.innerHTML = '<option value="">Pilih Ukuran</option>';
        return;
    }

    try {
        const response = await fetch(`/get-ukuran?kodeBarang=${kode}`);
        const data = await response.json();

        ukuranDropdown.innerHTML = '<option value="">Pilih Ukuran</option>';
        data.forEach(item => {
            let option = document.createElement("option");
            option.value = item.ukuran;
            option.textContent = item.ukuran;
            ukuranDropdown.appendChild(option);
        });
    } catch (error) {
        console.error("Gagal mengambil data ukuran:", error);
    }
}



async function saveStock() {
    const kodeBarang = document.getElementById("kodeBarang").value;
    const namaBarang = document.getElementById("namaBarang").value;
    const warna = document.getElementById("warna").value;
    const quantity = parseInt(document.getElementById("quantity").value);
    const ukuran = document.getElementById("ukuran").value;
    const harga = parseFloat(document.getElementById("harga").value.replace(/\./g, ""));

    const response = await fetch('/update-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kodeBarang, namaBarang, warna, quantity, ukuran, harga })
    });

    const result = await response.json();
    alert(result.message || result.error);
    document.getElementById("stockForm").reset();
}

document.getElementById("kodeBarang").addEventListener("input", async function() {
    const kode = this.value.trim(); // Menghilangkan spasi berlebih
    if (!kode) {
        // Jika kode kosong, reset field dan buka kembali input
        resetFields();
        return;
    }

    // try {
    //     const response = await fetch(`/get-barang?kodeBarang=${kode}`);
    //     const data = await response.json();

    //     if (data && data.nama_barang) {
    //         // Jika data ditemukan, isi Nama Barang & Harga lalu kunci field
    //         document.getElementById("namaBarang").value = data.nama_barang;
    //         document.getElementById("harga").value = data.harga ? data.harga.toLocaleString("id-ID") : "";

    //         document.getElementById("namaBarang").setAttribute("readonly", true);
    //         document.getElementById("harga").setAttribute("readonly", true);
    //     } else {
    //         // Jika data tidak ditemukan, reset field dan buka kembali input
    //         resetFields();
    //     }
    // } catch (error) {
    //     console.error("Gagal mengambil data barang:", error);
    //     resetFields(); // Pastikan field di-reset jika ada error
    // }
});

// Fungsi untuk mereset Nama Barang & Harga dan membuka input kembali
function resetFields() {
    document.getElementById("namaBarang").value = "";
    document.getElementById("harga").value = "";
    document.getElementById("namaBarang").removeAttribute("readonly");
    document.getElementById("harga").removeAttribute("readonly");
}

document.getElementById("diskonToko").addEventListener("input", function () {
    let diskonInput = this.value.replace(/\D/g, ""); // Hanya angka
    if (diskonInput !== "") {
        this.value = diskonInput + "%"; // Tambahkan "%"
    } else {
        this.value = ""; // Kosongkan jika tidak ada angka
    }
    updateTotalWithDiscount(); // Hitung ulang total harga
});

document.addEventListener("DOMContentLoaded", function () {
    updateReceiptControls(); // Pastikan dropdown langsung disable saat halaman pertama kali dimuat
});

function updateReceiptControls() {
    let hasItems = cart.length > 0;

    document.getElementById("jenisPembayaran").disabled = !hasItems;
    document.getElementById("statusPembayaran").disabled = !hasItems;
    document.getElementById("dpAmount").disabled = !hasItems;

    if (!hasItems) {
        document.getElementById("statusPembayaran").value = "Lunas"; // ✅ Reset ke Lunas jika kosong
        document.getElementById("dpAmount").value = ""; // ✅ Kosongkan DP jika keranjang kosong
        document.getElementById("dpAmountGroup").style.display = "none"; // ✅ Sembunyikan DP
    }
}


function updateTotalWithDiscount() {
    let totalPriceElement = document.getElementById("totalPrice");
    let totalHarga = parseFloat(totalPriceElement.dataset.originalPrice) || 0; // Ambil harga sebelum diskon
    let diskonInput = document.getElementById("diskonToko").value.replace("%", ""); // Ambil angka diskon

    let diskon = parseFloat(diskonInput) || 0; // Konversi ke angka
    let totalSetelahDiskon = totalHarga - (totalHarga * (diskon / 100)); // Hitung harga setelah diskon

    totalPriceElement.innerText = `Rp ${totalSetelahDiskon.toLocaleString("id-ID")}`;
}

function updateTotalPrice(total) {
    let totalPriceElement = document.getElementById("totalPrice");
    totalPriceElement.dataset.originalPrice = total; // Simpan harga asli
    totalPriceElement.innerText = `Rp ${total.toLocaleString("id-ID")}`;
}

async function addToCart() {
    const kode = document.getElementById("kodeInput").value;
    const warna = document.getElementById("warnaDropdown").value;
    const ukuran = document.getElementById("ukuranDropdown").value;
    const quantity = parseInt(document.getElementById("checkoutQuantity").value);
    
    const diskonElement = document.getElementById("diskonToko");
    let diskonInput = diskonElement ? diskonElement.value.replace("%", "").trim() : "0"; 
    let diskon = parseInt(diskonInput) || 0; // 🔹 Konversi ke angka, default ke 0 jika tidak ada input

    if (!kode || !warna || !ukuran || isNaN(quantity) || quantity <= 0) {
        alert("Mohon lengkapi semua data dengan benar.");
        return;
    }

    if (diskon > 99) {
        alert("Diskon tidak boleh lebih dari 99%!");
        return;
    }

    try {
        const response = await fetch('/add-to-cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kodeBarang: kode, warna, ukuran, quantity })
        });

        const result = await response.json();

        if (response.ok) {
            let hargaSatuan = result.harga || 0;
            let totalHarga = hargaSatuan * quantity;
            let totalSetelahDiskon = totalHarga - (totalHarga * (diskon / 100));

            cart.push({
                kodeBarang: kode,
                namaBarang: result.nama_barang,
                warna,
                ukuran,
                quantity,
                hargaSatuan,
                diskon: diskon + "%", // 🔹 Simpan diskon dalam format persen
                totalHargaSebelumDiskon: totalHarga,
                totalHarga: totalSetelahDiskon
            });

            updateReceipt();
            updateReceiptControls();
        } else {
            alert(result.error);
        }
    } catch (error) {
        console.error("Gagal menambahkan ke keranjang:", error);
    }
}


function updateReceipt() {
    let cartItemsElement = document.getElementById("cartItems");
    let totalItemsElement = document.getElementById("totalItems");
    let totalPriceElement = document.getElementById("totalPrice");

    cartItemsElement.innerHTML = "";
    let totalItems = 0;
    let totalHargaFinal = 0;

    cart.forEach(item => {
        let li = document.createElement("li");
        li.innerHTML = `${item.namaBarang} (${item.warna}, ${item.ukuran}) - ${item.quantity} x Rp ${item.hargaSatuan.toLocaleString("id-ID")}
                        <br> Diskon: ${item.diskon} 
                        <br> <strong>Total: Rp ${item.totalHarga.toLocaleString("id-ID")}</strong>`;
        cartItemsElement.appendChild(li);

        totalItems += item.quantity;
        totalHargaFinal += item.totalHarga;
    });

    totalItemsElement.innerText = totalItems;
    totalPriceElement.innerText = `Rp ${totalHargaFinal.toLocaleString("id-ID")}`;

    updateReceiptControls(); // 🔹 Pastikan tombol aktif setelah receipt diperbarui
}


document.getElementById("statusPembayaran").addEventListener("change", toggleDPInput);

document.getElementById("dpAmount").addEventListener("input", function() {
    this.value = this.value.replace(/\D/g, "").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
});

function toggleDPInput() {
    const status = document.getElementById("statusPembayaran").value;
    const dpInput = document.getElementById("dpAmountGroup");
    dpInput.style.display = (status === "DP") ? "block" : "none";
}



async function checkout() {
    if (cart.length === 0) {
        alert("Keranjang masih kosong!");
        return;
    }

    const metodePembayaran = document.getElementById("jenisPembayaran").value;
    const pembayaran = document.getElementById("statusPembayaran").value;
    const dpAmount = pembayaran === "DP" ? document.getElementById("dpAmount").value.replace(/\./g, "") : 0;

    let transaksi = {
        cart: cart.map(item => ({
            kodeBarang: item.kodeBarang,
            namaBarang: item.namaBarang,
            warna: item.warna,
            quantity: item.quantity,
            ukuran: item.ukuran || "-",
            hargaSatuan: parseFloat(item.hargaSatuan) || 0,
            diskon: parseFloat(item.diskon) || 0 // ✅ Pastikan diskon dikirim ke backend
        })),
        pembayaran,
        metodePembayaran,
        dpAmount: parseFloat(dpAmount) || 0
    };

    const response = await fetch('/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaksi)
    });

    const result = await response.json();
    if (response.ok) {
        alert(result.message);

        generateReceiptPDF(transaksi, pembayaran === "DP");


        // ✅ Reset semua opsi pembayaran ke default
        document.getElementById("statusPembayaran").value = "Lunas";
        document.getElementById("dpAmount").value = "";
        document.getElementById("dpAmountGroup").style.display = "none";

        // ✅ Reset form keranjang
        cart = [];
        updateReceipt();
        updateReceiptControls();

    } else {
        alert(result.error);
    }
}


async function loadPendingData() {
    const response = await fetch('/get-pending');
    const pendingData = await response.json();

    const tableBody = document.querySelector("#pendingTable tbody");
    tableBody.innerHTML = "";

    pendingData.forEach(item => {
        let row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
            <td>
                <button onclick="processLunas(${item.id})">Lunas</button>
                <button onclick="deletePending(${item.id})">Hapus</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}


async function processLunas(id) {
    console.log(`🔹 ID Penjualan yang dikirim: ${id}`);

    try {
        const response = await fetch(`/process-lunas/${id}`, { method: 'POST' });
        const result = await response.json();

        if (response.ok) {
            console.log("✅ Data transaksi berhasil dilunasi:", result);

            // ✅ Pastikan `transaksi` tidak kosong sebelum dipakai di `generateReceiptsPDF`
            if (!result.transaksi || !result.items) {
                console.error("❌ Data transaksi atau items tidak ditemukan:", result);
                alert("Gagal mendapatkan data transaksi setelah pelunasan.");
                return;
            }

            alert(result.message);
            console.log("📜 Sebelum generate nota:", result.items, result.transaksi);
            generateReceiptsPDF(result.items, result.transaksi); // 🔹 Cetak resi langsung
            deletePending(id);
        } else {
            alert(result.error);
        }
    } catch (error) {
        console.error("❌ Error saat memproses lunas:", error);
    }
}



async function generateReceiptFromDB(id) {
    try {
        const response = await fetch(`/get-transaction-details/${id}`);
        const transaction = await response.json();

        if (!response.ok) {
            throw new Error(transaction.error || "Gagal mengambil data transaksi.");
        }

        console.log("🧾 Data Resi:", transaction);

        generateReceiptPDF(transaction);
    } catch (error) {
        console.error("❌ Error saat mengambil detail transaksi:", error);
    }
}

function generateReceiptPDF(transaksi, items) {
    console.log("📜 Data transaksi di generateReceiptPDF:", transaksi);
    console.log("📦 Items di generateReceiptPDF:", items);

    if (!Array.isArray(items)) {console.log("Stock Store:", stockStore);
console.log("Kasir Store:", kasirStore);
console.log("Database Name:", dbName);
console.log("Cart:", cart);
        console.error("❌ Items bukan array atau undefined!", items);
        alert("Terjadi kesalahan: Data items tidak valid.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Struk Pembelian", 10, 10);
    doc.text(`ID Transaksi: ${transaksi.id}`, 10, 20);
    doc.text(`Tanggal: ${new Date(transaksi.tanggal).toLocaleString()}`, 10, 30);
    doc.text(`Total: Rp ${transaksi.total_pembayaran.toLocaleString("id-ID")}`, 10, 40);
    
    let y = 50;
    doc.text("Detail Barang:", 10, y);
    items.forEach((item, index) => {
        y += 10;
        doc.text(`${index + 1}. ${item.nama_barang} - ${item.quantity} x Rp ${item.harga.toLocaleString("id-ID")}`, 10, y);
    });

    doc.save(`Receipt_${transaksi.id}.pdf`);
}

function generateReceiptPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Struk Pembelian", 10, 10);
    doc.text(`ID Transaksi: ${data.id}`, 10, 20);
    doc.text(`Tanggal: ${new Date(data.tanggal).toLocaleString()}`, 10, 30);
    doc.text(`Pembayaran: ${data.pembayaran}`, 10, 40);
    doc.text(`Total: Rp ${data.total_pembayaran.toLocaleString("id-ID")}`, 10, 50);

    let y = 60;
    doc.text("Detail Barang:", 10, y);
    data.items.forEach((item, index) => {
        y += 10;
        doc.text(`${index + 1}. ${item.nama_barang} - ${item.quantity} x Rp ${item.harga.toLocaleString("id-ID")}`, 10, y);
    });

    doc.save(`Receipt_${data.id}.pdf`);
}


async function markAsLunas(idPenjualan) {
    const response = await fetch(`/process-lunas/${idPenjualan}`, { method: "POST" });
    const result = await response.json();

    if (response.ok) {
        alert(result.message);
        generateReceiptAfterLunas(idPenjualan); // Generate receipt ulang setelah lunas
        loadPendingTransactions(); // Reload halaman pending
    } else {
        alert(result.error);
    }
}

async function generateReceiptAfterLunas(idPenjualan) {
    try {
        const response = await fetch(`/get-detail-penjualan/${idPenjualan}`);
        const data = await response.json();

        if (!response.ok) {
            alert("Gagal mengambil detail transaksi!");
            return;
        }

        let receiptContent = `
            <h3>Struk Pembelian</h3>
            <p>Metode Pembayaran: ${data.metodePembayaran}</p>
            <p>Status: ${data.pembayaran}</p>
            <table>
                <tr><th>Nama Barang</th><th>Qty</th><th>Harga</th><th>Diskon</th><th>Total</th></tr>
        `;

        data.cart.forEach(item => {
            let totalHarga = (item.harga * item.quantity) - ((item.harga * item.quantity) * (item.diskon / 100));
            receiptContent += `
                <tr>
                    <td>${item.nama_barang}</td>
                    <td>${item.quantity}</td>
                    <td>${item.harga}</td>
                    <td>${item.diskon}%</td>
                    <td>${totalHarga.toLocaleString()}</td>
                </tr>
            `;
        });

        receiptContent += `</table><p>Total Pembayaran: Rp ${data.totalPembayaran.toLocaleString()}</p>`;

        document.getElementById("receiptContainer").innerHTML = receiptContent;

    } catch (error) {
        console.error("Error fetching transaction details:", error);
        alert("Terjadi kesalahan saat mengambil data transaksi.");
    }
}

function generateReceiptPDF(transaksi, isDP) {
    let receiptContent = `\nGemilang Collection\n-------------------------------\nTanggal: ${new Date().toLocaleDateString()}\nMetode Pembayaran: ${transaksi.metodePembayaran}\nStatus Pembayaran: ${transaksi.pembayaran}\n-------------------------------`;
    console.log("transaksi: ",transaksi, isDP);
    transaksi.cart.forEach(item => {
        let totalItem = item.hargaSatuan * item.quantity;
        let hargaSetelahDiskon = totalItem - (totalItem * (item.diskon / 100));
        receiptContent += `\n${item.namaBarang} (${item.warna})(${item.ukuran})\n${item.quantity} x Rp${item.hargaSatuan.toLocaleString()}  =  Rp${hargaSetelahDiskon.toLocaleString()}\n-------------------------------`;
    });
    
    if (isDP) {
        receiptContent += `\nHarga Total: Rp${transaksi.dpAmount.toLocaleString()} (DP)\n`;
    } else {
        let totalHarga = transaksi.cart.reduce((acc, item) => acc + ((item.hargaSatuan * item.quantity) - ((item.hargaSatuan * item.quantity) * (item.diskon / 100))), 0);
        receiptContent += `\nTotal Bayar: Rp${totalHarga.toLocaleString()}\n-------------------------------\nTerima kasih telah berbelanja!`;
    }
    
    let pdf = new jsPDF();
    pdf.setFontSize(12);
    pdf.text(receiptContent, 10, 10);
    pdf.save(`Struk_Pembelian_${new Date().getTime()}.pdf`);
}


async function deletePending(id) {
    const response = await fetch(`/delete-pending/${id}`, { method: 'DELETE' });
    const result = await response.json();
    alert(result.message || result.error);
    loadPendingData();
}


function generateReceiptPDF(transaksi, isDP) {
    const { jsPDF } = window.jspdf; // Ambil jsPDF dari window.jspdf
    let pdf = new jsPDF();
    
    let receiptContent = `Gemilang Collection\n-------------------------------\n`;
    receiptContent += `Tanggal: ${new Date().toLocaleDateString()}\n`;
    receiptContent += `Metode Pembayaran: ${transaksi.metodePembayaran}\n`;
    receiptContent += `Status Pembayaran: ${transaksi.pembayaran}\n-------------------------------\n`;

    console.log("trans:", transaksi, isDP);
    
    transaksi.cart.forEach(item => {
        let totalItem = item.hargaSatuan * item.quantity;
        let hargaSetelahDiskon = totalItem - (totalItem * (item.diskon / 100));
        receiptContent += `${item.namaBarang} (${item.warna})\n${item.quantity} x Rp${item.hargaSatuan.toLocaleString()}  =  Rp${totalItem.toLocaleString()}\n`;
        receiptContent += `Diskon : ${item.diskon}%\n`
        receiptContent += `Harga setelah Diskon: ${hargaSetelahDiskon.toLocaleString()}\n-------------------------------\n`
    });
    
    if (isDP) {
        let totalHarga = transaksi.cart.reduce((acc, item) => acc + ((item.hargaSatuan * item.quantity) - ((item.hargaSatuan * item.quantity) * (item.diskon / 100))), 0);
        receiptContent += `\nHarga Total: Rp${totalHarga.toLocaleString()}\n-------------------------------\nTerima kasih telah berbelanja!\n`;
        receiptContent += `\n Total Bayar: Rp${transaksi.dpAmount.toLocaleString()} (DP)\n`;
    } else {
        let totalHarga = transaksi.cart.reduce((acc, item) => acc + ((item.hargaSatuan * item.quantity) - ((item.hargaSatuan * item.quantity) * (item.diskon / 100))), 0);
        receiptContent += `\nHarga Total: Rp${totalHarga.toLocaleString()}\n-------------------------------\nTerima kasih telah berbelanja!`;
    }

    pdf.setFontSize(12);
    pdf.text(receiptContent, 10, 10);
    pdf.save(`Struk_Pembelian_${new Date().getTime()}.pdf`);
}

function generateReceiptsPDF(transaksi, infoTransaksi) {
    const { jsPDF } = window.jspdf; // Ambil jsPDF dari window.jspdf
    let pdf = new jsPDF();
    const today = new Date(); 

    let receiptContent = `Gemilang Collection\n-------------------------------\n`;
    const formattedDate = `${String(today.getDate()).padStart(2, '0')} ${String(today.getMonth() + 1).padStart(2, '0')} ${today.getFullYear()}`;
    receiptContent += `Tanggal: ${formattedDate}\n`;
    receiptContent += `Metode Pembayaran: ${infoTransaksi.metode_pembayaran}\n`;
    receiptContent += `Status Pembayaran: ${infoTransaksi.pembayaran}\n-------------------------------\n`;

    console.log("Transaksi Data:", transaksi, infoTransaksi);

    let totalHargaAsli = 0;
    let totalPembayaran = parseFloat(infoTransaksi.total_pembayaran);

    transaksi.forEach(item => {
        let totalItem = parseFloat(item.harga) * item.quantity;
        let hargaSetelahDiskon = totalItem - (totalItem * (item.diskon / 100));
        totalHargaAsli += hargaSetelahDiskon;

        // receiptContent += `${item.nama_barang} (${item.warna})\n`;
        // receiptContent += `${item.quantity} x Rp${parseFloat(item.harga).toLocaleString()} = Rp${totalItem.toLocaleString()}\n`;
        // receiptContent += `${item.namaBarang} (${item.warna})\n${item.quantity} x Rp${item.hargaSatuan.toLocaleString()}  =  Rp${totalItem.toLocaleString()}\n`;
        // receiptContent += `Diskon : ${item.diskon}%\n`
        // receiptContent += `Harga setelah Diskon: ${hargaSetelahDiskon.toLocaleString()}\n-------------------------------\n`
        receiptContent += `${item.namaBarang} (${item.warna}) (${item.ukuran})\n${item.quantity} x Rp${item.harga.toLocaleString()}  =  Rp${totalItem.toLocaleString()}\n`;
        receiptContent += `Diskon : ${item.diskon}%\n`
        receiptContent += `Harga setelah Diskon: ${hargaSetelahDiskon.toLocaleString()}\n-------------------------------\n`
    });

    if (infoTransaksi.pembayaran.startsWith("Lunas DP")) {
        let bayarLunas = totalHargaAsli - totalPembayaran;
        receiptContent += `\nHarga Total: Rp${totalHargaAsli.toLocaleString('id-ID')}\n`;
        receiptContent += `DP: Rp${totalPembayaran.toLocaleString('id-ID')}\n`;
        receiptContent += `Sisa Bayar: Rp${bayarLunas.toLocaleString('id-ID')}\n-------------------------------\n`;
    } else {
        receiptContent += `\nTotal Bayar: Rp${totalPembayaran.toLocaleString('id-ID')}\n-------------------------------\n`;
    }

    receiptContent += "Terima kasih telah berbelanja!";

    pdf.setFontSize(12);
    pdf.text(receiptContent, 10, 10);
    pdf.save(`Struk_Pembelian_${new Date().getTime()}.pdf`);
}


function formatTanggal(tanggal) {
    const date = new Date(tanggal);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`; // Format: YYYY-MM-DD
}

// async function exportKasir() {
//     try {
//         const response = await fetch('/get-kasir');
//         if (!response.ok) {
//             throw new Error('Gagal mengambil data kasir');
//         }

//         const kasirData = await response.json();

//         if (kasirData.length === 0) {
//             alert("Tidak ada data penjualan hari ini.");
//             return;
//         }

//         // Formatkan tanggal sebelum mengekspor data
//         kasirData.forEach(item => {
//             item.tanggal = formatTanggal(item.tanggal); // Format tanggal di sini
//         });

//         // Dapatkan tanggal hari ini untuk nama file
//         const today = new Date().toISOString().split('T')[0];
//         const fileName = `Kasir_${today}.xlsx`;

//         // Menggunakan XLSX untuk mengonversi data menjadi file Excel
//         const ws = XLSX.utils.json_to_sheet(kasirData); 
//         const wb = XLSX.utils.book_new(); 
//         XLSX.utils.book_append_sheet(wb, ws, "Kasir_Hari_Ini"); 
//         XLSX.writeFile(wb, fileName); 
//     } catch (error) {
//         console.error("Terjadi kesalahan saat ekspor kasir:", error);
//         alert("Terjadi kesalahan saat mengekspor data kasir. Silakan coba lagi.");
//     }
// }
//ANJAY
let currentPage = 1;
const rowsPerPage = 30;
let kasirData = [];

async function loadKasirData() {
    const response = await fetch('/get-kasir');
    kasirData = await response.json(); // Simpan semua data dalam array

    console.log(kasirData);
    updateTable();
}

function updateTable() {
    const tableBody = document.querySelector("#kasirTable tbody");
    const totalSalesElement = document.getElementById("totalSales");
    tableBody.innerHTML = "";

    let start = (currentPage - 1) * rowsPerPage;
    let end = start + rowsPerPage;
    let displayedData = kasirData.slice(start, end);

    let totalSales = 0;

    displayedData.forEach(item => {
        console.log("Item data:", item); // 🔹 Debugging untuk cek data
        
        let hargaSatuan = Number(item.harga) || 0; // 🔥 Pastikan harga dalam format angka
        let diskon = Number(item.diskon) || 0; // 🔥 Pastikan diskon dalam format angka
        let quantity = Number(item.quantity) || 0; // 🔥 Pastikan quantity dalam format angka

        console.log(`HargaSatuan: ${hargaSatuan}, Quantity: ${quantity}, Diskon: ${diskon}`);

        // Pastikan harga tidak dikalikan ulang secara tidak sengaja
        let totalHargaSebelumDiskon = hargaSatuan * quantity;
        let totalHargaSetelahDiskon = totalHargaSebelumDiskon - (totalHargaSebelumDiskon * (diskon / 100));

        totalSales += totalHargaSetelahDiskon;

        let formattedDate = new Date(item.tanggal).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // 🚀 Pastikan harga yang ditampilkan benar sebelum masuk ke tabel
        console.log(`Total Harga Setelah Diskon: ${totalHargaSetelahDiskon}`);

        // 🔥 Cara yang lebih aman untuk menambahkan row
        let row = document.createElement("tr");
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${item.kode_barang}</td>
            <td>${item.nama_barang}</td>
            <td>${item.warna}</td>
            <td>${quantity}</td>
            <td>Rp ${parseFloat(item.total_harga).toLocaleString("id-ID")}</td>
            <td>${item.pembayaran}</td>
            <td>Rp ${parseFloat(item.total_pembayaran).toLocaleString("id-ID")}</td>
            <td>${item.metode_pembayaran}</td>
            
        `;
        tableBody.appendChild(row);
    });

    totalSalesElement.textContent = `Rp ${totalSales.toLocaleString("id-ID")}`;
    updatePagination();
}


function updatePagination() {
    const totalPages = Math.ceil(kasirData.length / rowsPerPage);
    document.getElementById("currentPage").textContent = `Halaman ${currentPage}`;
    
    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;
}

function changePage(direction) {
    currentPage += direction;
    updateTable();
}

async function clearDatabase() {
    const response = await fetch('/clear-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });

    const result = await response.json();
    alert(result.message || result.error);
}

function resetReceipt() {
    document.getElementById("cartItems").innerHTML = "";
    document.getElementById("totalItems").textContent = "0";
    document.getElementById("totalPrice").textContent = "Rp 0";
    cart = []; // Kosongkan array keranjang
}
function resetForm() {
    document.getElementById("stockForm").reset();
}

// 🔹 Pagination (Next & Prev)
function nextPage() {
    if (currentPage * rowsPerPage < kasirData.length) {
        currentPage++;
        displayKasirData();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayKasirData();
    }
}

async function exportKasirToExcel() {
    let startDateInput = document.getElementById("startDate").value;
    let endDateInput = document.getElementById("endDate").value;

    let filteredData = kasirData;
    let rangeText = "Periode: Semua Data";

    if (startDateInput && endDateInput) {
        let startDate = new Date(startDateInput);
        let endDate = new Date(endDateInput);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        filteredData = kasirData.filter(item => {
            let itemDate = new Date(item.tanggal);
            return itemDate >= startDate && itemDate <= endDate;
        });

        rangeText = `Periode: ${startDateInput} - ${endDateInput}`;
    }

    if (filteredData.length === 0) {
        alert("Tidak ada data dalam rentang tanggal yang dipilih.");
        return;
    }

    filteredData.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    let totalQuantity = 0;
    let totalHarga = 0;
    let totalPembayaran = 0;

    let workbook = new ExcelJS.Workbook();
    let worksheet = workbook.addWorksheet("Kasir Data");

    // ✅ Tambahkan Judul
    worksheet.mergeCells("A1:I1");
    let titleRow = worksheet.getCell("A1");
    titleRow.value = "Riwayat Penjualan Gemilang Collection";
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: "center" };

    console.log("Judul yang digunakan:", titleRow.value); // Debugging

    // ✅ Tambahkan Periode
    worksheet.mergeCells("A2:I2");
    let periodRow = worksheet.getCell("A2");
    periodRow.value = rangeText;
    periodRow.font = { italic: true };
    periodRow.alignment = { horizontal: "center" };

    worksheet.addRow([]); // Baris kosong

    // ✅ Header
    let headers = [
        "Tanggal", "id Penjualan", "Kode Barang", "Nama Barang", "Warna",
        "Quantity", "Total Harga", "Status", "Total Pembayaran", "Metode Pembayaran"
    ];
    let headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };

    // ✅ Tambahkan Data
    let dataRows = filteredData.map(item => {
        let hargaTotal = item.quantity * item.harga;
        let pembayaran = Number(item.total_pembayaran); // ✅ Pastikan angka, bukan string

        totalQuantity += item.quantity;
        totalHarga += hargaTotal;
        totalPembayaran += pembayaran; // ✅ Gunakan angka

        return [
            new Date(item.tanggal).toLocaleDateString("id-ID"),
            item.id_penjualan,
            item.kode_barang,
            item.nama_barang,
            item.warna,
            item.quantity,
            hargaTotal,
            item.pembayaran,
            pembayaran, // ✅ Kolom ini diperbaiki
            item.metode_pembayaran
        ];
    });

    dataRows.forEach(row => worksheet.addRow(row));

    // ✅ Tambahkan Total
    worksheet.addRow([]);
    let totalRow = worksheet.addRow([
        "TOTAL", "", "", "", totalQuantity, totalHarga, "", totalPembayaran, ""
    ]);
    totalRow.font = { bold: true };

    // ✅ Format Angka di Kolom Harga & Pembayaran
    worksheet.getColumn(6).numFmt = '#,##0';
    worksheet.getColumn(8).numFmt = '#,##0';

    // ✅ Atur Lebar Kolom Secara Otomatis Sesuai Data
    worksheet.columns.forEach((column, colIndex) => {
        let maxLength = 0;
        let columnLetter = String.fromCharCode(65 + colIndex); // Konversi index ke huruf (A, B, C, ...)

        column.eachCell({ includeEmpty: true }, cell => {
            let cellText = cell.value ? cell.value.toString() : "";
            maxLength = Math.max(maxLength, cellText.length);
        });

        column.width = maxLength < 10 ? 10 : maxLength + 2; // Tambahkan padding agar tidak mepet
        console.log(`Kolom ${columnLetter} diatur lebarnya menjadi: ${column.width}`);
    });

    // ✅ Tambahkan Border ke Semua Sel
    worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
        });
    });

    // ✅ Pastikan judul tetap sebelum ekspor
    setTimeout(() => {
        worksheet.getCell("A1").value = "Riwayat Penjualan Gemilang Collection";

        console.log("Judul final sebelum ekspor:", worksheet.getCell("A1").value); // Debugging

        workbook.xlsx.writeBuffer().then((buffer) => {
            let blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            let link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "Riwayat_Penjualan .xlsx";
            link.click();
        });
    }, 100); // Delay 100ms untuk memastikan perubahan diterapkan
}


let stockData = [];
let stockSummaryData = [];
let currentStockPage = 1;
let currentSummaryPage = 1;

// 🔹 Load data stok dari server
async function loadStockData() {
    const response = await fetch('/get-stock');
    stockData = await response.json();
    updateStockTable(stockData);
}

function updateStockTable() {
    let tableBody = document.querySelector("#stockTable tbody");
    tableBody.innerHTML = "";

    let start = (currentStockPage - 1) * rowsPerPage;
    let end = start + rowsPerPage;
    let displayedData = stockData.slice(start, end);

    displayedData.forEach(item => {
        let formattedDate = formatTanggal(item.tanggal); // 🔹 Perbaiki format tanggal

        let row = `<tr>
            <td>${item.kode_barang}</td>
            <td>${item.nama_barang}</td>
            <td>${item.warna}</td>
            <td>${item.quantity}</td>
            <td>${item.ukuran}</td>
            <td>Rp ${parseFloat(item.harga).toLocaleString("id-ID")}</td>
        </tr>`;
        tableBody.innerHTML += row;
    });

    document.getElementById("stockPageInfo").innerText = `Halaman ${currentStockPage}`;
}

function changeStockPage(direction) {
    if ((direction === -1 && currentStockPage > 1) ||
        (direction === 1 && currentStockPage * rowsPerPage < stockData.length)) {
        currentStockPage += direction;
        updateStockTable();
    }
}

function changeSummaryPage(direction) {
    if ((direction === -1 && currentSummaryPage > 1) ||
        (direction === 1 && currentSummaryPage * rowsPerPage < stockSummaryData.length)) {
        currentSummaryPage += direction;
        updateStockSummaryTable();
    }
}

async function exportStockToExcel() {
    let startDateInput = document.getElementById("startDateStock").value;
    let endDateInput = document.getElementById("endDateStock").value;

    let filteredData = stockData;
    let rangeText = "Periode: Semua Data";

    if (startDateInput && endDateInput) {
        let startDate = new Date(startDateInput);
        let endDate = new Date(endDateInput);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        filteredData = stockData.filter(item => {
            let itemDate = new Date(item.tanggal);
            return itemDate >= startDate && itemDate <= endDate;
        });

        rangeText = `Periode: ${startDateInput} - ${endDateInput}`;
    }

    if (filteredData.length === 0) {
        alert("Tidak ada data dalam rentang tanggal yang dipilih.");
        return;
    }

    let workbook = new ExcelJS.Workbook();
    let worksheet = workbook.addWorksheet("Stock Data");

    // ✅ Tambahkan Judul
    worksheet.mergeCells("A1:G1");
    let titleRow = worksheet.getCell("A1");
    titleRow.value = "Laporan Stok Barang";
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: "center" };

    // ✅ Tambahkan Periode
    worksheet.mergeCells("A2:G2");
    let periodRow = worksheet.getCell("A2");
    periodRow.value = rangeText;
    periodRow.font = { italic: true };
    periodRow.alignment = { horizontal: "center" };

    worksheet.addRow([]); // Baris kosong

    // ✅ Header Kolom
    let headers = ["Kode Barang", "Nama Barang", "Warna", "Quantity", "Ukuran", "Harga"];
    let headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD3D3D3" } };
        cell.alignment = { horizontal: "center" };
    });

    // ✅ Tambahkan Data
    filteredData.forEach(item => {
        worksheet.addRow([
            item.kode_barang,
            item.nama_barang,
            item.warna,
            item.quantity,
            item.ukuran,
            item.harga
        ]);
    });

    // ✅ Sesuaikan Ukuran Kolom
    worksheet.columns = headers.map((header, colIndex) => ({
        header,
        key: header.toLowerCase().replace(/\s+/g, "_"),
        width: Math.max(
            header.length + 2,
            ...filteredData.map(row => (row[colIndex] ? row[colIndex].toString().length + 2 : 10))
        )
    }));

    // ✅ Tambahkan Border ke Semua Sel
    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
        });
    });

    // ✅ Pastikan Judul Tidak Berubah Sebelum Ekspor
    setTimeout(() => {
        worksheet.getCell("A1").value = "Laporan Stok Barang";

        workbook.xlsx.writeBuffer().then((buffer) => {
            let blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            let link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "Laporan_Stok.xlsx";
            link.click();
        });
    }, 100); // Delay 100ms untuk memastikan perubahan diterapkan
}

function searchStock() {
    let input = document.getElementById("searchStock").value.toLowerCase();
    let table = document.getElementById("stockTable").getElementsByTagName("tbody")[0];
    let rows = table.getElementsByTagName("tr");

    for (let row of rows) {
        let kode = row.cells[0].textContent.toLowerCase();
        let nama = row.cells[1].textContent.toLowerCase();
        let warna = row.cells[2].textContent.toLowerCase();

        // Jika ada yang cocok dengan input, tampilkan row, jika tidak sembunyikan
        if (kode.includes(input) || nama.includes(input) || warna.includes(input)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
}

function searchKasir() {
    let input = document.getElementById("searchKasir").value.toLowerCase();
    let table = document.getElementById("kasirTable").getElementsByTagName("tbody")[0];
    let rows = table.getElementsByTagName("tr");

    for (let row of rows) {
        let kode = row.cells[0].textContent.toLowerCase();
        let nama = row.cells[1].textContent.toLowerCase();
        let warna = row.cells[2].textContent.toLowerCase();

        // Jika ada yang cocok dengan input, tampilkan row, jika tidak sembunyikan
        if (kode.includes(input) || nama.includes(input) || warna.includes(input)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
}

let historyData = [];
let currentHistoryPage = 1;

async function loadHistoryStockData() {
    const response = await fetch('/get-history-stock');
    historyData = await response.json();
    updateHistoryTable();
}

function updateHistoryTable() {
    let tableBody = document.querySelector("#historyStockTable tbody");
    tableBody.innerHTML = "";

    let start = (currentHistoryPage - 1) * rowsPerPage;
    let end = start + rowsPerPage;
    let displayedData = historyData.slice(start, end);
    console.log("sebelum: ",displayedData);
    displayedData.forEach(item => {
        let formattedDate = new Date(item.tanggal).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        console.log("setelah: ",typeof formattedDate,typeof item.tanggal);
        let row = `<tr>
            <td>${item.kode_barang}</td>
            <td>${item.nama_barang}</td>
            <td>${item.warna}</td>
            <td>${item.quantity}</td>
            <td>${item.ukuran}</td>
            <td>Rp ${item.harga.toLocaleString("id-ID")}</td>
            <td>${item.tanggal}</td>
            <td><button class="delete-btn" onclick="deleteStock('${item.id_history}', '${item.kode_barang}', '${item.warna}', '${item.ukuran}')">🗑️</button></td>
        </tr>`;
        tableBody.innerHTML += row;
    });

    document.getElementById("historyPageInfo").innerText = `Halaman ${currentHistoryPage}`;
}

function deleteStock(id_history, kodeBarang, warna, ukuran) {
    if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
        fetch("/deleteStock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_history, kodeBarang, warna, ukuran })
        })
        .then(response => response.json())
        .then(result => {
            alert(result.message);
            loadHistoryStockData(); // Muat ulang data setelah penghapusan
        })
        .catch(error => console.error("Error:", error));
    }
}


function changeHistoryPage(direction) {
    if ((direction === -1 && currentHistoryPage > 1) ||
        (direction === 1 && currentHistoryPage * rowsPerPage < historyData.length)) {
        currentHistoryPage += direction;
        updateHistoryTable();
    }
}

function searchHistory() {
    let input = document.getElementById("searchHistory").value.toLowerCase();
    let table = document.getElementById("historyStockTable").getElementsByTagName("tbody")[0];
    let rows = table.getElementsByTagName("tr");

    for (let row of rows) {
        let kode = row.cells[0].textContent.toLowerCase();
        let nama = row.cells[1].textContent.toLowerCase();
        let warna = row.cells[2].textContent.toLowerCase();

        if (kode.includes(input) || nama.includes(input) || warna.includes(input)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
}

async function exportHistoryToExcel() {
    let startDate = document.getElementById("startDateHistory").value;
    let endDate = document.getElementById("endDateHistory").value;

    let filteredData = historyData.filter(item => {
        let itemDate = new Date(item.tanggal);
        return (!startDate || itemDate >= new Date(startDate)) &&
               (!endDate || itemDate <= new Date(endDate));
    });

    if (filteredData.length === 0) {
        alert("Tidak ada data dalam rentang tanggal yang dipilih.");
        return;
    }

    let workbook = new ExcelJS.Workbook();
    let worksheet = workbook.addWorksheet("History Stok");

    // ✅ Tambahkan Judul
    worksheet.mergeCells("A1:F1");
    let titleRow = worksheet.getCell("A1");
    titleRow.value = "Riwayat Perubahan Stok";
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: "center" };

    // ✅ Tambahkan Periode
    let rangeText = startDate && endDate ? `Periode: ${startDate} - ${endDate}` : "Periode: Semua Data";
    worksheet.mergeCells("A2:F2");
    let periodRow = worksheet.getCell("A2");
    periodRow.value = rangeText;
    periodRow.font = { italic: true };
    periodRow.alignment = { horizontal: "center" };

    worksheet.addRow([]); // Baris kosong

    // ✅ Header
    let headers = ["Kode Barang", "Nama Barang", "Warna", "Quantity", "Ukuran", "Harga","Tanggal" ];
    let headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    
    // ✅ Tambahkan Data
    filteredData.forEach(item => {
        worksheet.addRow([
            item.kode_barang,
            item.nama_barang,
            item.warna,
            item.quantity,
            item.ukuran,
            item.harga,
            item.tanggal
        ]);
    });

    // ✅ Tambahkan Border ke Semua Sel
    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
        });
    });

    // ✅ Sesuaikan Ukuran Kolom Otomatis
    worksheet.columns.forEach(column => {
        let maxLength = 10; // Default minimal lebar kolom
        column.eachCell({ includeEmpty: true }, cell => {
            let cellLength = cell.value ? cell.value.toString().length : 10;
            maxLength = Math.max(maxLength, cellLength);
        });
        column.width = maxLength + 2; // Tambahkan padding
    });

    // ✅ Simpan File
    let buffer = await workbook.xlsx.writeBuffer();
    let blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "history_stock.xlsx";
    link.click();
}



loadStockData();
