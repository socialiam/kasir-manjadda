# Kasir Toko Manjadda Wajada Kubu

Aplikasi kasir untuk **Toko Manjadda Wajada Kubu — Toko Pecah Belah**.
HTML + CSS + JavaScript murni, tanpa kerangka kerja, tanpa pemasangan apa pun.
Tiga berkas saja:

```
kasir-manjadda/
├─ index.html   kerangka halaman
├─ style.css    tampilan
├─ app.js       semua logika
└─ README.md    berkas ini
```

Folder ini berdiri sendiri. Boleh dipindah ke mana saja, disalin ke flashdisk,
atau dikirim ke laptop lain — asal ketiga berkasnya tetap satu folder.

Nama toko, jenis usaha, alamat, dan telepon bisa diubah kapan saja lewat
**Pengaturan → Identitas Toko**; yang tertulis di kode hanya isi awalnya.

---

## Cara menjalankan

**Cara 1 — Live Server di VS Code (disarankan)**
1. Buka folder `kasir-manjadda` di VS Code.
2. Klik kanan `index.html` → **Open with Live Server**.

**Cara 2 — tanpa VS Code**
Klik dua kali `index.html`, atau klik kanan → Buka dengan → Chrome / Edge.

Live Server lebih disarankan karena penyimpanan data di browser lebih dapat
diandalkan lewat alamat `http://` daripada `file://`. Kalau sudah memakai salah
satu cara, **tetaplah memakai cara yang sama**: data yang disimpan lewat
Live Server tidak terbaca saat berkas dibuka langsung, dan sebaliknya.

---

## Menyiapkan toko sendiri (sekali saja)

Saat pertama kali dibuka, muncul **Panduan Awal**: isi nama toko dan nama
pemilik, lalu pilih mau memakai 8 barang contoh dulu atau langsung kosong.
Setelah itu tidak ada lagi yang perlu diatur dari kode.

Kalau panduan itu terlewat, semuanya tetap bisa diatur belakangan:

| Mau ganti apa | Ke mana |
| --- | --- |
| Nama toko, jenis usaha, alamat, telepon, kalimat penutup struk | Pengaturan → Identitas Toko |
| Jam buka, jam tutup, hari libur | Pengaturan → Identitas Toko |
| Wilayah yang bisa diantar, ongkos antar, tautan peta, tahun berdiri | Pengaturan → Identitas Toko |
| Urutan daftar barang (abjad, harga, untung, stok, terbaru) | Daftar Barang → kotak **Urutkan** |
| Mengisi puluhan barang sekaligus | Daftar Barang → 📋 Isi Cepat Banyak Barang |
| Mencetak/menyimpan daftar barang untuk stok opname | Daftar Barang → ⬇️ Unduh Daftar |
| Nama petugas (misalnya "Bapak" jadi "Mr Kamal") | Pengaturan → Petugas → tombol ✎ |
| Nama, harga, satuan, kode, stok barang | Daftar Barang → tombol ✎ |
| Buang semua barang contoh sekaligus | Pengaturan → Mulai dari Nol → Hapus Semua Barang |
| Mengulang panduan awal | Pengaturan → Mulai dari Nol → Ulangi Panduan Awal |

Mengganti nama petugas **tidak** mengubah nota lama: nota tetap memakai nama
yang tercatat saat transaksi itu terjadi, supaya riwayat tidak bisa berubah.

## Katalog online: supaya pembeli sekitar menemukan toko

Katalog pelanggan (`katalog.html`) bukan sekadar daftar harga. Ia dibuat supaya
orang yang belum kenal toko ini bisa menemukannya dan memutuskan datang.

| Yang dilihat pembeli | Dari mana isinya |
| --- | --- |
| **Buka sekarang** atau **Tutup**, lengkap dengan "tutup pukul 21.00" atau "buka besok pukul 08.00" | Pengaturan → Jam buka, Jam tutup, Hari libur |
| **Bisa antar ke Kubu · Duri · Pinggir · …** | Pengaturan → Wilayah yang bisa diantar |
| Tombol **WhatsApp**, **Telepon**, dan **Lihat di Peta** di kaki halaman | Pengaturan → Nomor telepon dan Tautan peta |
| **Melayani sejak tahun …** | Pengaturan → Melayani sejak tahun |
| Tombol bagi di pojok tiap gambar barang | otomatis, tidak perlu diatur |

Tiga hal yang perlu dimengerti:

1. **Tanda buka/tutup hidup sendiri.** Ia dihitung dari jam di HP pembeli, jadi
   berubah tiap menit tanpa katalog perlu diterbitkan ulang. Ini satu-satunya
   bagian katalog yang begitu. Kalau jam buka dikosongkan, tandanya
   disembunyikan, bukan menampilkan tebakan.

2. **Tombol bagi itu yang menyebarkan toko.** Menekannya di HP memunculkan
   WhatsApp, dan yang terkirim berisi nama barang, harganya, alamat toko, serta
   tautan yang langsung membuka barang itu. Di pasar daerah, satu tautan yang
   diteruskan di grup WhatsApp menjangkau lebih banyak orang daripada iklan
   apa pun.

3. **Peringatan "Belum sama".** Kalau harga atau barang sudah diubah di kasir
   tetapi katalog belum diterbitkan ulang, Pengaturan mengatakannya. Inilah
   lubang terbesar katalog seperti ini: harga di internet diam-diam tertinggal,
   dan baru ketahuan waktu ada pembeli datang membawa harga lama.

### Satu tempat yang masih harus diubah lewat kode

Google dan pratinjau tautan WhatsApp membaca `katalog.html` **mentah**, tanpa
menjalankan program apa pun, jadi keduanya tidak akan pernah melihat nama toko
yang tersimpan di kasir. Karena itu nama, alamat, dan wilayah antar ditulis
sekali lagi di bagian paling atas `katalog.html`, di antara tanda
`<!-- PERHATIAN ... -->`. Kalau salah satu dari ketiganya berubah, betulkan juga
di sana. Selain sepuluh baris itu, tidak ada keterangan toko yang tertanam di
dalam kode.

### Supaya ditemukan di Google

Katalog sudah membawa keterangan yang dibaca mesin pencari: jenis usaha,
alamat, jam buka, nomor telepon, rentang harga, dan daftar daerah yang
dilayani. Yang tidak bisa dikerjakan dari sini, dan sebaiknya dilakukan pemilik
sendiri:

- Daftarkan toko di **Google Bisnisku** (gratis). Ini yang paling menentukan
  untuk pencarian seperti "toko pecah belah Kubu".
- Isi **Tautan peta** di Pengaturan dengan tautan Google Maps toko.
- Tempel alamat katalog di bio Facebook dan di profil WhatsApp toko.

## Cara memakai

| Menu | Untuk apa | Siapa |
| --- | --- | --- |
| 🛒 Jual Barang | Melayani pembeli, menghitung kembalian, mencetak struk | semua |
| 📋 Daftar Barang | Melihat barang; menambah/mengubah harga hanya pemilik | semua |
| 📥 Barang Masuk | Menambah stok ketika kiriman pemasok datang | semua |
| 📊 Laporan | Omzet, untung, barang terlaris, daftar nota, unduh Excel | semua* |
| 🧮 Tutup Kasir | Setoran akhir giliran: hitung uang laci, cari selisih | semua |
| 📒 Buku Catatan | Siapa mengubah apa dan kapan | pemilik |
| ⚙️ Pengaturan | Nama toko, petugas, tema gelap, cadangan data | pemilik |

\* Karyawan hanya melihat **penjualannya sendiri**, tanpa angka untung dan tanpa
harga beli. Pemilik melihat seluruh toko.

### Peran: Pemilik dan Karyawan

Tiap petugas punya peran yang diatur pemilik lewat Pengaturan → Petugas → ✎.

- **Karyawan**: jual, lihat daftar barang, catat barang masuk, tutup kasir,
  laporan miliknya sendiri. Boleh membatalkan notanya sendiri **pada hari yang
  sama** saja.
- **Pemilik**: semuanya, termasuk mengubah harga, Pengaturan, dan Buku Catatan.

**Jujur soal batasnya:** pembagian ini belum memakai PIN, jadi siapa pun yang
memegang laptop masih bisa menekan tombol "Pemilik" di halaman depan. Gunanya
adalah ketertiban dan jejak tanggung jawab, bukan kunci. Kalau toko sudah punya
karyawan tetap, mintalah PIN ditambahkan.

### Tutup Kasir

Di akhir giliran: hitung uang di laci → masukkan jumlahnya → sistem
membandingkan dengan penjualan yang tercatat sejak giliran dimulai, lalu
menyimpan selisihnya lengkap dengan nama penjaga. Inilah cara tercepat
menemukan kesalahan pada hari itu juga, sebelum lupa.

### Buku Catatan

Mencatat sendiri: barang ditambah/diubah/dihapus (harga lama → harga baru),
stok masuk, nota dibatalkan, tutup kasir, dan perubahan petugas atau pengaturan.
Hanya pemilik yang bisa membukanya, dan tidak ada tombol hapus di dalam
aplikasi. Catatan dibatasi 3.000 baris terakhir supaya penyimpanan browser tidak
penuh.

Perlu diingat: ini aplikasi di laptop sendiri. Orang yang paham komputer tetap
bisa mengubah data lewat alat pengembang browser. Buku catatan adalah bukti
kerja sehari-hari, bukan brankas.

**Melayani pembeli:**
1. Pilih petugas di layar pertama.
2. Buka **Jual Barang**.
3. Klik barangnya, atau ketik namanya lalu tekan **Enter**.
4. Isi **Uang diterima** — boleh pakai tombol cepat (*Uang pas*, *+50rb*, dan
   seterusnya). Kembalian muncul sendiri.
5. Tekan **SELESAI**. Struk langsung terbuka dan bisa dicetak.

Stok berkurang otomatis. Barang yang stoknya habis tidak bisa dijual, dan yang
menipis diberi tanda kuning.

### Gambar barang

Tiap barang punya gambar supaya cepat dikenali, terutama oleh karyawan baru.
Gambarnya **bukan foto**, melainkan 24 ikon yang digambar langsung oleh kode:
gelas, piring, mangkuk, sendok, garpu, pisau, panci, wajan, kompor, lemari,
rak piring, ember, baskom, gayung, toples, teko, termos, galon, sapu, alat pel,
spons, keranjang, tempat sampah, dan satu ikon umum.

Dua alasan memilih ikon, bukan foto:

1. Foto dari marketplace atau pencarian gambar adalah karya orang lain.
2. Satu foto memakai jatah penyimpanan browser yang sama dengan data penjualan
   (sekitar 5 MB untuk semuanya). Seratus barang berfoto bisa membuat
   **transaksi gagal tersimpan**. Satu ikon hanya beberapa ratus huruf.

Gambar dipilih otomatis dari nama barang — "Rak piring Aluminium" dapat ikon rak
piring, "Sabut cuci piring" dapat ikon spons. Kalau tebakannya kurang pas, buka
Daftar Barang → ✎ → bagian **Gambar barang**, lalu pilih sendiri.

*Punya alat pemindai barcode?* Alat itu bekerja seperti papan ketik: isi kolom
**Kode** tiap barang dengan angka barcode-nya, lalu tinggal pindai saat kotak
pencarian sedang aktif — barang langsung masuk keranjang.

**Menambah barang baru:** Daftar Barang → **＋ Tambah Barang**.
Tidak perlu lagi membuka berkas `app.js`.

**Mengisi banyak barang sekaligus:** Daftar Barang → **📋 Isi Cepat Banyak
Barang**. Tulis satu barang per baris:

```
Lemari pakaian Plastik ; 450000 ; 380000 ; 3
Rak piring Aluminium Master ; 185000 ; 150000 ; 6
```

Urutannya: nama ; harga jual ; harga beli ; stok. Harga beli dan stok boleh
dikosongkan. Nama yang sudah ada tidak dibuat dua kali — harga dan stoknya
diperbarui. Sebelum disimpan, aplikasi menampilkan dulu berapa yang ditambah,
berapa yang diperbarui, dan baris mana yang dilewati beserta alasannya.

**Salah input?** Laporan → cari notanya → tombol ↺ **Batalkan**.
Stoknya dikembalikan dan nota itu tidak lagi dihitung di laporan, tetapi
riwayatnya tetap tersimpan (tidak dihapus diam-diam).

---

## Data disimpan di mana?

Di dalam browser laptop ini saja (`localStorage`) — **tidak di internet**, tidak
di server mana pun. Artinya:

- Aman: tidak ada orang lain yang bisa melihat data toko.
- Berisiko: kalau riwayat browser dibersihkan sampai "data situs", browser
  diganti, atau laptop rusak, data ikut hilang.

**Karena itu: Pengaturan → ⬇️ Unduh Cadangan, minimal seminggu sekali.**
Berkas `cadangan-kasir-2026-09-24.json` yang terunduh simpanlah di flashdisk
atau Google Drive. Untuk mengembalikannya: **⬆️ Pulihkan dari Cadangan**.

Cadangan yang sama juga dipakai untuk memindahkan data ke laptop baru: unduh di
laptop lama, pulihkan di laptop baru.

---

## Mencetak struk

Tekan **Cetak Struk** di jendela struk. Jendela cetak bawaan browser akan
terbuka.

- Printer struk (58mm/80mm): pilih printernya, ukuran kertas sesuai printer.
- Printer biasa (A4): bisa, struk tercetak di bagian atas kertas.
- Tidak punya printer: pilih **Save as PDF** untuk menyimpan sebagai berkas.

---

## Kalau ada yang perlu diubah

Isi awal (nama toko dan contoh barang) ada di fungsi `dataAwal()` di dalam
`app.js`. Tetapi untuk pemakaian sehari-hari **tidak perlu menyentuh kode sama
sekali** — semuanya bisa diatur dari dalam aplikasi.

Warna dan ukuran tampilan diatur di bagian `:root` pada `style.css`.
