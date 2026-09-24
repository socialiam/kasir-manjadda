/* ============================================================
   KASIR TOKO - seluruh logika aplikasi
   JavaScript murni, tanpa kerangka kerja apa pun.

   Susunan berkas ini:
     1. Alat bantu umum (uang, tanggal, pesan, modal)
     2. Data dan penyimpanan
     3. Perpindahan layar
     4. Layar masuk dan beranda
     5. Layar jual + struk
     6. Layar daftar barang
     7. Layar barang masuk
     8. Layar laporan
     9. Layar pengaturan
    10. Penyalaan pertama
   ============================================================ */
'use strict';

/* ========== 1. ALAT BANTU UMUM ========== */

const $  = (pemilih, induk = document) => induk.querySelector(pemilih);
const $$ = (pemilih, induk = document) => Array.from(induk.querySelectorAll(pemilih));

const pemformatAngka = new Intl.NumberFormat('id-ID');
const angka  = n => pemformatAngka.format(Math.round(Number(n) || 0));
const rupiah = n => 'Rp ' + angka(n);
const idBaru = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Nama toko yang aman dipakai sebagai nama berkas unduhan. */
const slugToko = () => (db.toko?.nama || 'toko').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'toko';

/** Mengamankan teks dari pengguna sebelum dimasukkan ke HTML. */
const aman = teks => String(teks ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Angka bulat dari sebuah kotak isian, apa pun format tampilannya. */
const nilaiAngka = el => parseInt(String(el?.value ?? '').replace(/\D/g, ''), 10) || 0;
const isiUang    = (el, nilai) => { el.value = nilai ? angka(nilai) : ''; };

/** yyyy-mm-dd menurut waktu setempat, bukan UTC. */
function kunciTanggal(tgl = new Date()) {
  const d = new Date(tgl);
  const dua = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
}
const tanggalPanjang = tgl => new Date(tgl).toLocaleDateString('id-ID',
  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const waktuSingkat = tgl => new Date(tgl).toLocaleString('id-ID',
  { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Pesan melayang di pojok kanan bawah. */
function pesan(teks, jenis = 'info', lama = 2800) {
  const el = document.createElement('div');
  el.className = 'toast toast-' + jenis;
  el.textContent = teks;
  $('#tumpukan-pesan').appendChild(el);
  setTimeout(() => { el.classList.add('pergi'); setTimeout(() => el.remove(), 300); }, lama);
}

/** Jendela kecil serbaguna: dipakai untuk formulir, tanya-jawab, dan struk. */
function bukaModal({ judul, isi, aksi = [] }) {
  $('#modal-judul').textContent = judul;
  $('#modal-isi').innerHTML = isi;
  const kotakAksi = $('#modal-aksi');
  kotakAksi.innerHTML = '';
  aksi.forEach(a => {
    const b = document.createElement('button');
    b.className = 'tombol ' + (a.kelas || 'tombol-netral');
    b.textContent = a.label;
    b.onclick = a.saatKlik;
    kotakAksi.appendChild(b);
  });
  $('#latar-modal').classList.remove('tersembunyi');
  const fokus = $('#modal-isi input, #modal-isi select');
  if (fokus) setTimeout(() => fokus.focus(), 60);
}
function tutupModal() {
  $('#latar-modal').classList.add('tersembunyi');
  $('#modal-isi').innerHTML = '';
  $('#modal-aksi').innerHTML = '';
}

/** Pertanyaan ya/tidak. Mengembalikan janji (Promise) berisi true atau false. */
function konfirmasi(judul, teks, labelYa = 'Ya, lanjutkan', bahaya = true) {
  return new Promise(selesai => {
    bukaModal({
      judul,
      isi: `<p>${teks}</p>`,
      aksi: [
        { label: 'Batal', kelas: 'tombol-netral', saatKlik: () => { tutupModal(); selesai(false); } },
        { label: labelYa, kelas: bahaya ? 'tombol-bahaya' : 'tombol-utama', saatKlik: () => { tutupModal(); selesai(true); } }
      ]
    });
  });
}

/** Mengunduh berkas apa pun tanpa server. */
function unduhBerkas(namaBerkas, isi, tipe) {
  const gumpalan = new Blob([isi], { type: tipe });
  const tautan = document.createElement('a');
  tautan.href = URL.createObjectURL(gumpalan);
  tautan.download = namaBerkas;
  document.body.appendChild(tautan);
  tautan.click();
  tautan.remove();
  setTimeout(() => URL.revokeObjectURL(tautan.href), 2000);
}


/* ========== 2. DATA DAN PENYIMPANAN ========== */

const KUNCI_SIMPAN = 'kasirToko.v1';

/* Tanggal pembaruan kode. Dipakai untuk memastikan halaman yang terbuka
   benar-benar yang terbaru: angkanya terlihat di layar Pengaturan paling bawah.
   Kalau angka di layar tidak sama dengan yang disebutkan, berarti browser masih
   memakai simpanan lama dan perlu dimuat ulang dengan Ctrl+Shift+R. */
const VERSI_APLIKASI = '24 September 2026 - pembaruan 22 (sapaan pemilik)';

/** Isi awal saat aplikasi pertama kali dibuka. Semua bisa diubah dari dalam aplikasi. */
function dataAwal() {
  const brg = (kode, nama, beli, jual, stok, satuan = 'pcs') =>
    ({ id: idBaru(), kode, nama, satuan, hargaBeli: beli, hargaJual: jual, stok, stokMinimum: 5, gambar: '' });
  const borong = (barang, isi, satuanBorong, harga) =>
    Object.assign(barang, { grosirJumlah: isi, grosirSatuan: satuanBorong || 'lusin', grosirHarga: harga });
  return {
    versi: 1,
    toko: {
      nama: 'Toko Man Jadda Wajada Kubu', jenis: 'Toko Pecah Belah',
      slogan: 'Pilihan tepat untuk kebutuhan rumah tangga Anda',
      alamat: 'Jln. Jend Sudirman, Pasar Pelita Kubu', telepon: '0813-7189-7171',
      catatanStruk: 'Terima kasih sudah berbelanja', tema: 'terang',
      urutBarang: 'nama-az', jamBuka: '08.00 - 21.00', katalogOtomatis: true,
      /* PIN bawaan 123456, supaya kasir tidak pernah terbuka tanpa penjaga
         sejak menit pertama. Angka ini yang paling mudah ditebak di dunia,
         jadi Pengaturan terus mendesak penggantiannya selama masih bawaan. */
      pinPemilik: acakPin('123456'), pinBawaan: true, pinUntuk: 'semua',
      /* Spanduk berjalan di katalog. Isinya kalimat, bukan foto: foto milik
         orang lain tidak boleh dipakai, dan kalimat promo lebih menggerakkan
         pembeli daripada gambar barang biasa. */
      promo: [
        { judul: 'Harga Lusinan Lebih Hemat', warna: 'ungu',
          teks: 'Gelas, piring, sendok, baskom, dan gayung tersedia per lusin dan kodi.' },
        { judul: 'Pesan Lewat WhatsApp', warna: 'hijau',
          teks: 'Pilih barangnya di sini, kirim pesanannya, tinggal ambil di toko.' },
        { judul: 'Buka Setiap Hari', warna: 'jingga',
          teks: '08.00 sampai 21.00 di Pasar Pelita Kubu, Jln. Jend Sudirman.' }
      ]
    },
    /* Cukup dua orang untuk memulai: pemilik dan satu karyawan. Pemilik
       menambah sendiri sebanyak yang diperlukan lewat Pengaturan, tanpa
       batas jumlah. Daftar panjang sejak awal hanya menyulitkan. */
    petugas: [
      { id: idBaru(), nama: 'Bpk Kamal', peran: 'pemilik' },
      { id: idBaru(), nama: 'Vidal', peran: 'karyawan' }
    ],
    /* Daftar awal: lima barang pertama diambil dari katalog WhatsApp toko,
       sisanya barang pecah belah yang umum. SEMUA HARGA DI SINI PERKIRAAN
       untuk keperluan uji coba; pemilik membetulkannya lewat Daftar Barang. */
    barang: [
      borong(brg('B01', 'Lemari pakaian Plastik', 380000, 465000, 4), 0, '', 0),
      borong(brg('B02', 'Lemari plastik TwinnPan', 420000, 520000, 3), 0, '', 0),
      borong(brg('B03', 'Lemari Plastik BESTPLAST', 510000, 615000, 2), 0, '', 0),
      borong(brg('B04', 'Rak piring Aluminium merek Master', 155000, 195000, 6), 0, '', 0),
      borong(brg('B05', 'Rak susun plastik Panen', 210000, 265000, 5), 0, '', 0),
      borong(brg('B06', 'Kuali besar', 45000, 65000, 8), 0, '', 0),
      borong(brg('B07', 'Kompor 2 tungku', 110000, 145000, 4), 0, '', 0),
      borong(brg('B08', 'Gelas kaca bening', 3500, 5000, 96), 12, 'lusin', 55000),
      borong(brg('B09', 'Piring makan melamin', 7000, 10000, 60), 12, 'lusin', 110000),
      borong(brg('B10', 'Mangkuk sayur melamin', 9000, 13000, 36), 12, 'lusin', 144000),
      borong(brg('B11', 'Sendok makan plastik', 800, 1500, 240), 12, 'lusin', 15000),
      borong(brg('B12', 'Baskom besar', 12000, 18000, 15), 0, '', 0),
      borong(brg('B13', 'Baskom kecil', 5000, 8000, 24), 12, 'lusin', 85000),
      borong(brg('B14', 'Ember 20 liter', 22000, 32000, 18), 0, '', 0),
      borong(brg('B15', 'Gayung plastik', 4000, 7000, 40), 12, 'lusin', 76000),
      borong(brg('B16', 'Galon kosong', 45000, 58000, 12), 0, '', 0),
      borong(brg('B17', 'Sabut cuci piring', 300, 1000, 200), 20, 'kodi', 17000),
      borong(brg('B18', 'Sikat gosok lantai', 2500, 5000, 35), 0, '', 0),
      borong(brg('B19', 'Sapu lidi', 3000, 6000, 28), 0, '', 0),
      borong(brg('B20', 'Toples kue bulat', 11000, 16000, 24), 6, 'pak', 90000)
    ],
    transaksi: [],
    barangMasuk: [],
    pelanggan: [],    // pelanggan tetap toko
    tertahan: [],     // keranjang yang ditahan sementara
    arsip: {},        // rekap bulanan dari nota yang sudah diringkas
    catatan: [],      // buku catatan: siapa mengubah apa, kapan
    tutupKasir: [],   // setoran akhir giliran
    nomorTerakhir: 0,
    terakhirCadangan: null
  };
}

/** Menambal bidang yang hilang, supaya cadangan versi lama tetap bisa dipakai. */
function lengkapi(data) {
  const awal = dataAwal();
  const hasil = Object.assign({}, awal, data);
  hasil.toko = Object.assign({}, awal.toko, data.toko || {});
  ['petugas', 'barang', 'transaksi', 'barangMasuk', 'catatan', 'tutupKasir', 'tertahan',
    'pelanggan'].forEach(k => {
    if (!Array.isArray(hasil[k])) hasil[k] = [];
  });
  // Peran disimpan sebagai dua nilai tetap. Data lama memakai tulisan bebas,
  // jadi apa pun yang bukan "pemilik" dianggap karyawan.
  hasil.petugas.forEach(p => {
    p.id ??= idBaru();
    p.peran = String(p.peran || '').toLowerCase().includes('pemilik') ? 'pemilik' : 'karyawan';
  });
  if (hasil.petugas.length && !hasil.petugas.some(p => p.peran === 'pemilik')) {
    hasil.petugas[0].peran = 'pemilik';   // harus selalu ada satu pemilik
  }
  hasil.barang.forEach(b => {
    b.id ??= idBaru();
    b.satuan ??= 'pcs';
    b.gambar ??= '';   // kosong berarti ikon ditebak dari nama barang
    // harga borongan; grosirJumlah 0 berarti barang ini hanya dijual satuan
    b.grosirJumlah = Number(b.grosirJumlah) || 0;
    b.grosirSatuan = b.grosirSatuan || 'lusin';
    b.grosirHarga = Number(b.grosirHarga) || 0;
    b.stokMinimum ??= 5;
    b.stok = Number(b.stok) || 0;
    b.hargaBeli = Number(b.hargaBeli) || 0;
    b.hargaJual = Number(b.hargaJual) || 0;
  });
  if (!hasil.arsip || typeof hasil.arsip !== 'object') hasil.arsip = {};
  hasil.nomorTerakhir = Number(hasil.nomorTerakhir) || 0;
  return hasil;
}

let perluPanduanAwal = false;   // benar hanya saat aplikasi dibuka pertama kali
let db = muatData();
let petugasSekarang = null;
let keranjang = [];

function muatData() {
  try {
    const teks = localStorage.getItem(KUNCI_SIMPAN);
    if (teks) return lengkapi(JSON.parse(teks));
  } catch (e) {
    console.error('Gagal membaca data tersimpan:', e);
  }
  const baru = dataAwal();
  perluPanduanAwal = true;
  simpanData(baru);
  return baru;
}

function simpanData(data = db) {
  try {
    localStorage.setItem(KUNCI_SIMPAN, JSON.stringify(data));
    // Setiap perubahan data ikut menyegarkan katalog pelanggan. Dibungkus
    // karena saat aplikasi baru dinyalakan datanya memang belum siap.
    try { perbaruiKatalogOtomatis(); } catch (e) { /* belum siap, abaikan */ }
    return true;
  } catch (e) {
    pesan('Data GAGAL disimpan: ' + e.message, 'bahaya', 6000);
    return false;
  }
}

const cariBarang = id => db.barang.find(b => b.id === id);
const barangMenipis = () => db.barang.filter(b => b.stok <= (b.stokMinimum ?? 5));

/* ========== PELANGGAN ==========
   Satu kolom isian saja: nomor HP atau email, dikenali sendiri mana yang
   diketik. Orang di daerah lebih sering punya nomor HP daripada email, dan
   memaksa dua kolom hanya membuat pendaftaran gagal di tengah jalan.
   Tidak ada kata sandi, tidak ada kode OTP, tidak ada akun. */

/** 0813-7189-7171, +62 813 7189 7171, dan 62 813 7189 7171 dianggap sama. */
function normalHp(teks) {
  let a = String(teks || '').replace(/\D/g, '');
  if (!a) return '';
  if (a.startsWith('62')) a = a.slice(2);
  else if (a.startsWith('0')) a = a.slice(1);
  return a.length >= 8 && a.length <= 13 ? '62' + a : '';
}
const tampilHp = hp => !hp ? '' : '0' + hp.slice(2).replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
const adalahEmail = teks => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(teks || '').trim());

/** Memilah satu isian bebas menjadi nomor HP atau email. */
function pilahKontak(teks) {
  const isi = String(teks || '').trim();
  if (!isi) return { hp: '', email: '', sah: false };
  if (adalahEmail(isi)) return { hp: '', email: isi.toLowerCase(), sah: true };
  const hp = normalHp(isi);
  return { hp, email: '', sah: !!hp };
}

const cariPelanggan = id => db.pelanggan.find(p => p.id === id);

function pelangganSerupa(hp, email, kecuali = null) {
  return db.pelanggan.find(p => p.id !== kecuali &&
    ((hp && p.hp === hp) || (email && p.email === email)));
}

/** Menambah atau memperbarui pelanggan. Mengembalikan pesan galat bila gagal. */
function simpanPelanggan({ id, nama, kontak, catatan }) {
  nama = String(nama || '').trim();
  if (!nama) return 'Nama pelanggan belum diisi.';
  const { hp, email, sah } = pilahKontak(kontak);
  if (!sah) return 'Isi nomor HP yang benar, atau alamat email.';

  const kembar = pelangganSerupa(hp, email, id);
  if (kembar) return `Sudah terdaftar atas nama ${kembar.nama}.`;

  if (id) {
    Object.assign(cariPelanggan(id), { nama, hp, email, catatan: catatan || '' });
    catat('sistem', `Mengubah data pelanggan "${nama}"`);
  } else {
    db.pelanggan.push({
      id: idBaru(), nama, hp, email, catatan: catatan || '',
      dibuatPada: new Date().toISOString(),
      totalBelanja: 0, jumlahNota: 0, terakhirBelanja: null
    });
    catat('sistem', `Mendaftarkan pelanggan baru "${nama}" (${tampilHp(hp) || email})`);
  }
  simpanData();
  return '';
}

function catatBelanjaPelanggan(id, nilai, waktu) {
  const p = cariPelanggan(id);
  if (!p) return;
  p.totalBelanja = Math.max(0, (p.totalBelanja || 0) + nilai);
  p.jumlahNota = Math.max(0, (p.jumlahNota || 0) + (nilai > 0 ? 1 : -1));
  if (nilai > 0) p.terakhirBelanja = waktu;
}


/* ========== PENYIMPANAN DAN PENGARSIPAN ==========
   Penyimpanan browser hanya sekitar 5 MB, sedangkan satu nota memakan
   kira-kira 630 huruf. Pada 60 nota sehari jatah itu habis dalam empat
   bulan, dan begitu penuh penjualan berikutnya GAGAL tersimpan. Karena itu
   nota lama diringkas sendiri jadi rekap bulanan: omzet, untung, jumlah
   nota, dan barang terjual tetap utuh untuk laporan, hanya rinciannya yang
   dipadatkan. Cadangan lengkap selalu diunduh lebih dulu. */

const BATAS_HURUF = 2400000;      // kira-kira 5 MB dalam huruf
const AMBANG_PERINGATAN = 70;     // persen, mulai mengingatkan
const AMBANG_RAPIKAN = 85;        // persen, mulai merapikan sendiri
const SASARAN_SETELAH = 60;       // persen, berhenti merapikan bila sudah di bawah ini

function ukuranData() {
  try { return JSON.stringify(db).length; } catch (e) { return 0; }
}
function persenPenyimpanan() {
  return Math.min(100, Math.round(ukuranData() / BATAS_HURUF * 100));
}

const kunciBulan = waktu => String(waktu).slice(0, 7);   // '2026-09'

/** Memindahkan satu nota ke rekap bulanan. Nota batal cukup dibuang. */
function ringkasKeArsip(trx) {
  const bulan = kunciBulan(trx.waktu);
  db.arsip = db.arsip || {};
  const rekap = db.arsip[bulan] = db.arsip[bulan] ||
    { omzet: 0, laba: 0, jumlahNota: 0, jumlahBarang: 0, perPetugas: {}, perBarang: {} };

  rekap.omzet += trx.total;
  rekap.laba += labaTransaksi(trx);
  rekap.jumlahNota += 1;
  trx.item.forEach(i => {
    const biji = i.jumlah * (i.pengali || 1);
    rekap.jumlahBarang += biji;
    const b = rekap.perBarang[i.nama] = rekap.perBarang[i.nama] || { jumlah: 0, omzet: 0 };
    b.jumlah += biji;
    b.omzet += i.hargaJual * i.jumlah;
  });
  const p = rekap.perPetugas[trx.petugas] = rekap.perPetugas[trx.petugas] || { nota: 0, omzet: 0 };
  p.nota += 1;
  p.omzet += trx.total;
}

function arsipkanSebelum(batasWaktu) {
  const sisa = [];
  let jumlah = 0;
  db.transaksi.forEach(t => {
    if (new Date(t.waktu).getTime() < batasWaktu) {
      if (!t.batal) ringkasKeArsip(t);
      jumlah += 1;
    } else sisa.push(t);
  });
  db.transaksi = sisa;
  return jumlah;
}

function pangkas(nama, batas) {
  const daftar = db[nama];
  if (Array.isArray(daftar) && daftar.length > batas) daftar.splice(0, daftar.length - batas);
}

function rapikanPenyimpanan(paksa = false) {
  if (!paksa && persenPenyimpanan() < AMBANG_RAPIKAN) return 0;

  unduhCadangan(true);   // cadangan lengkap dulu, tanpa pesan

  let diarsipkan = 0;
  for (const bulan of [6, 3, 1]) {
    if (persenPenyimpanan() < SASARAN_SETELAH) break;
    diarsipkan += arsipkanSebelum(Date.now() - bulan * 30 * 86400000);
  }
  pangkas('barangMasuk', 1500);
  pangkas('catatan', 3000);
  pangkas('tutupKasir', 500);

  if (diarsipkan) {
    catat('sistem', `Merapikan penyimpanan: ${diarsipkan} nota lama diringkas jadi rekap bulanan`);
  }
  simpanData();
  return diarsipkan;
}

/** Dijalankan saat petugas masuk, bukan saat sedang melayani pembeli. */
function periksaPenyimpanan() {
  const persen = persenPenyimpanan();
  if (persen >= AMBANG_RAPIKAN) {
    const jumlah = rapikanPenyimpanan(true);
    if (jumlah) {
      pesan(`Penyimpanan dirapikan: ${angka(jumlah)} nota lama diringkas. Cadangan lengkapnya terunduh.`,
        'sukses', 8000);
    }
    return;
  }
  if (persen >= AMBANG_PERINGATAN && db.toko.peringatanPenyimpanan !== kunciTanggal()) {
    db.toko.peringatanPenyimpanan = kunciTanggal();
    simpanData();
    pesan(`Penyimpanan terpakai ${persen}%. Nota lama akan diringkas sendiri sebentar lagi.`,
      'peringatan', 8000);
  }
}

/* ----- peran ----- */
const labelPeran = p => (p?.peran === 'pemilik' ? 'Pemilik' : 'Karyawan');
const bolehPemilik = () => petugasSekarang?.peran === 'pemilik';
const jumlahPemilik = () => db.petugas.filter(p => p.peran === 'pemilik').length;

/** Layar yang hanya boleh dibuka pemilik. */
const LAYAR_PEMILIK = ['layar-pengaturan', 'layar-catatan'];

/* ----- buku catatan -----
   Catatan hanya ditambah, tidak pernah diubah. Dibatasi 3.000 baris terakhir
   supaya jatah penyimpanan browser tidak habis dan penjualan tetap bisa
   tersimpan; yang terlama gugur lebih dulu. */
const BATAS_CATATAN = 3000;

function catat(jenis, teks) {
  db.catatan.push({
    id: idBaru(),
    waktu: new Date().toISOString(),
    petugas: petugasSekarang?.nama || 'Sistem',
    peran: petugasSekarang ? labelPeran(petugasSekarang) : '-',
    jenis, teks
  });
  if (db.catatan.length > BATAS_CATATAN) db.catatan.splice(0, db.catatan.length - BATAS_CATATAN);
}


/* ========== 3. PERPINDAHAN LAYAR ========== */

/** Dipanggil tepat saat sebuah layar ditampilkan. */
const saatTampil = {
  'layar-beranda': () => gambarBeranda(),
  'layar-jual': () => {
    gambarKategoriJual(); gambarPilihanBarang(); gambarKeranjang(); gambarTertahan();
    setTimeout(() => $('#cari-barang-jual').focus(), 80);
  },
  'layar-barang': () => gambarTabelBarang(),
  'layar-pelanggan': () => gambarTabelPelanggan(),
  'layar-masuk-barang': () => { gambarPilihanMasuk(); gambarRiwayatMasuk(); },
  'layar-laporan': () => gambarLaporan(),
  'layar-tutup-kasir': () => gambarTutupKasir(),
  'layar-catatan': () => gambarCatatan(),
  'layar-pengaturan': () => gambarPengaturan()
};

function gantiLayar(idLayar) {
  if (LAYAR_PEMILIK.includes(idLayar) && !bolehPemilik()) {
    pesan('Menu itu hanya untuk pemilik toko.', 'peringatan');
    idLayar = 'layar-beranda';
  }
  $$('.layar').forEach(l => l.classList.toggle('aktif', l.id === idLayar));
  $('#bilah-atas').classList.toggle('tersembunyi',
    idLayar === 'layar-masuk' || idLayar === 'layar-kunci');
  window.scrollTo(0, 0);
  saatTampil[idLayar]?.();
}


/* ========== 4. LAYAR MASUK DAN BERANDA ========== */

/** Dua huruf awal untuk lingkaran nama, misalnya "Mr Kamal" jadi "MK". */
function inisial(nama) {
  const kata = String(nama || '?').trim().split(/\s+/);
  return ((kata[0]?.[0] || '') + (kata[1]?.[0] || '')).toUpperCase() || '?';
}

function gambarLayarMasuk() {
  $('#judul-masuk').textContent = db.toko.nama || 'Kasir Toko';
  $('#judul-jenis').textContent = db.toko.jenis || '';
  $('#logo-toko').textContent = inisial(db.toko.nama || 'Toko');
  const kotak = $('#pilihan-petugas');
  kotak.innerHTML = '';
  db.petugas.forEach(p => {
    const b = document.createElement('button');
    b.className = 'tombol-petugas' + (p.peran === 'pemilik' ? ' pemilik' : '');
    b.innerHTML = `<span class="avatar">${inisial(p.nama)}</span>
      <span class="petugas-teks"><b>${aman(p.nama)}</b>
        <span class="lemah kecil">${labelPeran(p)}</span></span>
      <span class="panah">&rsaquo;</span>`;
    b.onclick = () => masukSebagai(p);
    kotak.appendChild(b);
  });
  if (!db.petugas.length) {
    kotak.innerHTML = '<p class="lemah">Belum ada petugas. Muat ulang halaman untuk memakai data contoh.</p>';
  }
}

/* ----- PIN pemilik -----
   Pagar ketertiban, bukan brankas: orang yang paham alat pengembang browser
   tetap bisa menembusnya. Gunanya menahan karyawan membuka laporan untung
   dan pengaturan toko, dan itu sudah cukup untuk sebuah toko. */

/** Pengacak sederhana, supaya PIN tidak terbaca telanjang di penyimpanan. */
function acakPin(pin) {
  let nilai = 5381;
  const bahan = 'manjadda' + pin + 'kubu';
  for (let i = 0; i < bahan.length; i++) nilai = ((nilai * 33) ^ bahan.charCodeAt(i)) >>> 0;
  return nilai.toString(36);
}

let gagalPin = 0;

/* ----- layar kunci di pintu depan -----
   Dipasang bila PIN diminta untuk semua petugas. Hanya halaman kasir yang
   dijaga; katalog dan layar pelanggan sengaja dibiarkan terbuka, karena
   keduanya memang dibuat untuk dilihat pembeli. */

let ketikanPin = '';

function pintuDikunci() {
  return !!db.toko.pinPemilik && (db.toko.pinUntuk || 'semua') === 'semua';
}

function gambarLayarKunci() {
  $('#kunci-logo').textContent = inisial(db.toko.nama || 'Toko');
  $('#kunci-nama').textContent = db.toko.nama || 'Kasir Toko';
  $('#kunci-jenis').textContent = db.toko.jenis || '';
  $('#kunci-catatan').innerHTML = db.toko.pinBawaan
    ? 'PIN masih bawaan pabrik: <b>123456</b>'
    : 'Halaman katalog untuk pembeli tidak memerlukan PIN.';

  $('#papan-angka').innerHTML =
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-angka="${n}">${n}</button>`).join('') +
    '<button class="kecil-teks" data-pin-hapus>HAPUS</button>' +
    '<button data-angka="0">0</button>' +
    '<button class="kecil-teks" data-pin-buka>BUKA</button>';

  ketikanPin = '';
  gambarTitikPin();
}

function gambarTitikPin() {
  $('#titik-pin').innerHTML = Array.from({ length: 6 },
    (v, i) => `<i class="${i < ketikanPin.length ? 'isi' : ''}"></i>`).join('');
}

function ketikPin(angka) {
  if (ketikanPin.length >= 6) return;
  ketikanPin += angka;
  $('#kunci-pesan').textContent = '';
  gambarTitikPin();
  // Dicoba sendiri mulai empat angka, supaya PIN pendek tidak perlu menekan BUKA.
  if (ketikanPin.length >= 4 && acakPin(ketikanPin) === db.toko.pinPemilik) bukaKunci();
  else if (ketikanPin.length === 6) cobaBukaKunci();
}

function cobaBukaKunci() {
  if (ketikanPin.length >= 4 && acakPin(ketikanPin) === db.toko.pinPemilik) { bukaKunci(); return; }
  gagalPin += 1;
  ketikanPin = '';
  gambarTitikPin();
  $('#kunci-pesan').textContent = gagalPin >= 3 ? `PIN salah ${gagalPin} kali.` : 'PIN salah. Coba lagi.';
  const kotak = $('.kunci-kotak');
  kotak.classList.remove('salah');
  void kotak.offsetWidth;          // memaksa gambar ulang supaya goyangnya terulang
  kotak.classList.add('salah');
}

function bukaKunci() {
  gagalPin = 0;
  ketikanPin = '';
  $('#kunci-pesan').textContent = '';
  gambarLayarMasuk();
  gantiLayar('layar-masuk');
}

function kunciKasir() {
  petugasSekarang = null;
  gambarLayarKunci();
  gantiLayar('layar-kunci');
}

function mintaPin(p) {
  bukaModal({
    judul: 'Masuk sebagai ' + p.nama,
    isi: `<p class="lemah">Kasir dijaga PIN. Masukkan PIN, lalu tekan Enter.</p>
      <input id="isian-pin" class="input input-besar" type="password" inputmode="numeric"
             maxlength="6" autocomplete="off" placeholder="••••••"
             style="letter-spacing:.5em;text-align:center;font-size:26px;margin-top:14px">
      <p id="pesan-pin" class="kecil" style="color:var(--bahaya);margin-top:10px;min-height:18px"></p>
      ${db.toko.pinBawaan ? `<p class="lemah kecil" style="margin-top:4px">
        PIN masih bawaan pabrik: <b>123456</b>. Gantilah lewat Pengaturan.</p>` : ''}`,
    aksi: [
      { label: 'Batal', kelas: 'tombol-netral', saatKlik: tutupModal },
      { label: 'Masuk', kelas: 'tombol-utama', saatKlik: cobaPin }
    ]
  });
  const isian = $('#isian-pin');
  isian.addEventListener('input', () => { isian.value = isian.value.replace(/\D/g, ''); });
  isian.addEventListener('keydown', e => { if (e.key === 'Enter') cobaPin(); });

  function cobaPin() {
    if (acakPin(isian.value) === db.toko.pinPemilik) {
      gagalPin = 0;
      tutupModal();
      lanjutkanMasuk(p);
      return;
    }
    gagalPin += 1;
    isian.value = '';
    $('#pesan-pin').textContent = gagalPin >= 3
      ? `PIN salah ${gagalPin} kali. Kalau lupa, PIN hanya bisa dihapus lewat pemulihan cadangan.`
      : 'PIN salah. Coba lagi.';
    isian.focus();
  }
}

function masukSebagai(p) {
  // Kalau pintu depan sudah dikunci PIN, tidak perlu bertanya dua kali.
  const perluPin = db.toko.pinPemilik && db.toko.pinUntuk === 'pemilik' && p.peran === 'pemilik';
  if (perluPin) { mintaPin(p); return; }
  lanjutkanMasuk(p);
}

function lanjutkanMasuk(p) {
  petugasSekarang = p;
  $('#bilah-nama-toko').textContent = db.toko.nama || 'Kasir Toko';
  $('#bilah-petugas').textContent = p.nama + ' - ' + labelPeran(p);
  $('#bilah-tanggal').textContent = tanggalPanjang(new Date());
  terapkanHakAkses();
  gantiLayar('layar-beranda');
  pesan(`${salamWaktu()}, ${p.nama}. Selamat bekerja!`, 'sukses', 4000);
  // Dua pemeriksaan ini sengaja di sini: saat petugas baru masuk, bukan
  // saat sedang melayani pembeli.
  setTimeout(() => { periksaPenyimpanan(); ingatkanCadangan(); }, 1200);
}

/* ----- cadangan mingguan -----
   Aplikasi tidak bisa menyimpan berkas ke komputer tanpa persetujuan, jadi
   yang dilakukan adalah mengingatkan dengan tegas dan menyediakan satu
   ketukan. Peringatan hanya muncul sekali sehari, dan hanya untuk pemilik. */
function ingatkanCadangan() {
  if (!bolehPemilik()) return;
  if (!db.transaksi.length) return;
  if (db.toko.ingatCadangan === kunciTanggal()) return;

  const hari = db.terakhirCadangan
    ? Math.floor((Date.now() - new Date(db.terakhirCadangan).getTime()) / 86400000)
    : null;
  if (hari !== null && hari < 7) return;

  db.toko.ingatCadangan = kunciTanggal();
  simpanData();

  bukaModal({
    judul: 'Saatnya mencadangkan data',
    isi: `<p>${hari === null
      ? 'Catatan toko <b>belum pernah dicadangkan</b> sama sekali.'
      : `Cadangan terakhir <b>${angka(hari)} hari</b> yang lalu.`}</p>
      <p style="margin-top:12px">Seluruh data toko hanya tersimpan di browser perangkat ini.
      Kalau riwayat browser dibersihkan atau perangkatnya rusak, catatan
      <b>${angka(db.transaksi.length)} nota</b> ikut hilang dan tidak bisa dikembalikan.</p>
      <p class="lemah kecil" style="margin-top:12px">Berkasnya masuk ke folder Unduhan.
      Simpanlah di flashdisk atau Google Drive.</p>`,
    aksi: [
      { label: 'Nanti saja', kelas: 'tombol-netral', saatKlik: tutupModal },
      {
        label: 'Unduh Cadangan Sekarang', kelas: 'tombol-sukses', saatKlik: () => {
          unduhCadangan();
          tutupModal();
        }
      }
    ]
  });
}

/** Menyembunyikan menu dan tombol yang hanya boleh dipakai pemilik. */
function terapkanHakAkses() {
  const pemilik = bolehPemilik();
  $$('[data-peran="pemilik"]').forEach(el => el.classList.toggle('tersembunyi', !pemilik));
}

/* ----- sapaan di beranda -----
   Sapaan yang baik membawa kabar, bukan sekadar basa-basi. Pemilik langsung
   tahu keadaan tokonya pada baris pertama, tanpa perlu membuka laporan. */

function salamWaktu() {
  const jam = new Date().getHours();
  if (jam < 11) return 'Selamat pagi';
  if (jam < 15) return 'Selamat siang';
  if (jam < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function kabarToko(pemilik, trxHariIni, omzet, menipis) {
  const kabar = [];
  if (!trxHariIni.length) {
    kabar.push(pemilik ? 'Belum ada penjualan hari ini.' : 'Belum ada nota atas nama Anda hari ini.');
  } else {
    kabar.push(`${angka(trxHariIni.length)} nota hari ini, ${rupiah(omzet)}.`);
  }
  if (pemilik) {
    if (menipis.length) kabar.push(`${angka(menipis.length)} barang perlu dibelanjakan.`);
    const tertahan = (db.tertahan || []).length;
    if (tertahan) kabar.push(`${angka(tertahan)} keranjang masih ditahan.`);
  }
  return kabar.join(' ');
}

function gambarSapaan(pemilik, trxHariIni, omzet, menipis) {
  const nama = petugasSekarang?.nama || '';
  const tanggal = new Date().toLocaleDateString('id-ID',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  $('#sapaan-beranda').innerHTML = `
    <div class="sapaan ${pemilik ? 'pemilik' : ''}">
      <span class="avatar-sapaan">${aman(inisial(nama || 'P'))}</span>
      <div class="isi-sapaan">
        <b>${salamWaktu()}, ${aman(nama)}</b>
        <span class="tanggal-sapaan">${aman(tanggal)}</span>
        <span class="kabar-sapaan">${aman(kabarToko(pemilik, trxHariIni, omzet, menipis))}</span>
      </div>
      ${pemilik ? '<span class="lencana lencana-baik">Pemilik</span>' : ''}
    </div>`;
}

function gambarBeranda() {
  const hariIni = kunciTanggal();
  const pemilik = bolehPemilik();
  let trxHariIni = db.transaksi.filter(t => !t.batal && kunciTanggal(t.waktu) === hariIni);
  // Karyawan hanya melihat hasil kerjanya sendiri, bukan omzet seluruh toko.
  if (!pemilik) trxHariIni = trxHariIni.filter(t => t.petugas === petugasSekarang?.nama);

  const omzet = trxHariIni.reduce((j, t) => j + t.total, 0);
  const laba = trxHariIni.reduce((j, t) => j + labaTransaksi(t), 0);
  const menipis = barangMenipis();
  gambarSapaan(pemilik, trxHariIni, omzet, menipis);

  $('#ringkas-beranda').innerHTML = `
    <div class="ringkas"><div class="label">${pemilik ? 'Omzet Hari Ini' : 'Penjualan Saya Hari Ini'}</div>
      <div class="nilai hijau">${rupiah(omzet)}</div></div>
    ${pemilik ? `<div class="ringkas"><div class="label">Untung Hari Ini</div><div class="nilai">${rupiah(laba)}</div></div>` : ''}
    <div class="ringkas"><div class="label">${pemilik ? 'Transaksi Hari Ini' : 'Nota Saya Hari Ini'}</div>
      <div class="nilai">${angka(trxHariIni.length)}</div></div>
    <div class="ringkas klik" data-buka-menipis><div class="label">Stok Menipis</div>
      <div class="nilai ${menipis.length ? 'jingga' : ''}">${angka(menipis.length)} barang</div></div>`;

  const catatan = [];
  if (menipis.length) {
    catatan.push(`<div class="kartu"><b>Perlu belanja:</b> ${
      menipis.slice(0, 6).map(b => `${aman(b.nama)} <span class="lencana lencana-peringatan">sisa ${b.stok}</span>`).join(', ')
    }${menipis.length > 6 ? ', dan lainnya' : ''}.</div>`);
  }
  const perluCadangan = pemilik && db.transaksi.length > 0 && (!db.terakhirCadangan ||
    (Date.now() - new Date(db.terakhirCadangan).getTime()) > 7 * 86400000);
  if (perluCadangan) {
    catatan.push(`<div class="kartu"><b>Ingat:</b> data hanya tersimpan di browser laptop ini.
      Buka <b>Pengaturan &rarr; Unduh Cadangan</b> supaya catatan toko aman.</div>`);
  }
  $('#catatan-beranda').innerHTML = catatan.join('');
}


/* Pustaka ikon barang ada di berkas terpisah ikon-barang.js, karena
   dipakai juga oleh pelanggan.html dan katalog.html. */


/* ========== 4c. SIARAN KE LAYAR PELANGGAN ==========
   Layar pelanggan adalah halaman terpisah (pelanggan.html) yang dibuka di
   monitor kedua menghadap pembeli. Isinya selalu mengikuti keranjang di sini.

   Dikirim lewat dua jalan sekaligus supaya tidak pernah gagal:
   BroadcastChannel (seketika) dan localStorage (cadangan untuk browser lama,
   sekaligus membuat layar pelanggan langsung terisi saat baru dibuka). */

const SALURAN_PELANGGAN = 'kasirManjadda.pelanggan';
let siaranPelanggan = null;
try { siaranPelanggan = new BroadcastChannel(SALURAN_PELANGGAN); } catch (e) { siaranPelanggan = null; }

function kirimKePelanggan(data) {
  data.waktu = Date.now();
  try { localStorage.setItem(SALURAN_PELANGGAN, JSON.stringify(data)); } catch (e) { /* penuh, abaikan */ }
  try { siaranPelanggan?.postMessage(data); } catch (e) { /* jendela tertutup */ }
}

/* Identitas toko yang ikut dikirim ke layar pembeli. Saat keranjang kosong,
   layar itu memakainya sebagai papan iklan: nama, slogan, jam buka, alamat,
   dan spanduk promo, supaya tidak pernah terlihat mati. */
function tokoUntukLayar() {
  return {
    nama: db.toko.nama, jenis: db.toko.jenis, slogan: db.toko.slogan || '',
    alamat: db.toko.alamat || '', telepon: db.toko.telepon || '',
    jamBuka: db.toko.jamBuka || '', catatanStruk: db.toko.catatanStruk,
    promo: Array.isArray(db.toko.promo) ? db.toko.promo : []
  };
}

function siarkanKePelanggan() {
  const subtotal = keranjang.reduce((j, i) => j + i.hargaJual * i.jumlah, 0);
  const diskon = Math.min(nilaiAngka($('#diskon')), subtotal);
  const total = subtotal - diskon;
  const bayar = nilaiAngka($('#bayar'));
  kirimKePelanggan({
    status: keranjang.length ? 'belanja' : 'kosong',
    toko: tokoUntukLayar(),
    petugas: petugasSekarang?.nama || '',
    item: keranjang.map(i => ({
      nama: i.nama, jumlah: i.jumlah, hargaJual: i.hargaJual,
      gambar: cariBarang(i.idBarang)?.gambar || ''
    })),
    subtotal, diskon, total, bayar, kembalian: bayar - total
  });
}

/** Layar ucapan terima kasih, bertahan sampai barang berikutnya dipindai. */
function siarkanSelesai(trx) {
  kirimKePelanggan({
    status: 'selesai',
    toko: tokoUntukLayar(),
    petugas: trx.petugas, nomor: trx.nomor,
    item: trx.item.map(i => ({ nama: i.nama, jumlah: i.jumlah, hargaJual: i.hargaJual, gambar: '' })),
    subtotal: trx.subtotal, diskon: trx.diskon, total: trx.total,
    bayar: trx.bayar, kembalian: trx.kembalian
  });
}

/* ========== 5. LAYAR JUAL ========== */

/* Semua hitungan stok memakai satuan terkecil (biji). Satu lusin di keranjang
   berarti 12 biji, supaya stok tidak pernah salah hitung. */
const punyaGrosir = b => b && b.grosirJumlah > 1 && b.grosirHarga > 0;

function stokTersedia(barang) {
  const diKeranjang = keranjang
    .filter(i => i.idBarang === barang.id)
    .reduce((j, i) => j + i.jumlah * (i.pengali || 1), 0);
  return barang.stok - diKeranjang;
}

let kategoriJual = 'Semua';

/** Baris kategori di layar jual, disusun dari barang yang benar-benar ada. */
function gambarKategoriJual() {
  const ada = [...new Set(db.barang.map(kategoriBarang))].sort();
  if (!ada.includes(kategoriJual)) kategoriJual = 'Semua';
  $('#kategori-jual').innerHTML = ['Semua', ...ada].map(k =>
    `<button class="chip ${k === kategoriJual ? 'aktif' : ''}" data-kategori-jual="${aman(k)}">${aman(k)}</button>`).join('');
  $('#kategori-jual').classList.toggle('tersembunyi', ada.length < 2);
}

function gambarPilihanBarang() {
  const cari = $('#cari-barang-jual').value.trim().toLowerCase();
  const daftar = db.barang
    .filter(b => kategoriJual === 'Semua' || kategoriBarang(b) === kategoriJual)
    .filter(b => !cari || b.nama.toLowerCase().includes(cari) || (b.kode || '').toLowerCase().includes(cari))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

  const kotak = $('#grid-barang-jual');
  if (!daftar.length) {
    kotak.innerHTML = `<div class="kosong">Barang tidak ditemukan.<br>
      Tambahkan lewat menu <b>Daftar Barang</b>.</div>`;
    return;
  }
  kotak.innerHTML = daftar.map(b => {
    const sisa = stokTersedia(b);
    const kelas = sisa <= 0 ? 'habis' : (sisa <= (b.stokMinimum ?? 5) ? 'menipis' : '');
    return `<button class="kartu-barang" data-tambah="${b.id}" ${sisa <= 0 ? 'disabled' : ''}>
      ${ikonBarang(b)}
      <span class="nama">${aman(b.nama)}</span>
      <span class="harga">${rupiah(b.hargaJual)}</span>
      ${punyaGrosir(b) ? `<span class="harga-grosir">${rupiah(b.grosirHarga)} / ${aman(b.grosirSatuan)}</span>` : ''}
      <span class="stok ${kelas}">${sisa <= 0 ? 'Stok habis' : 'Sisa ' + angka(sisa) + ' ' + aman(b.satuan)}</span>
    </button>`;
  }).join('');
}

/** Barang yang punya harga lusinan menanyakan dulu: satuan atau lusinan. */
function tambahKeKeranjang(idBarang, jumlah = 1, cara = null) {
  const barang = cariBarang(idBarang);
  if (!barang) return;

  if (punyaGrosir(barang) && !cara) {
    bukaModal({
      judul: barang.nama,
      isi: `<p class="lemah">Dijual dua cara. Pilih yang diminta pembeli.</p>
        <div class="pilih-cara">
          <button data-cara="satuan">
            <b>Satuan</b>
            <span class="harga-cara">${rupiah(barang.hargaJual)}</span>
            <span class="lemah kecil">per ${aman(barang.satuan)}</span>
          </button>
          <button data-cara="grosir">
            <b>Per ${aman(barang.grosirSatuan)}</b>
            <span class="harga-cara">${rupiah(barang.grosirHarga)}</span>
            <span class="lemah kecil">isi ${angka(barang.grosirJumlah)} ${aman(barang.satuan)}
              &middot; ${rupiah(barang.grosirHarga / barang.grosirJumlah)} per ${aman(barang.satuan)}</span>
          </button>
        </div>`,
      aksi: [{ label: 'Batal', kelas: 'tombol-netral', saatKlik: tutupModal }]
    });
    $$('#modal-isi [data-cara]').forEach(t => t.onclick = () => {
      tutupModal();
      tambahKeKeranjang(idBarang, jumlah, t.dataset.cara);
    });
    return;
  }

  const grosir = cara === 'grosir';
  const pengali = grosir ? barang.grosirJumlah : 1;
  const butuh = jumlah * pengali;
  if (stokTersedia(barang) < butuh) {
    pesan(`Stok ${barang.nama} tinggal ${stokTersedia(barang)} ${barang.satuan}.`, 'peringatan', 4000);
    return;
  }

  const adaDiKeranjang = keranjang.find(i => i.idBarang === idBarang && (i.pengali || 1) === pengali);
  if (adaDiKeranjang) {
    adaDiKeranjang.jumlah += jumlah;
    barisTerakhirDitambah = keranjang.indexOf(adaDiKeranjang);
  } else {
    keranjang.push({
      idBarang, kode: barang.kode, nama: barang.nama,
      satuan: grosir ? barang.grosirSatuan : barang.satuan,
      pengali,
      hargaJual: grosir ? barang.grosirHarga : barang.hargaJual,
      hargaBeli: barang.hargaBeli * pengali,
      jumlah
    });
    barisTerakhirDitambah = keranjang.length - 1;
  }
  gambarKeranjang();
  gambarPilihanBarang();
  const daftar = $('#daftar-keranjang');
  if (daftar) daftar.scrollTop = daftar.scrollHeight;
}

function ubahJumlah(indeks, jumlahBaru) {
  const item = keranjang[indeks];
  if (!item) return;
  const barang = cariBarang(item.idBarang);
  const pengali = item.pengali || 1;
  // sisa stok untuk baris ini, tanpa menghitung baris ini sendiri
  const dipakaiBarisLain = keranjang
    .filter((x, u) => x.idBarang === item.idBarang && u !== indeks)
    .reduce((j, x) => j + x.jumlah * (x.pengali || 1), 0);
  const batas = barang ? Math.floor((barang.stok - dipakaiBarisLain) / pengali) : item.jumlah;

  if (jumlahBaru <= 0) { keranjang.splice(indeks, 1); }
  else if (jumlahBaru > batas) {
    item.jumlah = Math.max(batas, 0);
    if (batas <= 0) keranjang.splice(indeks, 1);
    pesan(`Stok ${item.nama} hanya cukup untuk ${angka(Math.max(batas, 0))} ${item.satuan}.`, 'peringatan', 4000);
  } else item.jumlah = jumlahBaru;
  gambarKeranjang();
  gambarPilihanBarang();
}

/* ----- pelanggan pada nota yang sedang dilayani ----- */
let pelangganJual = null;

function gambarPelangganJual() {
  const p = pelangganJual ? cariPelanggan(pelangganJual) : null;
  if (!p) pelangganJual = null;
  $('#nama-pelanggan-jual').textContent = p ? p.nama : 'Pembeli umum';
  $('#baris-pelanggan').classList.toggle('terpilih', !!p);
  $('#ganti-pelanggan').textContent = p ? 'ganti' : 'pilih';
}

function pilihPelangganJual() {
  const daftar = db.pelanggan.slice().sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  bukaModal({
    judul: 'Belanja atas nama siapa?',
    isi: `<input id="cari-pl-jual" class="input input-besar" type="search"
             placeholder="Cari nama atau nomor HP..." autocomplete="off">
      <div id="hasil-pl-jual" class="daftar-sederhana" style="margin-top:14px;max-height:46vh;overflow:auto"></div>`,
    aksi: [
      { label: 'Pembeli umum', kelas: 'tombol-netral', saatKlik: () => {
          pelangganJual = null; gambarPelangganJual(); tutupModal();
        } },
      { label: '＋ Pelanggan Baru', kelas: 'tombol-utama', saatKlik: () => {
          tutupModal();
          formPelanggan();
        } }
    ]
  });

  const gambarHasil = () => {
    const cari = $('#cari-pl-jual').value.trim().toLowerCase();
    const cocok = daftar.filter(p => !cari || p.nama.toLowerCase().includes(cari) ||
      (p.hp || '').includes(cari.replace(/\D/g, ''))).slice(0, 40);
    $('#hasil-pl-jual').innerHTML = cocok.length ? cocok.map(p => `
      <button class="baris-daftar" data-pilih-pl="${p.id}" style="cursor:pointer;text-align:left;font-family:inherit">
        <span><b>${aman(p.nama)}</b><br><span class="lemah kecil">${aman(p.hp ? tampilHp(p.hp) : p.email)}
          ${p.jumlahNota ? ` &middot; ${angka(p.jumlahNota)} nota &middot; ${rupiah(p.totalBelanja)}` : ''}</span></span>
      </button>`).join('')
      : `<div class="kosong">${db.pelanggan.length ? 'Tidak ditemukan.' : 'Belum ada pelanggan terdaftar.'}</div>`;
  };
  gambarHasil();
  $('#cari-pl-jual').addEventListener('input', gambarHasil);
  $('#hasil-pl-jual').addEventListener('click', e => {
    const t = e.target.closest('[data-pilih-pl]');
    if (!t) return;
    pelangganJual = t.dataset.pilihPl;
    gambarPelangganJual();
    tutupModal();
  });
}

let barisTerakhirDitambah = -1;   // untuk sorotan sekejap pada barang yang baru masuk

function gambarKeranjang() {
  $('#daftar-keranjang').innerHTML = keranjang.map((item, i) => {
    const barang = cariBarang(item.idBarang);
    const borongan = (item.pengali || 1) > 1;
    return `<div class="baris-keranjang ${i === barisTerakhirDitambah ? 'baru' : ''}">
      ${ikonBarang(barang || { nama: item.nama })}
      <div class="rincian">
        <b>${aman(item.nama)}</b>
        <small>${angka(item.hargaJual)} per ${aman(item.satuan || 'pcs')}
          ${borongan ? `<span class="lencana-borong">isi ${angka(item.pengali)}</span>` : ''}</small>
      </div>
      <div class="kanan-baris">
        <span class="jumlah-rp">${angka(item.hargaJual * item.jumlah)}</span>
        <div class="sel-jumlah">
          <button data-kurang="${i}" aria-label="Kurangi">&minus;</button>
          <input type="text" inputmode="numeric" value="${item.jumlah}" data-jumlah="${i}" aria-label="Jumlah">
          <button data-tambah-satu="${i}" aria-label="Tambah">+</button>
          <button class="tombol-ikon" data-hapus="${i}" aria-label="Hapus">&times;</button>
        </div>
      </div>
    </div>`;
  }).join('');
  barisTerakhirDitambah = -1;

  const jumlahBarang = keranjang.reduce((j, i) => j + i.jumlah, 0);
  $('#keranjang-kosong').classList.toggle('tersembunyi', keranjang.length > 0);
  $('#jumlah-keranjang').textContent = angka(jumlahBarang);
  $('#jumlah-keranjang').classList.toggle('tersembunyi', keranjang.length === 0);
  $('#bilah-jumlah').textContent = angka(jumlahBarang) + ' barang';
  $('#bilah-keranjang').classList.toggle('tampil', keranjang.length > 0);
  if (!keranjang.length) document.body.classList.remove('keranjang-terbuka');
  hitungTotal();
}

let modeDiskon = 'rp';   // 'rp' atau 'persen'

function hitungTotal() {
  const subtotal = keranjang.reduce((j, i) => j + i.hargaJual * i.jumlah, 0);
  let diskon;
  if (modeDiskon === 'persen') {
    let persen = nilaiAngka($('#diskon'));
    if (persen > 100) { persen = 100; $('#diskon').value = '100'; }
    diskon = Math.round(subtotal * persen / 100);
  } else {
    diskon = nilaiAngka($('#diskon'));
    // Diskon rupiah tidak boleh melebihi belanjaan. Isian hanya ditulis ulang
    // bila ada belanjaan, supaya angka yang sedang diketik tidak terhapus.
    if (diskon > subtotal) {
      diskon = subtotal;
      if (subtotal > 0) isiUang($('#diskon'), diskon);
    }
  }
  const total = subtotal - diskon;
  const bayar = nilaiAngka($('#bayar'));
  const kembalian = bayar - total;

  $('#teks-subtotal').textContent = rupiah(subtotal);
  $('#teks-total').textContent = rupiah(total);
  $('#bilah-total').textContent = rupiah(total);
  $('#teks-kembalian').textContent = (bayar === 0 && total > 0) ? 'Rp 0' : rupiah(kembalian);
  $('#teks-kembalian').style.color = kembalian < 0 ? 'var(--bahaya)' : '';
  siarkanKePelanggan();
  return { subtotal, diskon, total, bayar, kembalian };
}

function kosongkanKeranjang() {
  keranjang = [];
  pelangganJual = null;
  gambarPelangganJual();
  $('#diskon').value = '';
  $('#bayar').value = '';
  gambarKeranjang();
  gambarPilihanBarang();
}

/* ----- menahan transaksi -----
   Pembeli lupa bawa uang, atau perlu mengambil barang lain dulu. Keranjangnya
   ditahan, kasir melayani pembeli berikutnya, lalu dilanjutkan kembali. */

function gambarTertahan() {
  const jumlah = (db.tertahan || []).length;
  $('#btn-tertahan').classList.toggle('tersembunyi', jumlah === 0);
  $('#jumlah-tertahan').textContent = angka(jumlah);
}

function tahanTransaksi() {
  if (!keranjang.length) { pesan('Keranjang masih kosong.', 'peringatan'); return; }
  db.tertahan = db.tertahan || [];
  db.tertahan.push({
    id: idBaru(), waktu: new Date().toISOString(),
    petugas: petugasSekarang?.nama || '-',
    item: keranjang.map(i => ({ ...i })),
    diskon: $('#diskon').value, modeDiskon
  });
  simpanData();
  kosongkanKeranjang();
  gambarTertahan();
  pesan('Keranjang ditahan. Lanjutkan lewat tombol Ditahan di atas.', 'sukses', 4500);
}

function daftarTertahan() {
  const daftar = db.tertahan || [];
  if (!daftar.length) { pesan('Tidak ada keranjang yang ditahan.', 'info'); return; }
  bukaModal({
    judul: 'Keranjang Ditahan',
    isi: daftar.map(t => {
      const total = t.item.reduce((j, i) => j + i.hargaJual * i.jumlah, 0);
      return `<div class="baris-daftar">
        <span><b>${rupiah(total)}</b> &middot; ${angka(t.item.reduce((j, i) => j + i.jumlah, 0))} barang
          <br><span class="lemah kecil">${waktuSingkat(t.waktu)} &middot; ${aman(t.petugas)}
          &middot; ${aman(t.item.slice(0, 3).map(i => i.nama).join(', '))}${t.item.length > 3 ? ', ...' : ''}</span></span>
        <span style="white-space:nowrap">
          <button class="tombol tombol-utama kecil" data-lanjut="${t.id}">Lanjutkan</button>
          <button class="tombol-ikon" data-buang-tahan="${t.id}" title="Buang">&times;</button>
        </span>
      </div>`;
    }).join(''),
    aksi: [{ label: 'Tutup', kelas: 'tombol-netral', saatKlik: tutupModal }]
  });
}

async function lanjutkanTertahan(id) {
  const simpanan = (db.tertahan || []).find(t => t.id === id);
  if (!simpanan) return;
  if (keranjang.length) {
    const ya = await konfirmasi('Keranjang sedang terisi',
      'Keranjang yang sekarang akan ditahan dulu, lalu yang dipilih dilanjutkan. Teruskan?',
      'Ya, tukar', false);
    if (!ya) return;
    tahanTransaksi();
  }
  keranjang = simpanan.item.map(i => ({ ...i }));
  modeDiskon = simpanan.modeDiskon || 'rp';
  $$('.saklar-diskon button').forEach(b => b.classList.toggle('aktif', b.dataset.diskon === modeDiskon));
  $('#diskon').value = simpanan.diskon || '';
  db.tertahan = db.tertahan.filter(t => t.id !== id);
  simpanData();
  gambarTertahan();
  gambarKeranjang();
  gambarPilihanBarang();
  tutupModal();
  pesan('Keranjang dilanjutkan.', 'sukses');
}

function nomorTransaksiBaru() {
  db.nomorTerakhir += 1;
  return 'TRX' + kunciTanggal().replace(/-/g, '') + '-' + String(db.nomorTerakhir).padStart(4, '0');
}

function selesaikanTransaksi() {
  if (!keranjang.length) { pesan('Keranjang masih kosong.', 'peringatan'); return; }

  // Stok dicek ulang, siapa tahu sudah berubah sejak barang dimasukkan keranjang.
  const butuhPerBarang = {};
  for (const item of keranjang) {
    const barang = cariBarang(item.idBarang);
    if (!barang) { pesan(`Barang ${item.nama} sudah tidak ada di daftar.`, 'bahaya'); return; }
    butuhPerBarang[item.idBarang] = (butuhPerBarang[item.idBarang] || 0) + item.jumlah * (item.pengali || 1);
  }
  for (const [id, butuh] of Object.entries(butuhPerBarang)) {
    const barang = cariBarang(id);
    if (barang.stok < butuh) {
      pesan(`Stok ${barang.nama} tinggal ${barang.stok} ${barang.satuan}, kurangi dulu jumlahnya.`, 'bahaya', 5000);
      return;
    }
  }

  const { subtotal, diskon, total, bayar, kembalian } = hitungTotal();
  if (bayar < total) { pesan('Uang yang diterima belum cukup.', 'peringatan'); $('#bayar').focus(); return; }

  const trx = {
    id: idBaru(),
    nomor: nomorTransaksiBaru(),
    waktu: new Date().toISOString(),
    petugas: petugasSekarang ? petugasSekarang.nama : '-',
    item: keranjang.map(i => ({ ...i })),
    subtotal, diskon, total, bayar, kembalian, batal: false,
    pelangganId: pelangganJual || '',
    pelangganNama: pelangganJual ? (cariPelanggan(pelangganJual)?.nama || '') : ''
  };

  keranjang.forEach(i => {
    const b = cariBarang(i.idBarang);
    if (b) b.stok -= i.jumlah * (i.pengali || 1);
  });
  db.transaksi.push(trx);
  if (trx.pelangganId) catatBelanjaPelanggan(trx.pelangganId, trx.total, trx.waktu);
  simpanData();

  kosongkanKeranjang();
  siarkanSelesai(trx);   // setelah keranjang dikosongkan, supaya layar ucapan tidak tertimpa
  tampilkanStruk(trx);
  pesan('Transaksi tersimpan. Kembalian ' + rupiah(kembalian), 'sukses');
}

/* ----- struk ----- */

function htmlStruk(trx) {
  const t = db.toko;
  const baris = trx.item.map(i => `
    <tr><td colspan="2">${aman(i.nama)}</td></tr>
    <tr><td>${angka(i.jumlah)} ${aman(i.satuan || '')} x ${angka(i.hargaJual)}</td><td class="kanan">${angka(i.hargaJual * i.jumlah)}</td></tr>`).join('');
  return `<div class="struk">
    <div class="tengah tebal">${aman(t.nama || 'TOKO')}</div>
    ${t.jenis ? `<div class="tengah">${aman(t.jenis)}</div>` : ''}
    ${t.alamat ? `<div class="tengah">${aman(t.alamat)}</div>` : ''}
    ${t.telepon ? `<div class="tengah">Telp. ${aman(t.telepon)}</div>` : ''}
    <hr>
    <table>
      <tr><td>No.</td><td class="kanan">${aman(trx.nomor)}</td></tr>
      <tr><td>Waktu</td><td class="kanan">${waktuSingkat(trx.waktu)}</td></tr>
      <tr><td>Kasir</td><td class="kanan">${aman(trx.petugas)}</td></tr>
      ${trx.pelangganNama ? `<tr><td>Pembeli</td><td class="kanan">${aman(trx.pelangganNama)}</td></tr>` : ''}
    </table>
    <hr>
    <table>${baris}</table>
    <hr>
    <table>
      <tr><td>Subtotal</td><td class="kanan">${angka(trx.subtotal)}</td></tr>
      ${trx.diskon ? `<tr><td>Diskon</td><td class="kanan">-${angka(trx.diskon)}</td></tr>` : ''}
      <tr class="tebal"><td>TOTAL</td><td class="kanan">${angka(trx.total)}</td></tr>
      <tr><td>Tunai</td><td class="kanan">${angka(trx.bayar)}</td></tr>
      <tr><td>Kembali</td><td class="kanan">${angka(trx.kembalian)}</td></tr>
    </table>
    <hr>
    <div class="tengah">${aman(t.catatanStruk || 'Terima kasih')}</div>
  </div>`;
}

function cetakStruk(trx) {
  $('#area-cetak').innerHTML = htmlStruk(trx);
  window.print();
}

function tampilkanStruk(trx) {
  bukaModal({
    judul: 'Struk ' + trx.nomor,
    isi: htmlStruk(trx),
    aksi: [
      { label: 'Tutup', kelas: 'tombol-netral', saatKlik: tutupModal },
      { label: 'Cetak Struk', kelas: 'tombol-utama', saatKlik: () => cetakStruk(trx) }
    ]
  });
}


/* ========== 6. LAYAR DAFTAR BARANG ========== */

let saringBarang = 'semua';

/** Pembanding untuk mengurutkan daftar barang.
    `posisi` menyimpan urutan asli pemasukan barang, dipakai untuk
    "paling baru" dan "paling lama" tanpa perlu menyimpan tanggal. */
function pembandingBarang(cara, posisi) {
  const abjad = (a, b) => a.nama.localeCompare(b.nama, 'id');
  const untung = b => b.hargaJual - b.hargaBeli;
  switch (cara) {
    case 'nama-za': return (a, b) => abjad(b, a);
    case 'jual-murah': return (a, b) => (a.hargaJual - b.hargaJual) || abjad(a, b);
    case 'jual-mahal': return (a, b) => (b.hargaJual - a.hargaJual) || abjad(a, b);
    case 'untung-besar': return (a, b) => (untung(b) - untung(a)) || abjad(a, b);
    case 'stok-sedikit': return (a, b) => (a.stok - b.stok) || abjad(a, b);
    case 'stok-banyak': return (a, b) => (b.stok - a.stok) || abjad(a, b);
    case 'baru': return (a, b) => posisi.get(b.id) - posisi.get(a.id);
    case 'lama': return (a, b) => posisi.get(a.id) - posisi.get(b.id);
    default: return abjad;
  }
}

function gambarTabelBarang() {
  const cari = $('#cari-barang').value.trim().toLowerCase();
  $('#urut-barang').value = db.toko.urutBarang || 'nama-az';
  const posisi = new Map(db.barang.map((b, i) => [b.id, i]));
  let daftar = db.barang.slice();
  if (cari) daftar = daftar.filter(b => b.nama.toLowerCase().includes(cari) || (b.kode || '').toLowerCase().includes(cari));
  if (saringBarang === 'menipis') daftar = daftar.filter(b => b.stok <= (b.stokMinimum ?? 5) && b.stok > 0);
  if (saringBarang === 'habis') daftar = daftar.filter(b => b.stok <= 0);
  daftar.sort(pembandingBarang(db.toko.urutBarang || 'nama-az', posisi));

  const jumlahStok = daftar.reduce((j, b) => j + b.stok, 0);
  $('#info-barang').innerHTML = daftar.length
    ? `Menampilkan <b>${angka(daftar.length)}</b> dari ${angka(db.barang.length)} barang,
       jumlah stok <b>${angka(jumlahStok)}</b>.`
    : '';

  $('#tabel-barang tbody').innerHTML = daftar.map(b => {
    const untung = b.hargaJual - b.hargaBeli;
    const lencana = b.stok <= 0
      ? '<span class="lencana lencana-bahaya">habis</span>'
      : (b.stok <= (b.stokMinimum ?? 5) ? '<span class="lencana lencana-peringatan">menipis</span>' : '');
    return `<tr>
      <td class="lemah">${aman(b.kode || '-')}</td>
      <td><span class="sel-nama">${ikonBarang(b, 'ikon-mini')}<b>${aman(b.nama)}</b></span></td>
      <td class="kanan">${angka(b.hargaBeli)}</td>
      <td class="kanan"><b>${angka(b.hargaJual)}</b>
        ${punyaGrosir(b) ? `<br><small class="lemah">${angka(b.grosirHarga)}/${aman(b.grosirSatuan)}</small>` : ''}</td>
      <td class="kanan" style="color:${untung >= 0 ? 'var(--sukses)' : 'var(--bahaya)'}">${angka(untung)}</td>
      <td class="tengah">${angka(b.stok)} ${aman(b.satuan)} ${lencana}</td>
      <td class="tengah" style="white-space:nowrap">${bolehPemilik() ? `
        <button class="tombol-ikon" data-ubah-barang="${b.id}" title="Ubah">&#9998;</button>
        <button class="tombol-ikon" data-hapus-barang="${b.id}" title="Hapus">&#128465;</button>`
        : '<span class="lemah kecil">&mdash;</span>'}
      </td>
    </tr>`;
  }).join('');

  $('#barang-kosong').textContent = daftar.length ? '' :
    (db.barang.length ? 'Tidak ada barang yang cocok dengan pencarian.' : 'Belum ada barang. Klik "Tambah Barang".');
  $('#tabel-barang').classList.toggle('tersembunyi', daftar.length === 0);
}

function formBarang(id = null) {
  const b = id ? cariBarang(id) : null;
  bukaModal({
    judul: b ? 'Ubah Barang' : 'Tambah Barang Baru',
    isi: `<div class="form-grid" style="margin:0">
        <label class="lebar-penuh">Nama barang
          <input id="f-nama" class="input" type="text" value="${aman(b?.nama || '')}" placeholder="Contoh: Sapu lidi"></label>
        <label>Kode <span class="lemah kecil">(boleh kosong)</span>
          <input id="f-kode" class="input" type="text" value="${aman(b?.kode || '')}"></label>
        <label>Satuan
          <input id="f-satuan" class="input" type="text" value="${aman(b?.satuan || 'pcs')}" placeholder="pcs / lusin / kg"></label>
        <label>Harga beli (modal)
          <input id="f-beli" class="input uang" type="text" inputmode="numeric" value="${b ? angka(b.hargaBeli) : ''}"></label>
        <label>Harga jual
          <input id="f-jual" class="input uang" type="text" inputmode="numeric" value="${b ? angka(b.hargaJual) : ''}"></label>
        <label>Stok saat ini
          <input id="f-stok" class="input" type="number" min="0" step="1" value="${b ? b.stok : 0}"></label>
        <label>Ingatkan bila stok tinggal
          <input id="f-minimum" class="input" type="number" min="0" step="1" value="${b ? (b.stokMinimum ?? 5) : 5}"></label>
      </div>
      <p style="margin-top:16px"><b>Harga borongan</b>
        <span class="lemah kecil">â€” kosongkan kalau barang ini hanya dijual satuan</span></p>
      <div class="form-grid" style="margin:8px 0 0">
        <label>Nama borongan
          <select id="f-grosir-satuan" class="input">
            ${['lusin', 'kodi', 'pak', 'dus', 'set', 'rim'].map(s =>
              `<option value="${s}" ${b?.grosirSatuan === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></label>
        <label>Isi per borongan
          <input id="f-grosir-jumlah" class="input" type="number" min="0" step="1"
                 value="${b?.grosirJumlah || ''}" placeholder="Contoh: 12"></label>
        <label class="lebar-penuh">Harga borongan
          <input id="f-grosir-harga" class="input uang" type="text" inputmode="numeric"
                 value="${b?.grosirHarga ? angka(b.grosirHarga) : ''}" placeholder="Contoh: 55.000"></label>
      </div>
      <p class="lemah kecil" style="margin-top:8px">Contoh: gelas Rp 5.000 satuan, satu lusin isi 12
        seharga Rp 55.000. Saat menjual, kasir tinggal memilih satuan atau lusin,
        dan stok berkurang 12 sekaligus.</p>
      <p class="lemah kecil" style="margin-top:12px">Untung per barang dihitung sendiri dari harga jual dikurangi harga beli.</p>
      <p style="margin-top:14px"><b>Gambar barang</b>
        <span class="lemah kecil">â€” kalau dibiarkan Otomatis, gambar dipilih sendiri dari nama barang</span></p>
      <input type="hidden" id="f-gambar" value="${aman(b?.gambar || '')}">
      <div class="pilih-gambar">
        <button type="button" data-pilih-gambar="" class="${b?.gambar ? '' : 'terpilih'}">
          <span class="ikon-barang">${bingkaiSvg(
            '<path d="M24 5l4.5 14.5L43 24l-14.5 4.5L24 43l-4.5-14.5L5 24l14.5-4.5z" ' + isiLembut + '/>' +
            '<path d="M24 5l4.5 14.5L43 24l-14.5 4.5L24 43l-4.5-14.5L5 24l14.5-4.5z"/>')}</span>
          Otomatis</button>
        ${Object.keys(GAMBAR_BARANG).map(k => `<button type="button" data-pilih-gambar="${k}"
          class="${b?.gambar === k ? 'terpilih' : ''}">${ikonBarang({ gambar: k })}${NAMA_GAMBAR[k]}</button>`).join('')}
      </div>`,
    aksi: [
      { label: 'Batal', kelas: 'tombol-netral', saatKlik: tutupModal },
      { label: b ? 'Simpan Perubahan' : 'Tambahkan', kelas: 'tombol-utama', saatKlik: () => simpanBarang(id) }
    ]
  });
}

function simpanBarang(id) {
  if (!bolehPemilik()) { pesan('Hanya pemilik yang boleh mengubah barang dan harga.', 'peringatan'); return; }
  const nama = $('#f-nama').value.trim();
  if (!nama) { pesan('Nama barang belum diisi.', 'peringatan'); $('#f-nama').focus(); return; }
  const isian = {
    nama,
    kode: $('#f-kode').value.trim(),
    satuan: $('#f-satuan').value.trim() || 'pcs',
    hargaBeli: nilaiAngka($('#f-beli')),
    hargaJual: nilaiAngka($('#f-jual')),
    stok: Math.max(0, parseInt($('#f-stok').value, 10) || 0),
    stokMinimum: Math.max(0, parseInt($('#f-minimum').value, 10) || 0),
    gambar: $('#f-gambar').value || '',
    grosirSatuan: $('#f-grosir-satuan').value || 'lusin',
    grosirJumlah: Math.max(0, parseInt($('#f-grosir-jumlah').value, 10) || 0),
    grosirHarga: nilaiAngka($('#f-grosir-harga'))
  };
  // harga borongan hanya berlaku kalau isi dan harganya dua-duanya terisi
  if (isian.grosirJumlah < 2 || isian.grosirHarga <= 0) {
    isian.grosirJumlah = 0;
    isian.grosirHarga = 0;
  }
  if (isian.hargaJual <= 0) { pesan('Harga jual belum diisi.', 'peringatan'); $('#f-jual').focus(); return; }

  if (id) {
    const lama = cariBarang(id);
    // Yang dicatat hanya yang benar-benar berubah, supaya buku catatan tetap terbaca.
    const ubahan = [];
    if (lama.nama !== isian.nama) ubahan.push(`nama "${lama.nama}" jadi "${isian.nama}"`);
    if (lama.hargaJual !== isian.hargaJual) ubahan.push(`harga jual ${angka(lama.hargaJual)} jadi ${angka(isian.hargaJual)}`);
    if (lama.hargaBeli !== isian.hargaBeli) ubahan.push(`harga beli ${angka(lama.hargaBeli)} jadi ${angka(isian.hargaBeli)}`);
    if (lama.stok !== isian.stok) ubahan.push(`stok ${angka(lama.stok)} jadi ${angka(isian.stok)}`);
    if (ubahan.length) catat('barang', `Mengubah ${isian.nama}: ` + ubahan.join(', '));
    Object.assign(lama, isian);
  } else {
    db.barang.push({ id: idBaru(), ...isian });
    catat('barang', `Menambah barang baru "${isian.nama}", jual ${angka(isian.hargaJual)}, stok awal ${angka(isian.stok)}`);
  }

  simpanData();
  tutupModal();
  gambarTabelBarang();
  pesan(id ? 'Barang diperbarui.' : 'Barang ditambahkan.', 'sukses');
}

async function hapusBarang(id) {
  const b = cariBarang(id);
  if (!b) return;
  if (!bolehPemilik()) { pesan('Hanya pemilik yang boleh menghapus barang.', 'peringatan'); return; }
  const ya = await konfirmasi('Hapus barang',
    `Hapus <b>${aman(b.nama)}</b> dari daftar? Riwayat penjualan yang sudah terjadi tetap tersimpan.`,
    'Ya, hapus');
  if (!ya) return;
  db.barang = db.barang.filter(x => x.id !== id);
  keranjang = keranjang.filter(i => i.idBarang !== id);
  catat('barang', `Menghapus barang "${b.nama}" (stok terakhir ${angka(b.stok)})`);
  simpanData();
  gambarTabelBarang();
  pesan('Barang dihapus.', 'sukses');
}


/* ----- isi cepat banyak barang sekaligus -----
   Mengetik seratus barang satu per satu terlalu lama, jadi daftarnya boleh
   ditulis sekaligus, satu baris satu barang, dipisah tanda titik koma. */

function formImporBarang() {
  if (!bolehPemilik()) { pesan('Hanya pemilik yang boleh mengisi daftar barang.', 'peringatan'); return; }
  bukaModal({
    judul: 'Isi Cepat Banyak Barang',
    isi: `<p class="lemah">Tulis satu barang per baris dengan urutan:</p>
      <p style="font-family:monospace;background:var(--sorot);padding:10px;border-radius:8px;font-size:14px">
        nama barang ; harga jual ; harga beli ; stok</p>
      <p class="lemah kecil">Harga beli dan stok boleh dikosongkan. Kalau nama barang sudah ada di daftar,
        harganya diperbarui dan stoknya diganti, bukan dibuat dua kali.</p>
      <textarea id="impor-teks" class="input" spellcheck="false"
        placeholder="Contoh â€” hapus tulisan ini, lalu tulis daftar Bapak sendiri:&#10;Lemari pakaian Plastik ; 450000 ; 380000 ; 3&#10;Lemari plastik TwinnPan ; 520000 ; 440000 ; 2&#10;Lemari Plastik BESTPLAST ; 610000 ; 520000 ; 2&#10;Rak piring Aluminium Master ; 185000 ; 150000 ; 6&#10;Ember plastik besar ; 35000 ; 27000 ; 12"></textarea>
      <p class="lemah kecil" style="margin-top:10px"><b>Angka contoh di atas hanya contoh.</b>
        Isi dengan harga toko Bapak yang sebenarnya.</p>`,
    aksi: [
      { label: 'Batal', kelas: 'tombol-netral', saatKlik: tutupModal },
      { label: 'Periksa & Masukkan', kelas: 'tombol-utama', saatKlik: imporBarang }
    ]
  });
}

async function imporBarang() {
  const baris = $('#impor-teks').value.split('\n');
  const tambah = [], perbarui = [], lewat = [];

  baris.forEach((b, nomorBaris) => {
    if (!b.trim()) return;
    const bagian = b.split(/[;\t]/).map(x => x.trim());
    const nama = bagian[0];
    const hargaJual = parseInt(String(bagian[1] ?? '').replace(/\D/g, ''), 10) || 0;
    const hargaBeli = parseInt(String(bagian[2] ?? '').replace(/\D/g, ''), 10) || 0;
    const stok = parseInt(String(bagian[3] ?? '').replace(/\D/g, ''), 10) || 0;

    if (!nama) { lewat.push(`Baris ${nomorBaris + 1}: nama kosong`); return; }
    if (hargaJual <= 0) { lewat.push(`Baris ${nomorBaris + 1}: "${nama}" tidak ada harga jual`); return; }

    const sudahAda = db.barang.find(x => x.nama.toLowerCase() === nama.toLowerCase());
    (sudahAda ? perbarui : tambah).push({ nama, hargaJual, hargaBeli, stok, lama: sudahAda });
  });

  if (!tambah.length && !perbarui.length) {
    pesan(lewat.length ? 'Tidak ada baris yang bisa dipakai. ' + lewat[0] : 'Daftarnya masih kosong.', 'peringatan', 5000);
    return;
  }

  const ya = await konfirmasi('Periksa dulu',
    `<b>${tambah.length}</b> barang baru akan ditambahkan.<br>
     <b>${perbarui.length}</b> barang yang sudah ada akan diperbarui harga dan stoknya.<br>
     ${lewat.length ? `<b style="color:var(--bahaya)">${lewat.length} baris dilewati:</b><br>
       <span class="kecil">${lewat.slice(0, 5).map(aman).join('<br>')}${lewat.length > 5 ? '<br>dan lainnya' : ''}</span>` : ''}`,
    'Ya, masukkan', false);
  if (!ya) return;

  tambah.forEach(x => db.barang.push({
    id: idBaru(), kode: '', nama: x.nama, satuan: 'pcs',
    hargaBeli: x.hargaBeli, hargaJual: x.hargaJual, stok: x.stok, stokMinimum: 5
  }));
  perbarui.forEach(x => Object.assign(x.lama, {
    hargaJual: x.hargaJual,
    hargaBeli: x.hargaBeli || x.lama.hargaBeli,
    stok: x.stok
  }));

  catat('barang', `Isi cepat daftar barang: ${tambah.length} barang baru, ${perbarui.length} diperbarui` +
    (lewat.length ? `, ${lewat.length} baris dilewati` : ''));
  simpanData();
  tutupModal();
  gambarTabelBarang();
  pesan(`Selesai: ${tambah.length} baru, ${perbarui.length} diperbarui.`, 'sukses', 5000);
}

function unduhDaftarBarang() {
  if (!db.barang.length) { pesan('Daftar barang masih kosong.', 'peringatan'); return; }
  const sel = n => `"${String(n).replace(/"/g, '""')}"`;
  const baris = [['Kode', 'Nama Barang', 'Satuan', 'Harga Beli', 'Harga Jual', 'Untung', 'Stok', 'Stok Minimum']
    .map(sel).join(';')];
  db.barang.slice().sort((a, b) => a.nama.localeCompare(b.nama, 'id')).forEach(b => {
    baris.push([b.kode || '', b.nama, b.satuan, b.hargaBeli, b.hargaJual,
      b.hargaJual - b.hargaBeli, b.stok, b.stokMinimum ?? 5].map(sel).join(';'));
  });
  unduhBerkas(`daftar-barang-${slugToko()}-${kunciTanggal()}.csv`, 'ï»¿' + baris.join('\r\n'), 'text/csv;charset=utf-8');
  pesan('Daftar barang diunduh. Bisa dibuka dengan Excel.', 'sukses');
}


/* ========== 6b. LAYAR DATA PELANGGAN ========== */

function gambarTabelPelanggan() {
  const cari = $('#cari-pelanggan').value.trim().toLowerCase();
  const urut = $('#urut-pelanggan').value;
  let daftar = db.pelanggan.filter(p => !cari ||
    p.nama.toLowerCase().includes(cari) ||
    (p.hp || '').includes(cari.replace(/\D/g, '')) ||
    (p.email || '').includes(cari));

  const abjad = (a, b) => a.nama.localeCompare(b.nama, 'id');
  if (urut === 'belanja') daftar.sort((a, b) => (b.totalBelanja || 0) - (a.totalBelanja || 0) || abjad(a, b));
  else if (urut === 'nama') daftar.sort(abjad);
  else if (urut === 'lama') daftar.sort((a, b) =>
    new Date(a.terakhirBelanja || a.dibuatPada) - new Date(b.terakhirBelanja || b.dibuatPada));
  else daftar.sort((a, b) => new Date(b.dibuatPada) - new Date(a.dibuatPada));

  const semuaBelanja = db.pelanggan.reduce((j, p) => j + (p.totalBelanja || 0), 0);
  $('#info-pelanggan').innerHTML = db.pelanggan.length
    ? `Menampilkan <b>${angka(daftar.length)}</b> dari ${angka(db.pelanggan.length)} pelanggan &middot;
       belanja mereka seluruhnya <b>${rupiah(semuaBelanja)}</b>`
    : '';

  $('#tabel-pelanggan tbody').innerHTML = daftar.map(p => {
    const kontak = p.hp ? tampilHp(p.hp) : (p.email || '-');
    const terakhir = p.terakhirBelanja ? waktuSingkat(p.terakhirBelanja) : 'belum pernah';
    return `<tr>
      <td><b>${aman(p.nama)}</b></td>
      <td class="lemah">${aman(kontak)}</td>
      <td class="tengah">${angka(p.jumlahNota || 0)}</td>
      <td class="kanan"><b>${angka(p.totalBelanja || 0)}</b></td>
      <td class="lemah kecil">${aman(terakhir)}</td>
      <td class="tengah" style="white-space:nowrap">
        ${p.hp ? `<button class="tombol-ikon" data-wa-pelanggan="${p.id}" title="Hubungi WhatsApp">&#128172;</button>` : ''}
        <button class="tombol-ikon" data-ubah-pelanggan="${p.id}" title="Ubah">&#9998;</button>
        ${bolehPemilik() ? `<button class="tombol-ikon" data-hapus-pelanggan="${p.id}" title="Hapus">&#128465;</button>` : ''}
      </td>
    </tr>`;
  }).join('');

  $('#pelanggan-kosong').innerHTML = daftar.length ? '' : (db.pelanggan.length
    ? 'Tidak ada pelanggan yang cocok dengan pencarian.'
    : `Belum ada pelanggan terdaftar.<br><span class="kecil">Cukup nama dan satu nomor HP.
       Pembeli juga bisa mendaftar sendiri dari halaman katalog.</span>`);
  $('#tabel-pelanggan').classList.toggle('tersembunyi', daftar.length === 0);
}

function formPelanggan(id = null, isiAwal = {}) {
  const p = id ? cariPelanggan(id) : null;
  const kontakLama = p ? (p.hp ? tampilHp(p.hp) : p.email) : (isiAwal.kontak || '');
  bukaModal({
    judul: p ? 'Ubah Data Pelanggan' : 'Daftarkan Pelanggan',
    isi: `<p class="lemah">Cukup dua isian. Tidak perlu kata sandi, tidak perlu kode apa pun.</p>
      <div class="form-grid" style="margin:16px 0 0">
        <label class="lebar-penuh">Nama pembeli
          <input id="pl-nama" class="input input-besar" type="text" autocomplete="off"
                 value="${aman(p?.nama || isiAwal.nama || '')}" placeholder="Contoh: Ibu Ani"></label>
        <label class="lebar-penuh">Nomor HP <span class="lemah kecil">atau alamat email</span>
          <input id="pl-kontak" class="input input-besar" type="text" autocomplete="off"
                 value="${aman(kontakLama || '')}" placeholder="0813-7189-7171"></label>
        <label class="lebar-penuh">Catatan <span class="lemah kecil">(boleh dikosongkan)</span>
          <input id="pl-catatan" class="input" type="text"
                 value="${aman(p?.catatan || '')}" placeholder="Contoh: warung sebelah pasar"></label>
      </div>
      <p id="pl-pesan" class="kecil" style="color:var(--bahaya);min-height:18px;margin-top:10px"></p>`,
    aksi: [
      { label: 'Batal', kelas: 'tombol-netral', saatKlik: tutupModal },
      {
        label: p ? 'Simpan' : 'Daftarkan', kelas: 'tombol-utama', saatKlik: () => {
          const galat = simpanPelanggan({
            id, nama: $('#pl-nama').value,
            kontak: $('#pl-kontak').value, catatan: $('#pl-catatan').value
          });
          if (galat) { $('#pl-pesan').textContent = galat; return; }
          tutupModal();
          gambarTabelPelanggan();
          pesan(p ? 'Data pelanggan disimpan.' : 'Pelanggan terdaftar.', 'sukses');
        }
      }
    ]
  });
}

async function hapusPelanggan(id) {
  const p = cariPelanggan(id);
  if (!p) return;
  const ya = await konfirmasi('Hapus pelanggan',
    `Hapus <b>${aman(p.nama)}</b> dari daftar? Nota lama tetap tersimpan apa adanya.`, 'Ya, hapus');
  if (!ya) return;
  db.pelanggan = db.pelanggan.filter(x => x.id !== id);
  catat('sistem', `Menghapus pelanggan "${p.nama}"`);
  simpanData();
  gambarTabelPelanggan();
  pesan('Pelanggan dihapus.', 'sukses');
}

/** Menempel pesan pendaftaran yang masuk lewat WhatsApp. */
function tempelPelanggan() {
  bukaModal({
    judul: 'Tempel dari WhatsApp',
    isi: `<p class="lemah">Salin pesan pendaftaran yang masuk dari pembeli, lalu tempel di sini.
      Nama dan nomornya dibaca sendiri.</p>
      <textarea id="pl-tempel" class="input" spellcheck="false"
        placeholder="Halo Toko Man Jadda Wajada Kubu, saya mau daftar jadi pelanggan.&#10;Nama: Ibu Ani&#10;HP/Email: 0813-7189-7171"></textarea>
      <p id="pl-tempel-pesan" class="kecil" style="min-height:18px;margin-top:8px"></p>`,
    aksi: [
      { label: 'Batal', kelas: 'tombol-netral', saatKlik: tutupModal },
      {
        label: 'Baca & Daftarkan', kelas: 'tombol-utama', saatKlik: () => {
          const teks = $('#pl-tempel').value;
          const nama = (/Nama\s*:\s*(.+)/i.exec(teks) || [])[1]?.trim() || '';
          const kontak = (/(?:HP|Email|HP\/Email|Nomor)\s*:\s*(.+)/i.exec(teks) || [])[1]?.trim() || '';
          if (!nama && !kontak) {
            $('#pl-tempel-pesan').style.color = 'var(--bahaya)';
            $('#pl-tempel-pesan').textContent = 'Tidak menemukan baris Nama dan HP di pesan itu.';
            return;
          }
          tutupModal();
          formPelanggan(null, { nama, kontak });
        }
      }
    ]
  });
}


/* ========== 7. LAYAR BARANG MASUK ========== */

function gambarPilihanMasuk() {
  const pilih = $('#masuk-barang');
  const terpilih = pilih.value;
  const daftar = db.barang.slice().sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  pilih.innerHTML = '<option value="">-- Pilih barang --</option>' +
    daftar.map(b => `<option value="${b.id}">${aman(b.nama)} (stok ${angka(b.stok)})</option>`).join('');
  if (terpilih) pilih.value = terpilih;
}

function tambahStok() {
  const id = $('#masuk-barang').value;
  const jumlah = parseInt($('#masuk-jumlah').value, 10) || 0;
  const hargaBaru = nilaiAngka($('#masuk-harga'));
  const catatan = $('#masuk-catatan').value.trim();
  const barang = cariBarang(id);

  if (!barang) { pesan('Pilih barangnya dulu.', 'peringatan'); return; }
  if (jumlah <= 0) { pesan('Jumlah masuk harus lebih dari 0.', 'peringatan'); return; }

  const stokLama = barang.stok;
  barang.stok += jumlah;
  if (hargaBaru > 0 && hargaBaru !== barang.hargaBeli) {
    catat('barang', `Harga beli ${barang.nama} berubah ${angka(barang.hargaBeli)} jadi ${angka(hargaBaru)} lewat barang masuk`);
    barang.hargaBeli = hargaBaru;
  }
  catat('stok', `Barang masuk: ${barang.nama} +${angka(jumlah)}, stok ${angka(stokLama)} jadi ${angka(barang.stok)}` +
    (catatan ? ` (${catatan})` : ''));
  db.barangMasuk.push({
    id: idBaru(), waktu: new Date().toISOString(), idBarang: barang.id, nama: barang.nama,
    jumlah, hargaBeli: barang.hargaBeli, catatan, petugas: petugasSekarang?.nama || '-'
  });
  simpanData();

  $('#masuk-jumlah').value = 1;
  $('#masuk-harga').value = '';
  $('#masuk-catatan').value = '';
  gambarPilihanMasuk();
  gambarRiwayatMasuk();
  pesan(`${barang.nama} bertambah ${jumlah}. Stok sekarang ${barang.stok}.`, 'sukses', 3500);
}

function gambarRiwayatMasuk() {
  const daftar = db.barangMasuk.slice().reverse().slice(0, 30);
  $('#tabel-masuk tbody').innerHTML = daftar.map(m => `<tr>
      <td class="lemah">${waktuSingkat(m.waktu)}</td>
      <td>${aman(m.nama)}</td>
      <td class="tengah"><b>+${angka(m.jumlah)}</b></td>
      <td class="kanan">${angka(m.hargaBeli)}</td>
      <td class="lemah">${aman(m.catatan || '-')}</td>
      <td class="lemah">${aman(m.petugas)}</td>
    </tr>`).join('');
  $('#masuk-kosong').textContent = daftar.length ? '' : 'Belum ada catatan barang masuk.';
  $('#tabel-masuk').classList.toggle('tersembunyi', daftar.length === 0);
}


/* ========== 8. LAYAR LAPORAN ========== */

const labaTransaksi = trx =>
  trx.item.reduce((j, i) => j + (i.hargaJual - (i.hargaBeli || 0)) * i.jumlah, 0) - (trx.diskon || 0);

function setRentang(nama) {
  const kini = new Date();
  let dari = new Date(kini), sampai = new Date(kini);
  if (nama === 'kemarin') { dari.setDate(dari.getDate() - 1); sampai = new Date(dari); }
  if (nama === '7hari') dari.setDate(dari.getDate() - 6);
  if (nama === 'bulan-ini') dari = new Date(kini.getFullYear(), kini.getMonth(), 1);
  if (nama === 'semua') {
    const paling = db.transaksi.reduce((p, t) => Math.min(p, new Date(t.waktu).getTime()), Date.now());
    dari = new Date(paling);
  }
  $('#dari-tanggal').value = kunciTanggal(dari);
  $('#sampai-tanggal').value = kunciTanggal(sampai);
}

function transaksiTerpilih() {
  const dari = $('#dari-tanggal').value || kunciTanggal();
  const sampai = $('#sampai-tanggal').value || kunciTanggal();
  const a = new Date(dari + 'T00:00:00').getTime();
  const b = new Date(sampai + 'T23:59:59.999').getTime();
  return db.transaksi
    .filter(t => { const w = new Date(t.waktu).getTime(); return w >= a && w <= b; })
    // Karyawan hanya melihat notanya sendiri; stok tetap satu untuk seluruh toko.
    .filter(t => bolehPemilik() || t.petugas === petugasSekarang?.nama)
    .sort((x, y) => new Date(y.waktu) - new Date(x.waktu));
}

function gambarLaporan() {
  if (!$('#dari-tanggal').value) setRentang('hari-ini');
  const semua = transaksiTerpilih();
  const sah = semua.filter(t => !t.batal);

  const omzet = sah.reduce((j, t) => j + t.total, 0);
  const laba = sah.reduce((j, t) => j + labaTransaksi(t), 0);
  const jumlahBarang = sah.reduce((j, t) => j + t.item.reduce((k, i) => k + i.jumlah * (i.pengali || 1), 0), 0);
  const rata = sah.length ? omzet / sah.length : 0;

  $('#ringkas-laporan').innerHTML = `
    <div class="ringkas"><div class="label">${bolehPemilik() ? 'Omzet' : 'Penjualan Saya'}</div>
      <div class="nilai hijau">${rupiah(omzet)}</div></div>
    ${bolehPemilik() ? `<div class="ringkas"><div class="label">Untung Kotor</div><div class="nilai">${rupiah(laba)}</div></div>` : ''}
    <div class="ringkas"><div class="label">Transaksi</div><div class="nilai">${angka(sah.length)}</div></div>
    <div class="ringkas"><div class="label">Barang Terjual</div><div class="nilai">${angka(jumlahBarang)}</div></div>
    <div class="ringkas"><div class="label">Rata-rata per Nota</div><div class="nilai">${rupiah(rata)}</div></div>`;

  // barang terlaris
  const hitung = {};
  sah.forEach(t => t.item.forEach(i => {
    hitung[i.nama] ??= { jumlah: 0, omzet: 0 };
    hitung[i.nama].jumlah += i.jumlah;
    hitung[i.nama].omzet += i.hargaJual * i.jumlah;
  }));
  const terlaris = Object.entries(hitung).sort((a, b) => b[1].jumlah - a[1].jumlah).slice(0, 6);
  const puncak = terlaris[0]?.[1].jumlah || 1;
  $('#terlaris').innerHTML = terlaris.length ? terlaris.map(([nama, d]) => `
      <div class="batang-bungkus">
        <div class="batang-label"><span>${aman(nama)}</span><b>${angka(d.jumlah)} pcs &middot; ${rupiah(d.omzet)}</b></div>
        <div class="batang"><i style="width:${(d.jumlah / puncak * 100).toFixed(1)}%"></i></div>
      </div>`).join('') : '<div class="kosong">Belum ada penjualan pada rentang ini.</div>';

  // per petugas
  const perOrang = {};
  sah.forEach(t => {
    perOrang[t.petugas] ??= { jumlah: 0, omzet: 0 };
    perOrang[t.petugas].jumlah += 1;
    perOrang[t.petugas].omzet += t.total;
  });
  const daftarOrang = Object.entries(perOrang).sort((a, b) => b[1].omzet - a[1].omzet);
  $('#per-petugas').innerHTML = daftarOrang.length ? daftarOrang.map(([nama, d]) => `
      <div class="baris-daftar"><span><b>${aman(nama)}</b><br><span class="lemah kecil">${angka(d.jumlah)} transaksi</span></span>
      <b>${rupiah(d.omzet)}</b></div>`).join('') : '<div class="kosong">Belum ada data.</div>';

  // daftar transaksi
  $('#tabel-transaksi tbody').innerHTML = semua.map(t => `
    <tr class="${t.batal ? 'batal' : ''}">
      <td>${aman(t.nomor)}${t.batal ? ' <span class="lencana lencana-bahaya">batal</span>' : ''}</td>
      <td class="lemah">${waktuSingkat(t.waktu)}</td>
      <td>${aman(t.petugas)}</td>
      <td class="tengah">${angka(t.item.reduce((j, i) => j + i.jumlah, 0))}</td>
      <td class="kanan"><b>${angka(t.total)}</b></td>
      <td class="tengah" style="white-space:nowrap">
        <button class="tombol-ikon" data-detail="${t.id}" title="Lihat detail">&#128065;</button>
        ${t.batal ? '' : `<button class="tombol-ikon" data-batalkan="${t.id}" title="Batalkan transaksi">&#8630;</button>`}
      </td>
    </tr>`).join('');
  gambarArsip();
  $('#transaksi-kosong').textContent = semua.length ? '' : 'Tidak ada transaksi pada rentang tanggal ini.';
  $('#tabel-transaksi').classList.toggle('tersembunyi', semua.length === 0);
}

/** Rekap bulan yang notanya sudah diringkas. */
function gambarArsip() {
  const arsip = db.arsip || {};
  const bulan = Object.keys(arsip).sort().reverse();
  $('#kartu-arsip').classList.toggle('tersembunyi', bulan.length === 0 || !bolehPemilik());
  if (!bulan.length) return;

  const namaBulan = kunci => {
    const [tahun, bln] = kunci.split('-');
    return new Date(Number(tahun), Number(bln) - 1, 1)
      .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  $('#tabel-arsip tbody').innerHTML = bulan.map(k => {
    const r = arsip[k];
    const terlaris = Object.entries(r.perBarang || {})
      .sort((a, b) => b[1].jumlah - a[1].jumlah).slice(0, 2)
      .map(([nama, d]) => `${aman(nama)} (${angka(d.jumlah)})`).join(', ');
    return `<tr>
      <td><b>${aman(namaBulan(k))}</b></td>
      <td class="tengah">${angka(r.jumlahNota)}</td>
      <td class="kanan">${angka(r.omzet)}</td>
      <td class="kanan">${angka(r.laba)}</td>
      <td class="tengah">${angka(r.jumlahBarang)}</td>
      <td class="lemah kecil">${terlaris || '-'}</td>
    </tr>`;
  }).join('');
}

function detailTransaksi(id) {
  const t = db.transaksi.find(x => x.id === id);
  if (!t) return;
  bukaModal({
    judul: 'Transaksi ' + t.nomor,
    isi: htmlStruk(t) + (t.batal ? `<p style="color:var(--bahaya);text-align:center"><b>Transaksi ini dibatalkan</b><br>
      <span class="kecil">${aman(t.alasanBatal || '')}</span></p>` : ''),
    aksi: [
      { label: 'Tutup', kelas: 'tombol-netral', saatKlik: tutupModal },
      { label: 'Cetak Ulang', kelas: 'tombol-utama', saatKlik: () => cetakStruk(t) }
    ]
  });
}

async function batalkanTransaksi(id) {
  const t = db.transaksi.find(x => x.id === id);
  if (!t || t.batal) return;
  // Karyawan hanya boleh membatalkan notanya sendiri, dan hanya hari itu juga.
  if (!bolehPemilik()) {
    if (t.petugas !== petugasSekarang?.nama) {
      pesan('Nota milik petugas lain hanya bisa dibatalkan pemilik.', 'peringatan', 4000); return;
    }
    if (kunciTanggal(t.waktu) !== kunciTanggal()) {
      pesan('Nota hari sebelumnya hanya bisa dibatalkan pemilik.', 'peringatan', 4000); return;
    }
  }
  const ya = await konfirmasi('Batalkan transaksi',
    `Batalkan <b>${aman(t.nomor)}</b> senilai ${rupiah(t.total)}?<br>
     Stok barangnya akan dikembalikan, dan nota ini tidak lagi dihitung dalam laporan.`,
    'Ya, batalkan');
  if (!ya) return;
  t.item.forEach(i => {
    const b = cariBarang(i.idBarang);
    if (b) b.stok += i.jumlah * (i.pengali || 1);
  });
  t.batal = true;
  t.waktuBatal = new Date().toISOString();
  t.alasanBatal = 'Dibatalkan oleh ' + (petugasSekarang?.nama || '-');
  if (t.pelangganId) catatBelanjaPelanggan(t.pelangganId, -t.total, t.waktu);
  catat('nota', `Membatalkan nota ${t.nomor} senilai ${angka(t.total)} (penjual: ${t.petugas}), stok dikembalikan`);
  simpanData();
  gambarLaporan();
  pesan('Transaksi dibatalkan, stok dikembalikan.', 'sukses');
}

function unduhCsv() {
  const daftar = transaksiTerpilih();
  if (!daftar.length) { pesan('Tidak ada transaksi untuk diunduh.', 'peringatan'); return; }
  const sel = n => `"${String(n).replace(/"/g, '""')}"`;
  const pemilik = bolehPemilik();   // harga beli adalah rahasia modal, bukan urusan karyawan
  const judul = ['Nomor', 'Waktu', 'Petugas', 'Barang', 'Jumlah', 'Harga Jual'];
  if (pemilik) judul.push('Harga Beli');
  judul.push('Subtotal Barang', 'Diskon Nota', 'Total Nota', 'Status');
  const baris = [judul.map(sel).join(';')];
  daftar.forEach(t => t.item.forEach(i => {
    const kolom = [t.nomor, waktuSingkat(t.waktu), t.petugas, i.nama, i.jumlah, i.hargaJual];
    if (pemilik) kolom.push(i.hargaBeli || 0);
    kolom.push(i.hargaJual * i.jumlah, t.diskon || 0, t.total, t.batal ? 'BATAL' : 'SAH');
    baris.push(kolom.map(sel).join(';'));
  }));
  unduhBerkas(`laporan-${slugToko()}-${$('#dari-tanggal').value}-sampai-${$('#sampai-tanggal').value}.csv`,
    'ï»¿' + baris.join('\r\n'), 'text/csv;charset=utf-8');
  pesan('Berkas laporan diunduh.', 'sukses');
}


/* ========== 8b. LAYAR TUTUP KASIR ========== */

/** Awal giliran jaga: tutup kasir terakhir petugas ini, atau tengah malam tadi. */
function mulaiGiliran() {
  const nama = petugasSekarang?.nama || '-';
  const punyaSaya = db.tutupKasir.filter(k => k.petugas === nama);
  const awalHari = new Date(kunciTanggal() + 'T00:00:00').toISOString();
  if (!punyaSaya.length) return awalHari;
  const terakhir = punyaSaya[punyaSaya.length - 1].waktu;
  return new Date(terakhir) > new Date(awalHari) ? terakhir : awalHari;
}

function transaksiGiliran() {
  const nama = petugasSekarang?.nama || '-';
  const mulai = new Date(mulaiGiliran()).getTime();
  return db.transaksi.filter(t => !t.batal && t.petugas === nama && new Date(t.waktu).getTime() >= mulai);
}

function hitungSelisihKasir() {
  const total = transaksiGiliran().reduce((j, t) => j + t.total, 0);
  const modal = nilaiAngka($('#tutup-modal-awal'));
  const uang = nilaiAngka($('#tutup-uang'));
  const kotak = $('#tutup-selisih');
  if (!uang) { kotak.style.display = 'none'; return 0; }
  const selisih = (uang - modal) - total;
  kotak.style.display = 'flex';
  kotak.innerHTML = `<span>${selisih === 0 ? 'UANG PAS' : (selisih > 0 ? 'UANG LEBIH' : 'UANG KURANG')}</span>
    <b>${rupiah(Math.abs(selisih))}</b>`;
  kotak.style.color = selisih === 0 ? 'var(--sukses)' : 'var(--bahaya)';
  return selisih;
}

function gambarTutupKasir() {
  const trx = transaksiGiliran();
  const total = trx.reduce((j, t) => j + t.total, 0);
  $('#tutup-ringkas').innerHTML = `
    <div class="ringkas"><div class="label">Giliran Dimulai</div>
      <div class="nilai" style="font-size:18px">${waktuSingkat(mulaiGiliran())}</div></div>
    <div class="ringkas"><div class="label">Nota Giliran Ini</div><div class="nilai">${angka(trx.length)}</div></div>
    <div class="ringkas"><div class="label">Penjualan Tercatat</div><div class="nilai hijau">${rupiah(total)}</div></div>`;
  hitungSelisihKasir();
  gambarRiwayatTutup();
}

async function simpanTutupKasir() {
  const trx = transaksiGiliran();
  const total = trx.reduce((j, t) => j + t.total, 0);
  const modal = nilaiAngka($('#tutup-modal-awal'));
  const uang = nilaiAngka($('#tutup-uang'));
  if (!uang) { pesan('Isi dulu jumlah uang yang ada di laci.', 'peringatan'); $('#tutup-uang').focus(); return; }

  const selisih = (uang - modal) - total;
  const kata = selisih === 0 ? 'PAS' : (selisih > 0 ? `LEBIH ${rupiah(selisih)}` : `KURANG ${rupiah(-selisih)}`);
  const ya = await konfirmasi('Catat tutup kasir',
    `Penjualan tercatat: <b>${rupiah(total)}</b> dari ${trx.length} nota.<br>
     Uang di laci: <b>${rupiah(uang)}</b>, modal awal ${rupiah(modal)}.<br><br>
     Hasil hitungan: <b>${kata}</b>.<br><br>
     Catatan ini masuk buku catatan dan tidak bisa dihapus dari dalam aplikasi.`,
    'Ya, catat sekarang', false);
  if (!ya) return;

  const keterangan = $('#tutup-catatan').value.trim();
  db.tutupKasir.push({
    id: idBaru(), waktu: new Date().toISOString(), petugas: petugasSekarang?.nama || '-',
    mulai: mulaiGiliran(), jumlahNota: trx.length, totalSistem: total,
    modalAwal: modal, uangDihitung: uang, selisih, catatan: keterangan
  });
  catat('kasir', `Tutup kasir: sistem ${angka(total)} dari ${trx.length} nota, laci ${angka(uang)}, hasil ${kata}` +
    (keterangan ? ` (${keterangan})` : ''));
  simpanData();

  $('#tutup-uang').value = '';
  $('#tutup-modal-awal').value = '';
  $('#tutup-catatan').value = '';
  gambarTutupKasir();
  pesan('Tutup kasir tercatat. Hasil: ' + kata, selisih === 0 ? 'sukses' : 'peringatan', 5000);
}

function gambarRiwayatTutup() {
  let daftar = db.tutupKasir.slice().reverse();
  if (!bolehPemilik()) daftar = daftar.filter(k => k.petugas === petugasSekarang?.nama);
  daftar = daftar.slice(0, 40);

  $('#tabel-tutup tbody').innerHTML = daftar.map(k => {
    const warna = k.selisih === 0 ? 'var(--sukses)' : 'var(--bahaya)';
    const kata = k.selisih === 0 ? 'pas' : (k.selisih > 0 ? 'lebih' : 'kurang');
    return `<tr>
      <td class="lemah">${waktuSingkat(k.waktu)}</td>
      <td>${aman(k.petugas)}</td>
      <td class="kanan">${angka(k.totalSistem)}</td>
      <td class="kanan">${angka(k.uangDihitung)}</td>
      <td class="kanan" style="color:${warna}"><b>${angka(Math.abs(k.selisih))}</b> ${kata}</td>
      <td class="lemah">${aman(k.catatan || '-')}</td>
    </tr>`;
  }).join('');
  $('#tutup-kosong').textContent = daftar.length ? '' : 'Belum ada riwayat tutup kasir.';
  $('#tabel-tutup').classList.toggle('tersembunyi', daftar.length === 0);
}


/* ========== 8c. LAYAR BUKU CATATAN ========== */

let saringCatatan = 'semua';

function gambarCatatan() {
  let daftar = db.catatan.slice().reverse();
  if (saringCatatan !== 'semua') daftar = daftar.filter(c => c.jenis === saringCatatan);
  const jumlahSemua = daftar.length;
  daftar = daftar.slice(0, 300);

  $('#daftar-catatan').innerHTML = daftar.map(c => `
    <div class="catatan-baris ${aman(c.jenis)}">
      <span class="waktu">${waktuSingkat(c.waktu)}</span>
      <span><span class="siapa">${aman(c.petugas)}</span>
        <span class="lemah kecil">${aman(c.peran || '')}</span><br>${aman(c.teks)}</span>
    </div>`).join('') + (jumlahSemua > 300
      ? `<p class="lemah kecil" style="margin-top:10px">Menampilkan 300 catatan terbaru dari ${angka(jumlahSemua)}.</p>` : '');

  $('#catatan-kosong').textContent = daftar.length ? '' : 'Belum ada catatan pada saringan ini.';
}


/* ========== 9. LAYAR PENGATURAN ========== */

function gambarPenyimpanan() {
  const persen = persenPenyimpanan();
  const batang = $('#meteran-isi');
  batang.style.width = Math.max(2, persen) + '%';
  batang.className = persen >= AMBANG_RAPIKAN ? 'bahaya'
    : (persen >= AMBANG_PERINGATAN ? 'peringatan' : '');
  const bulanArsip = Object.keys(db.arsip || {}).length;
  $('#info-penyimpanan').innerHTML =
    `Terpakai <b>${persen}%</b> (${(ukuranData() / 1024).toFixed(0)} KB) &middot;
     <b>${angka(db.transaksi.length)}</b> nota rinci tersimpan` +
    (bulanArsip ? ` &middot; ${angka(bulanArsip)} bulan sudah diringkas` : '');
}

const PIN_MUDAH_DITEBAK = ['123456', '1234', '000000', '0000', '111111', '1111',
  '123123', '654321', '4321', '121212'];

function gambarPin() {
  const ada = !!db.toko.pinPemilik;
  $('#set-pin-untuk').value = db.toko.pinUntuk || 'semua';
  $('#info-pin').innerHTML = !ada
    ? 'PIN <b>belum terpasang</b>. Siapa pun bisa membuka kasir.'
    : (db.toko.pinBawaan
      ? `<span class="lencana lencana-bahaya">Masih bawaan</span>
         PIN sekarang <b>123456</b> — angka yang paling mudah ditebak di dunia.
         Gantilah sebelum kasir dipakai berjualan sungguhan.`
      : 'PIN <b>sudah diganti sendiri</b>. Untuk menggantinya lagi, isi PIN sekarang lebih dulu.');

  $('#bungkus-pin-lama').classList.toggle('tersembunyi', !ada);
  $('#btn-hapus-pin').classList.toggle('tersembunyi', !ada);
  $('#btn-lupa-pin').classList.toggle('tersembunyi', !ada);
  $('#btn-simpan-pin').textContent = ada ? 'Ganti PIN' : 'Pasang PIN';
}

/** Memastikan yang mengganti PIN memang tahu PIN yang sekarang. Tanpa ini,
    siapa pun yang menemukan kasir terbuka bisa mengunci pemiliknya di luar. */
function pinLamaBenar() {
  if (!db.toko.pinPemilik) return true;
  const lama = $('#set-pin-lama').value.replace(/\D/g, '');
  if (!lama) { pesan('Isi PIN sekarang lebih dulu.', 'peringatan'); $('#set-pin-lama').focus(); return false; }
  if (acakPin(lama) !== db.toko.pinPemilik) {
    pesan('PIN sekarang salah.', 'bahaya');
    $('#set-pin-lama').value = '';
    $('#set-pin-lama').focus();
    return false;
  }
  return true;
}

function bersihkanIsianPin() {
  ['#set-pin-lama', '#set-pin', '#set-pin-ulang'].forEach(s => { $(s).value = ''; });
}

function simpanPin() {
  if (!pinLamaBenar()) return;
  const pin = $('#set-pin').value.replace(/\D/g, '');
  const ulang = $('#set-pin-ulang').value.replace(/\D/g, '');
  if (pin.length < 4 || pin.length > 6) {
    pesan('PIN baru harus empat sampai enam angka.', 'peringatan'); $('#set-pin').focus(); return;
  }
  if (pin !== ulang) { pesan('Dua isian PIN baru belum sama.', 'peringatan'); $('#set-pin-ulang').focus(); return; }
  if (PIN_MUDAH_DITEBAK.includes(pin)) {
    pesan('Pilih angka yang tidak mudah ditebak, bukan 123456 atau 0000.', 'peringatan', 6000);
    $('#set-pin').focus();
    return;
  }
  if (acakPin(pin) === db.toko.pinPemilik) {
    pesan('PIN baru sama dengan yang sekarang.', 'peringatan');
    return;
  }

  const menggantiLama = !!db.toko.pinPemilik;
  db.toko.pinPemilik = acakPin(pin);
  db.toko.pinBawaan = false;
  catat('sistem', menggantiLama ? 'Mengganti PIN masuk kasir' : 'Memasang PIN masuk kasir');
  simpanData();
  bersihkanIsianPin();
  gambarPin();
  pesan(`PIN ${menggantiLama ? 'diganti' : 'dipasang'}. Catat baik-baik, tidak ada cara mudah membukanya.`,
    'sukses', 7000);
}

async function hapusPin() {
  if (!db.toko.pinPemilik) return;
  if (!pinLamaBenar()) return;
  const ya = await konfirmasi('Hapus PIN',
    'Setelah dihapus, siapa pun yang memegang perangkat ini bisa membuka kasir dan melihat laporan untung.',
    'Ya, hapus PIN');
  if (!ya) return;
  db.toko.pinPemilik = '';
  db.toko.pinBawaan = false;
  catat('sistem', 'Menghapus PIN masuk kasir');
  simpanData();
  bersihkanIsianPin();
  gambarPin();
  pesan('PIN dihapus.', 'sukses');
}

function petunjukLupaPin() {
  bukaModal({
    judul: 'Lupa PIN',
    isi: `<p>PIN tidak bisa dilihat dari dalam aplikasi, tetapi <b>data toko tidak ikut hilang
        karenanya.</b> Ada dua jalan keluar:</p>
      <p style="margin-top:14px"><b>1. Pulihkan cadangan lama.</b><br>
        <span class="lemah">Pengaturan &rarr; Pulihkan dari Cadangan, pilih berkas yang dibuat
        sebelum PIN itu dipasang. Penjualan setelah tanggal cadangan itu akan hilang.</span></p>
      <p style="margin-top:12px"><b>2. Minta bantuan yang memasang aplikasi ini.</b><br>
        <span class="lemah">PIN dapat dihapus lewat alat pengembang browser tanpa menghilangkan
        satu pun data penjualan. Caranya tersimpan di berkas
        <b>Cara Reset PIN Kasir.txt</b> di Desktop.</span></p>
      <p class="lemah kecil" style="margin-top:14px">Karena jalan kedua itu ada, PIN ini memang
        pagar ketertiban, bukan brankas.</p>`,
    aksi: [{ label: 'Mengerti', kelas: 'tombol-utama', saatKlik: tutupModal }]
  });
}

function gambarPengaturan() {
  $('#set-nama').value = db.toko.nama || '';
  $('#set-jenis').value = db.toko.jenis || '';
  $('#set-slogan').value = db.toko.slogan || '';
  $('#set-telepon').value = db.toko.telepon || '';
  $('#set-alamat').value = db.toko.alamat || '';
  $('#set-jam-buka').value = db.toko.jamBuka || '';
  $('#set-catatan').value = db.toko.catatanStruk || '';

  const jumlahKaryawan = db.petugas.filter(p => p.peran !== 'pemilik').length;
  $('#info-petugas').innerHTML =
    `<b>${angka(jumlahPemilik())}</b> pemilik dan <b>${angka(jumlahKaryawan)}</b> karyawan terdaftar.`;

  $('#daftar-petugas').innerHTML = db.petugas.map(p => `
    <div class="baris-daftar">
      <span><b>${aman(p.nama)}</b>
        <span class="lencana ${p.peran === 'pemilik' ? 'lencana-baik' : 'lencana-peringatan'}">${labelPeran(p)}</span></span>
      <span style="white-space:nowrap">
        <button class="tombol-ikon" data-ubah-petugas="${p.id}" title="Ubah nama">&#9998;</button>
        <button class="tombol-ikon" data-hapus-petugas="${p.id}" title="Hapus">&#128465;</button>
      </span>
    </div>`).join('');

  $('#versi-aplikasi').textContent = 'Versi aplikasi: ' + VERSI_APLIKASI;
  gambarPenyimpanan();
  gambarPin();
  gambarKatalogPengaturan();
  gambarPromoPengaturan();
  $('#info-cadangan').innerHTML = db.terakhirCadangan
    ? `Cadangan terakhir diunduh: <b>${waktuSingkat(db.terakhirCadangan)}</b>.`
    : '<b>Belum pernah mengunduh cadangan.</b>';
}

function simpanToko() {
  db.toko.nama = $('#set-nama').value.trim() || 'Toko';
  db.toko.jenis = $('#set-jenis').value.trim();
  db.toko.slogan = $('#set-slogan').value.trim();
  db.toko.telepon = $('#set-telepon').value.trim();
  db.toko.alamat = $('#set-alamat').value.trim();
  db.toko.jamBuka = $('#set-jam-buka').value.trim();
  db.toko.catatanStruk = $('#set-catatan').value.trim();
  catat('sistem', `Mengubah identitas toko (nama toko sekarang "${db.toko.nama}")`);
  simpanData();
  $('#bilah-nama-toko').textContent = db.toko.nama;
  document.title = 'Kasir ' + db.toko.nama;
  gambarLayarMasuk();
  pesan('Pengaturan toko disimpan.', 'sukses');
}

function formPetugas(id = null) {
  const p = id ? db.petugas.find(x => x.id === id) : null;
  bukaModal({
    judul: p ? 'Ubah Petugas' : 'Tambah Karyawan',
    isi: `<div class="form-grid" style="margin:0">
        <label class="lebar-penuh">Nama
          <input id="p-nama" class="input" type="text" value="${aman(p?.nama || '')}" placeholder="Contoh: Mr Kamal"></label>
        <label class="lebar-penuh">Peran
          <select id="p-peran" class="input">
            <option value="karyawan" ${p?.peran === 'pemilik' ? '' : 'selected'}>Karyawan</option>
            <option value="pemilik" ${p?.peran === 'pemilik' ? 'selected' : ''}>Pemilik</option>
          </select></label>
      </div>
      <p class="lemah kecil" style="margin-top:12px">
        <b>Karyawan</b> boleh menjual, melihat daftar barang, mencatat barang masuk, menutup kasir,
        dan melihat penjualannya sendiri.<br>
        <b>Pemilik</b> juga boleh mengubah harga, membuka Pengaturan, Buku Catatan, dan laporan seluruh toko.
        ${p ? '<br><br>Mengganti nama tidak mengubah nota lama: nota tetap memakai nama saat transaksi itu terjadi.' : ''}
      </p>`,
    aksi: [
      { label: 'Batal', kelas: 'tombol-netral', saatKlik: tutupModal },
      {
        label: p ? 'Simpan Perubahan' : 'Tambahkan', kelas: 'tombol-utama', saatKlik: () => {
          const nama = $('#p-nama').value.trim();
          if (!nama) { pesan('Nama belum diisi.', 'peringatan'); $('#p-nama').focus(); return; }
          const peran = $('#p-peran').value === 'pemilik' ? 'pemilik' : 'karyawan';
          if (p) {
            // Toko harus selalu punya minimal satu pemilik, kalau tidak
            // Pengaturan tidak bisa dibuka siapa pun lagi.
            if (p.peran === 'pemilik' && peran !== 'pemilik' && jumlahPemilik() <= 1) {
              pesan('Harus ada minimal satu Pemilik.', 'peringatan'); return;
            }
            const ubahan = [];
            if (p.nama !== nama) ubahan.push(`nama "${p.nama}" jadi "${nama}"`);
            if (p.peran !== peran) ubahan.push(`peran jadi ${peran}`);
            p.nama = nama; p.peran = peran;
            if (petugasSekarang && petugasSekarang.id === p.id) {
              $('#bilah-petugas').textContent = nama + ' - ' + labelPeran(p);
              terapkanHakAkses();
            }
            if (ubahan.length) catat('sistem', 'Mengubah petugas: ' + ubahan.join(', '));
          } else {
            db.petugas.push({ id: idBaru(), nama, peran });
            catat('sistem', `Menambah petugas "${nama}" sebagai ${peran}`);
          }
          simpanData(); tutupModal(); gambarPengaturan(); gambarLayarMasuk();
          pesan(p ? 'Data petugas diperbarui.' : 'Karyawan ditambahkan. Namanya langsung muncul di halaman depan.', 'sukses');
        }
      }
    ]
  });
}

async function hapusPetugas(id) {
  const p = db.petugas.find(x => x.id === id);
  if (!p) return;
  if (db.petugas.length <= 1) { pesan('Minimal satu petugas harus ada.', 'peringatan'); return; }
  if (petugasSekarang && petugasSekarang.id === id) { pesan('Petugas yang sedang bertugas tidak bisa dihapus.', 'peringatan'); return; }
  if (p.peran === 'pemilik' && jumlahPemilik() <= 1) { pesan('Harus ada minimal satu Pemilik.', 'peringatan'); return; }
  const ya = await konfirmasi('Hapus petugas',
    `Hapus <b>${aman(p.nama)}</b> dari daftar?<br>
     Namanya hilang dari halaman depan, tetapi <b>seluruh nota, barang masuk, tutup kasir dan buku catatan
     atas namanya tetap tersimpan</b>.`, 'Ya, hapus');
  if (!ya) return;
  db.petugas = db.petugas.filter(x => x.id !== id);
  catat('sistem', `Menghapus petugas "${p.nama}" dari daftar (riwayat kerjanya tetap tersimpan)`);
  simpanData(); gambarPengaturan(); gambarLayarMasuk();
  pesan('Petugas dihapus, riwayatnya tetap ada.', 'sukses', 4000);
}

function unduhCadangan(diam = false) {
  db.terakhirCadangan = new Date().toISOString();
  simpanData();
  unduhBerkas(`cadangan-${slugToko()}-${kunciTanggal()}.json`, JSON.stringify(db, null, 2), 'application/json');
  if (diam) return;   // dipanggil dari perapian penyimpanan, jangan mengganggu
  if ($('#layar-pengaturan').classList.contains('aktif')) gambarPengaturan();
  pesan('Cadangan diunduh. Simpan berkasnya di tempat aman.', 'sukses', 4000);
}

function bacaCadangan(berkas) {
  const pembaca = new FileReader();
  pembaca.onload = async () => {
    let masuk;
    try { masuk = JSON.parse(pembaca.result); }
    catch { pesan('Berkas itu bukan cadangan yang sah.', 'bahaya'); return; }
    if (!masuk || !Array.isArray(masuk.barang)) { pesan('Isi berkas tidak dikenali.', 'bahaya'); return; }

    const ya = await konfirmasi('Pulihkan data',
      `Cadangan ini berisi <b>${masuk.barang.length}</b> barang dan
       <b>${(masuk.transaksi || []).length}</b> transaksi.<br><br>
       Seluruh data yang sekarang ada di laptop ini akan <b>diganti</b>. Lanjutkan?`,
      'Ya, ganti data sekarang');
    if (!ya) return;

    db = lengkapi(masuk);
    catat('sistem', 'Seluruh data diganti dengan isi berkas cadangan');
    simpanData();
    terapkanTema();
    gambarLayarMasuk();
    petugasSekarang = null;
    gantiLayar('layar-masuk');
    pesan('Data berhasil dipulihkan.', 'sukses', 4000);
  };
  pembaca.readAsText(berkas);
}

async function resetData() {
  const satu = await konfirmasi('Hapus semua data',
    'Seluruh barang, transaksi, dan pengaturan akan dihapus dan kembali seperti baru. Ini tidak bisa dibatalkan.',
    'Lanjut');
  if (!satu) return;
  const dua = await konfirmasi('Yakin sekali?',
    'Sudah mengunduh cadangan? Kalau belum, tekan Batal lalu unduh dulu.',
    'Ya, hapus semuanya');
  if (!dua) return;
  db = dataAwal();
  catat('sistem', 'Semua data dihapus dan aplikasi dikembalikan seperti baru');
  simpanData();
  keranjang = [];
  petugasSekarang = null;
  terapkanTema();
  gambarLayarMasuk();
  gantiLayar('layar-masuk');
  pesan('Semua data dihapus.', 'sukses');
  setTimeout(panduanAwal, 400);
}

/** Panduan singkat saat aplikasi pertama kali dibuka, atau bila diminta ulang. */
function panduanAwal() {
  bukaModal({
    judul: 'Selamat datang',
    isi: `<p class="lemah">Dua isian singkat supaya aplikasi langsung memakai nama toko sendiri.
        Semuanya masih bisa diubah kapan saja lewat <b>Pengaturan</b>.</p>
      <div class="form-grid" style="margin:16px 0 0">
        <label class="lebar-penuh">Nama toko
          <input id="w-toko" class="input" type="text" value="${aman(db.toko.nama || 'Toko Saya')}"></label>
        <label class="lebar-penuh">Nama pemilik atau penjaga kasir
          <input id="w-pemilik" class="input" type="text" value="${aman(db.petugas[0]?.nama || 'Bapak')}"
                 placeholder="Contoh: Mr Kamal"></label>
      </div>
      <p style="margin-top:18px"><b>Daftar barangnya mau diisi bagaimana?</b></p>
      <label class="pilihan-radio"><input type="radio" name="w-isi" value="contoh" checked>
        <span>Pakai <b>8 barang contoh</b> dulu
        <span class="lemah kecil">â€” enak untuk mencoba, boleh dihapus kapan saja</span></span></label>
      <label class="pilihan-radio"><input type="radio" name="w-isi" value="kosong">
        <span><b>Kosongkan</b>, saya isi sendiri barang toko saya
        <span class="lemah kecil">â€” daftar barang mulai dari nol</span></span></label>`,
    aksi: [{ label: 'Mulai Pakai', kelas: 'tombol-utama', saatKlik: simpanPanduanAwal }]
  });
}

function simpanPanduanAwal() {
  const namaToko = $('#w-toko').value.trim() || 'Toko Saya';
  const namaPemilik = $('#w-pemilik').value.trim() || 'Pemilik';
  const kosongkan = $('input[name="w-isi"]:checked')?.value === 'kosong';

  db.toko.nama = namaToko;
  db.petugas = [{ id: idBaru(), nama: namaPemilik, peran: 'pemilik' }];
  if (kosongkan) db.barang = [];
  perluPanduanAwal = false;
  catat('sistem', `Panduan awal: toko "${namaToko}", pemilik "${namaPemilik}"` +
    (kosongkan ? ', daftar barang dikosongkan' : ', memakai barang contoh'));
  simpanData();

  document.title = 'Kasir ' + namaToko;
  $('#bilah-nama-toko').textContent = namaToko;
  petugasSekarang = null;
  gambarLayarMasuk();
  gantiLayar('layar-masuk');
  tutupModal();
  pesan('Siap! Tambah karyawan lain lewat Pengaturan.', 'sukses', 4500);
}

async function kosongkanDaftarBarang() {
  if (!db.barang.length) { pesan('Daftar barang memang sudah kosong.', 'info'); return; }
  const ya = await konfirmasi('Hapus semua barang',
    `Seluruh <b>${db.barang.length} barang</b> akan dihapus dari daftar, termasuk barang contoh bawaan.<br>
     Riwayat transaksi dan laporan <b>tidak</b> ikut terhapus.`,
    'Ya, kosongkan daftar barang');
  if (!ya) return;
  const jumlah = db.barang.length;
  db.barang = [];
  keranjang = [];
  catat('barang', `Mengosongkan daftar barang (${jumlah} barang dihapus sekaligus)`);
  simpanData();
  gambarPengaturan();
  pesan('Daftar barang dikosongkan. Silakan isi barang toko sendiri.', 'sukses', 4000);
}

/* ----- katalog untuk pelanggan ----- */

const alamatKatalog = () => new URL('katalog.html', location.href).href;

/** Satu pintu dari kasir menuju dua tampilan yang dilihat pembeli.
    Arah sebaliknya sengaja tidak ada: alamat katalog dibagikan ke umum,
    jadi tautan menuju kasir di sana sama saja dengan mengundang orang
    luar menyentuh laporan dan pengaturan toko. */
function pintuTampilanPelanggan() {
  bukaModal({
    judul: 'Tampilan untuk Pelanggan',
    isi: `<div class="pilih-tampilan">
        <button data-tampilan="layar">
          <span class="ikon-pilih">
            <svg viewBox="0 0 24 24"><rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M8.5 20.5h7M12 16.5v4"/></svg>
          </span>
          <b>Layar Pelanggan</b>
          <small>Monitor kedua yang menghadap pembeli di meja kasir. Isinya mengikuti
            keranjang seketika: barang, total, dan kembalian.</small>
        </button>
        <button data-tampilan="katalog">
          <span class="ikon-pilih">
            <svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>
          </span>
          <b>Katalog Pelanggan</b>
          <small>Etalase yang dibuka pembeli dari HP mereka: barang, harga, dan
            pesan lewat WhatsApp.</small>
        </button>
      </div>
      <div class="alamat-bagikan">
        <span class="lemah kecil">Alamat katalog untuk dibagikan ke pembeli</span>
        <div class="baris-alamat">
          <input id="alamat-bagikan" class="input" type="text" readonly value="${aman(alamatKatalog())}">
          <button class="tombol tombol-netral kecil" id="btn-salin-bagikan">Salin</button>
        </div>
      </div>`,
    aksi: [{ label: 'Tutup', kelas: 'tombol-netral', saatKlik: tutupModal }]
  });

  $$('#modal-isi [data-tampilan]').forEach(t => t.onclick = () => {
    if (t.dataset.tampilan === 'layar') {
      bukaLayarPelanggan();
    } else {
      window.open(alamatKatalog(), '_blank', 'noopener');
    }
    tutupModal();
  });

  const salin = $('#btn-salin-bagikan');
  if (salin) salin.onclick = async () => {
    try {
      await navigator.clipboard.writeText(alamatKatalog());
      pesan('Alamat katalog disalin. Tinggal tempel di WhatsApp.', 'sukses', 4000);
    } catch (e) {
      $('#alamat-bagikan').select();
      pesan('Alamat sudah ditandai, tekan Ctrl+C untuk menyalin.', 'info', 4000);
    }
  };
}

/* ----- spanduk promo ----- */

const WARNA_PROMO = { ungu: 'Ungu', hijau: 'Hijau', jingga: 'Jingga', biru: 'Biru', merah: 'Merah' };

function gambarPromoPengaturan() {
  const daftar = db.toko.promo || [];
  $('#daftar-promo').innerHTML = daftar.length ? daftar.map((p, urut) => `
    <div class="baris-daftar">
      <span style="min-width:0"><b>${aman(p.judul)}</b>
        <span class="lencana lencana-baik">${aman(WARNA_PROMO[p.warna] || 'Biru')}</span>
        <br><span class="lemah kecil">${aman(p.teks)}</span></span>
      <span style="white-space:nowrap">
        <button class="tombol-ikon" data-ubah-promo="${urut}" title="Ubah">&#9998;</button>
        <button class="tombol-ikon" data-hapus-promo="${urut}" title="Hapus">&#128465;</button>
      </span>
    </div>`).join('') : '<div class="kosong">Belum ada spanduk. Katalog akan tampil tanpa spanduk.</div>';
  $('#btn-tambah-promo').disabled = daftar.length >= 4;
}

function formPromo(urut = null) {
  const p = urut !== null ? (db.toko.promo || [])[urut] : null;
  bukaModal({
    judul: p ? 'Ubah Spanduk' : 'Tambah Spanduk',
    isi: `<div class="form-grid" style="margin:0">
        <label class="lebar-penuh">Judul <span class="lemah kecil">(singkat, tebal)</span>
          <input id="promo-judul" class="input" type="text" maxlength="40"
                 value="${aman(p?.judul || '')}" placeholder="Contoh: Harga Lusinan Lebih Hemat"></label>
        <label class="lebar-penuh">Keterangan <span class="lemah kecil">(satu kalimat)</span>
          <input id="promo-teks" class="input" type="text" maxlength="110"
                 value="${aman(p?.teks || '')}" placeholder="Contoh: Gelas dan piring tersedia per lusin."></label>
        <label class="lebar-penuh">Warna
          <select id="promo-warna" class="input">
            ${Object.entries(WARNA_PROMO).map(([k, n]) =>
              `<option value="${k}" ${p?.warna === k ? 'selected' : ''}>${n}</option>`).join('')}
          </select></label>
      </div>`,
    aksi: [
      { label: 'Batal', kelas: 'tombol-netral', saatKlik: tutupModal },
      {
        label: p ? 'Simpan' : 'Tambahkan', kelas: 'tombol-utama', saatKlik: () => {
          const judul = $('#promo-judul').value.trim();
          if (!judul) { pesan('Judul belum diisi.', 'peringatan'); $('#promo-judul').focus(); return; }
          const isi = { judul, teks: $('#promo-teks').value.trim(), warna: $('#promo-warna').value };
          db.toko.promo = db.toko.promo || [];
          if (p) db.toko.promo[urut] = isi; else db.toko.promo.push(isi);
          catat('sistem', `${p ? 'Mengubah' : 'Menambah'} spanduk promo "${judul}"`);
          simpanData();
          tutupModal();
          gambarPromoPengaturan();
          pesan('Spanduk disimpan. Tekan Terbitkan Katalog agar pelanggan melihatnya.', 'sukses', 5000);
        }
      }
    ]
  });
}

/* Jendela layar pelanggan disimpan, supaya kasir tahu kapan ia sedang
   menyala: titik hijau berdenyut di tombol bilah atas. */
let jendelaPelanggan = null;
let jamPantauLayar = null;

function pantauLayarPelanggan() {
  const titik = $('#titik-layar');
  if (!titik) return;
  const hidup = !!(jendelaPelanggan && !jendelaPelanggan.closed);
  titik.classList.toggle('tersembunyi', !hidup);
  if (!hidup) { clearInterval(jamPantauLayar); jamPantauLayar = null; }
}

function bukaLayarPelanggan() {
  if (jendelaPelanggan && !jendelaPelanggan.closed) {
    jendelaPelanggan.focus();
    siarkanKePelanggan();
    pesan('Layar pelanggan sudah terbuka, dimunculkan lagi ke depan.', 'info', 4000);
    return;
  }
  jendelaPelanggan = window.open('pelanggan.html', 'layarPelanggan',
    'width=1100,height=760,menubar=no,toolbar=no');
  if (!jendelaPelanggan) {
    pesan('Browser menghalangi jendela baru. Izinkan pop-up untuk alamat ini.', 'peringatan', 6000);
    return;
  }
  siarkanKePelanggan();
  pantauLayarPelanggan();
  clearInterval(jamPantauLayar);
  jamPantauLayar = setInterval(pantauLayarPelanggan, 3000);
  pesan('Geser jendela itu ke monitor kedua, lalu tekan F11 agar penuh layar.', 'info', 6000);
}

function gambarKatalogPengaturan() {
  $('#set-kode-terbit').value = db.toko.kodeTerbit || '';
  $('#set-katalog-otomatis').checked = db.toko.katalogOtomatis !== false;
  $('#alamat-katalog').value = alamatKatalog();
  $('#info-katalog').innerHTML = db.toko.katalogTerbitPada
    ? `Katalog terakhir diterbitkan <b>${waktuSingkat(db.toko.katalogTerbitPada)}</b>,
       berisi ${angka(db.toko.katalogJumlah || 0)} barang.`
    : 'Katalog <b>belum pernah diterbitkan</b>. Pelanggan yang membuka alamat di atas akan melihat pesan kosong.';
}

/** Isi katalog: hanya yang boleh dilihat pembeli. Harga beli, untung,
    jumlah stok, laporan, dan petugas tidak pernah ikut terkirim. */
function muatanKatalog() {
  return {
    waktu: new Date().toISOString(),
    toko: {
      nama: db.toko.nama, jenis: db.toko.jenis, slogan: db.toko.slogan || '',
      alamat: db.toko.alamat, telepon: db.toko.telepon, jamBuka: db.toko.jamBuka || '',
      promo: Array.isArray(db.toko.promo) ? db.toko.promo : []
    },
    barang: db.barang.map(b => ({
      nama: b.nama, kode: b.kode || '', satuan: b.satuan || 'pcs',
      hargaJual: b.hargaJual, gambar: b.gambar || '', tersedia: b.stok > 0,
      grosirJumlah: b.grosirJumlah || 0, grosirSatuan: b.grosirSatuan || '', grosirHarga: b.grosirHarga || 0
    }))
  };
}

/* Pembaruan otomatis setelah penjualan, barang masuk, atau perubahan harga.
   Dikumpulkan tiga detik dulu supaya sepuluh perubahan beruntun hanya jadi
   satu kiriman. Kalau pelayan halaman tidak ada -- misalnya aplikasi dibuka
   dari GitHub Pages -- ia diam saja, tanpa mengganggu kasir yang sedang
   melayani pembeli. */
let janjiKatalog = null;
let sedangMenyegarkanKatalog = false;   // penjaga supaya tidak berputar sendiri

function perbaruiKatalogOtomatis() {
  if (sedangMenyegarkanKatalog) return;
  if (db.toko.katalogOtomatis === false) return;
  if (!db.toko.katalogTerbitPada) return;   // belum pernah diterbitkan manual
  if (!db.barang.length) return;
  clearTimeout(janjiKatalog);
  janjiKatalog = setTimeout(async () => {
    const muatan = muatanKatalog();
    try {
      const jawaban = await fetch('terbitkan-katalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-kunci-terbit': db.toko.kodeTerbit || '' },
        body: JSON.stringify(muatan)
      });
      if (!jawaban.ok) return;
      db.toko.katalogTerbitPada = muatan.waktu;
      db.toko.katalogJumlah = muatan.barang.length;
      sedangMenyegarkanKatalog = true;
      simpanData();
      sedangMenyegarkanKatalog = false;
      if ($('#layar-pengaturan').classList.contains('aktif')) gambarKatalogPengaturan();
    } catch (e) { /* pelayan tidak ada, katalog cukup diperbarui manual nanti */ }
  }, 3000);
}

async function terbitkanKatalog() {
  if (!bolehPemilik()) { pesan('Hanya pemilik yang boleh menerbitkan katalog.', 'peringatan'); return; }
  if (!db.barang.length) { pesan('Daftar barang masih kosong.', 'peringatan'); return; }

  db.toko.kodeTerbit = $('#set-kode-terbit').value.replace(/\D/g, '');
  const muatan = muatanKatalog();

  const tombol = $('#btn-terbitkan-katalog');
  tombol.disabled = true;
  try {
    const jawaban = await fetch('terbitkan-katalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-kunci-terbit': db.toko.kodeTerbit || '' },
      body: JSON.stringify(muatan)
    });
    const hasil = await jawaban.json().catch(() => ({}));
    if (!jawaban.ok) throw new Error(hasil.pesan || ('ditolak dengan kode ' + jawaban.status));

    db.toko.katalogTerbitPada = muatan.waktu;
    db.toko.katalogJumlah = muatan.barang.length;
    catat('sistem', `Menerbitkan katalog pelanggan berisi ${muatan.barang.length} barang`);
    simpanData();
    gambarKatalogPengaturan();
  gambarPromoPengaturan();
    pesan(`Katalog terbit: ${muatan.barang.length} barang.`, 'sukses', 4000);
  } catch (galat) {
    pesan('Gagal menerbitkan: ' + galat.message, 'bahaya', 7000);
    bukaModal({
      judul: 'Katalog gagal diterbitkan',
      isi: `<p>${aman(galat.message)}</p>
        <p style="margin-top:12px">Dua sebab yang paling sering:</p>
        <ul style="margin:8px 0 0 20px;line-height:1.8">
          <li>Aplikasi kasir dibuka lewat <b>Live Server</b> atau berkas langsung, bukan lewat
              pelayan halaman. Bukalah lewat alamat <b>localhost:5501</b> atau alamat ngrok.</li>
          <li>Kasir dibuka dari internet tetapi <b>kode terbit</b> belum diisi atau salah.
              Kodenya tertulis di jendela hitam pelayan halaman.</li>
        </ul>`,
      aksi: [
        {
          // Di GitHub Pages tidak ada pelayan yang bisa menerima kiriman, jadi
          // katalognya diunduh di sini lalu diunggah sendiri ke GitHub.
          label: 'Unduh katalog.json', kelas: 'tombol-netral', saatKlik: () => {
            unduhBerkas('katalog.json', JSON.stringify(muatan, null, 2), 'application/json');
            pesan('Unggah berkas itu ke GitHub untuk memperbarui katalog di sana.', 'info', 6000);
            tutupModal();
          }
        },
        { label: 'Mengerti', kelas: 'tombol-utama', saatKlik: tutupModal }
      ]
    });
  } finally {
    tombol.disabled = false;
  }
}

function terapkanTema() {
  document.documentElement.dataset.tema = db.toko.tema === 'gelap' ? 'gelap' : 'terang';
}


/* ========== 10. PENYALAAN PERTAMA ========== */

function pasangPendengar() {

  /* --- perpindahan layar --- */
  document.addEventListener('click', e => {
    const menu = e.target.closest('[data-buka]');
    if (menu) gantiLayar(menu.dataset.buka);
    if (e.target.closest('[data-beranda]')) gantiLayar('layar-beranda');
    const menipis = e.target.closest('[data-buka-menipis]');
    if (menipis) {
      saringBarang = 'menipis';
      $$('#layar-barang .chip').forEach(c => c.classList.toggle('aktif', c.dataset.saring === 'menipis'));
      gantiLayar('layar-barang');
    }
  });

  $('#btn-ganti-petugas').onclick = async () => {
    if (keranjang.length) {
      const ya = await konfirmasi('Keranjang masih terisi',
        'Masih ada barang di keranjang yang belum dibayar. Ganti petugas sekarang dan kosongkan keranjang?',
        'Ya, ganti petugas');
      if (!ya) return;
      kosongkanKeranjang();
    }
    // Kalau pintu depan berkunci, keluar berarti mengunci kembali kasirnya,
    // jadi yang meneruskan giliran harus mengetik PIN lagi.
    if (pintuDikunci()) { kunciKasir(); return; }
    petugasSekarang = null;
    gambarLayarMasuk();
    gantiLayar('layar-masuk');
  };

  /* --- layar kunci --- */
  $('#papan-angka').addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.angka !== undefined) ketikPin(t.dataset.angka);
    else if (t.dataset.pinHapus !== undefined) {
      ketikanPin = ketikanPin.slice(0, -1);
      gambarTitikPin();
    } else if (t.dataset.pinBuka !== undefined) cobaBukaKunci();
  });
  document.addEventListener('keydown', e => {
    if (!$('#layar-kunci').classList.contains('aktif')) return;
    if (/^[0-9]$/.test(e.key)) { ketikPin(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { ketikanPin = ketikanPin.slice(0, -1); gambarTitikPin(); e.preventDefault(); }
    else if (e.key === 'Enter') { cobaBukaKunci(); e.preventDefault(); }
  });

  /* --- kotak isian uang: titik ribuan otomatis --- */
  document.addEventListener('input', e => {
    if (!e.target.classList?.contains('uang')) return;
    const bersih = e.target.value.replace(/\D/g, '');
    e.target.value = bersih ? angka(parseInt(bersih, 10)) : '';
  });

  /* --- layar jual --- */
  $('#cari-barang-jual').addEventListener('input', gambarPilihanBarang);
  $('#cari-barang-jual').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const pertama = $('#grid-barang-jual .kartu-barang:not([disabled])');
    if (pertama) { tambahKeKeranjang(pertama.dataset.tambah); e.target.select(); }
    else pesan('Tidak ada barang yang cocok.', 'peringatan');
  });

  $('#grid-barang-jual').addEventListener('click', e => {
    const tombol = e.target.closest('[data-tambah]');
    if (tombol) tambahKeKeranjang(tombol.dataset.tambah);
  });

  $('#daftar-keranjang').addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.hapus !== undefined) ubahJumlah(+t.dataset.hapus, 0);
    else if (t.dataset.kurang !== undefined) ubahJumlah(+t.dataset.kurang, keranjang[+t.dataset.kurang].jumlah - 1);
    else if (t.dataset.tambahSatu !== undefined) ubahJumlah(+t.dataset.tambahSatu, keranjang[+t.dataset.tambahSatu].jumlah + 1);
  });
  $('#daftar-keranjang').addEventListener('change', e => {
    if (e.target.dataset.jumlah === undefined) return;
    ubahJumlah(+e.target.dataset.jumlah, parseInt(String(e.target.value).replace(/\D/g, ''), 10) || 0);
  });

  $('#diskon').addEventListener('input', hitungTotal);
  $('#bayar').addEventListener('input', hitungTotal);
  $('#bayar').addEventListener('keydown', e => { if (e.key === 'Enter') selesaikanTransaksi(); });

  const nilaiCepat = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
  $('#tombol-cepat').innerHTML =
    '<button data-uang="pas">Uang pas</button>' +
    nilaiCepat.map(n => `<button data-uang="${n}">+${angka(n / 1000)}rb</button>`).join('') +
    '<button data-uang="hapus">Hapus</button>';
  $('#tombol-cepat').addEventListener('click', e => {
    const t = e.target.closest('[data-uang]');
    if (!t) return;
    const nilai = t.dataset.uang;
    const kotak = $('#bayar');
    if (nilai === 'pas') isiUang(kotak, hitungTotal().total);
    else if (nilai === 'hapus') kotak.value = '';
    else isiUang(kotak, nilaiAngka(kotak) + Number(nilai));
    hitungTotal();
  });

  /* --- kategori, penahanan, dan lembar keranjang di HP --- */
  $('#kategori-jual').addEventListener('click', e => {
    const t = e.target.closest('[data-kategori-jual]');
    if (!t) return;
    kategoriJual = t.dataset.kategoriJual;
    $$('#kategori-jual .chip').forEach(x => x.classList.toggle('aktif', x === t));
    gambarPilihanBarang();
  });

  $('#btn-tahan').onclick = tahanTransaksi;
  $('#btn-tertahan').onclick = daftarTertahan;
  $('#modal-isi').addEventListener('click', e => {
    const lanjut = e.target.closest('[data-lanjut]');
    const buang = e.target.closest('[data-buang-tahan]');
    if (lanjut) lanjutkanTertahan(lanjut.dataset.lanjut);
    if (buang) {
      db.tertahan = (db.tertahan || []).filter(t => t.id !== buang.dataset.buangTahan);
      simpanData(); gambarTertahan(); tutupModal();
      pesan('Keranjang tertahan dibuang.', 'info');
    }
  });

  $('#btn-buka-keranjang').onclick = () => document.body.classList.add('keranjang-terbuka');
  $('#btn-tutup-keranjang').onclick = () => document.body.classList.remove('keranjang-terbuka');

  /* --- diskon rupiah atau persen --- */
  $$('.saklar-diskon button').forEach(t => t.onclick = () => {
    modeDiskon = t.dataset.diskon;
    $$('.saklar-diskon button').forEach(x => x.classList.toggle('aktif', x === t));
    $('#diskon').value = '';
    $('#diskon').classList.toggle('uang', modeDiskon === 'rp');
    $('#diskon').placeholder = modeDiskon === 'rp' ? '0' : '0 %';
    hitungTotal();
  });

  /* --- pintasan papan ketik, supaya kasir tidak perlu tetikus --- */
  document.addEventListener('keydown', e => {
    if (!$('#layar-jual').classList.contains('aktif')) return;
    if (!$('#latar-modal').classList.contains('tersembunyi')) return;
    if (e.key === 'F2') { e.preventDefault(); $('#cari-barang-jual').focus(); $('#cari-barang-jual').select(); }
    if (e.key === 'F4') { e.preventDefault(); $('#bayar').focus(); $('#bayar').select(); }
    if (e.key === 'F9') { e.preventDefault(); selesaikanTransaksi(); }
  });

  $('#btn-selesai').onclick = selesaikanTransaksi;
  $('#btn-kosongkan').onclick = async () => {
    if (!keranjang.length) return;
    if (await konfirmasi('Kosongkan keranjang', 'Semua barang di keranjang akan dibuang.', 'Ya, kosongkan')) {
      kosongkanKeranjang();
      pesan('Keranjang dikosongkan.', 'info');
    }
  };

  /* --- data pelanggan --- */
  $('#btn-tambah-pelanggan').onclick = () => formPelanggan();
  $('#btn-tempel-pelanggan').onclick = tempelPelanggan;
  $('#cari-pelanggan').addEventListener('input', gambarTabelPelanggan);
  $('#urut-pelanggan').addEventListener('change', gambarTabelPelanggan);
  $('#tabel-pelanggan').addEventListener('click', e => {
    const ubah = e.target.closest('[data-ubah-pelanggan]');
    const hapus = e.target.closest('[data-hapus-pelanggan]');
    const wa = e.target.closest('[data-wa-pelanggan]');
    if (ubah) formPelanggan(ubah.dataset.ubahPelanggan);
    if (hapus) hapusPelanggan(hapus.dataset.hapusPelanggan);
    if (wa) {
      const p = cariPelanggan(wa.dataset.waPelanggan);
      if (p?.hp) window.open(`https://wa.me/${p.hp}?text=` +
        encodeURIComponent(`Halo ${p.nama}, dari ${db.toko.nama}.`), '_blank', 'noopener');
    }
  });
  $('#baris-pelanggan').onclick = pilihPelangganJual;

  /* --- daftar barang --- */
  $('#btn-tambah-barang').onclick = () => formBarang();
  $('#btn-impor-barang').onclick = formImporBarang;
  $('#btn-ekspor-barang').onclick = unduhDaftarBarang;
  $('#cari-barang').addEventListener('input', gambarTabelBarang);
  $('#urut-barang').addEventListener('change', e => {
    db.toko.urutBarang = e.target.value;   // pilihan urutan diingat, tanpa masuk buku catatan
    simpanData();
    gambarTabelBarang();
  });
  $$('#layar-barang .chip').forEach(c => c.onclick = () => {
    saringBarang = c.dataset.saring;
    $$('#layar-barang .chip').forEach(x => x.classList.toggle('aktif', x === c));
    gambarTabelBarang();
  });
  $('#tabel-barang').addEventListener('click', e => {
    const ubah = e.target.closest('[data-ubah-barang]');
    const hapus = e.target.closest('[data-hapus-barang]');
    if (ubah) formBarang(ubah.dataset.ubahBarang);
    if (hapus) hapusBarang(hapus.dataset.hapusBarang);
  });

  /* --- barang masuk --- */
  $('#btn-tambah-stok').onclick = tambahStok;

  /* --- laporan --- */
  $$('#layar-laporan .chip').forEach(c => c.onclick = () => {
    $$('#layar-laporan .chip').forEach(x => x.classList.toggle('aktif', x === c));
    setRentang(c.dataset.rentang);
    gambarLaporan();
  });
  $('#btn-terapkan').onclick = () => {
    $$('#layar-laporan .chip').forEach(x => x.classList.remove('aktif'));
    gambarLaporan();
  };
  $('#btn-csv').onclick = unduhCsv;
  $('#tabel-transaksi').addEventListener('click', e => {
    const detail = e.target.closest('[data-detail]');
    const batal = e.target.closest('[data-batalkan]');
    if (detail) detailTransaksi(detail.dataset.detail);
    if (batal) batalkanTransaksi(batal.dataset.batalkan);
  });

  /* --- tutup kasir --- */
  $('#btn-tutup-kasir').onclick = simpanTutupKasir;
  $('#tutup-modal-awal').addEventListener('input', hitungSelisihKasir);
  $('#tutup-uang').addEventListener('input', hitungSelisihKasir);

  /* --- buku catatan --- */
  $('#saring-catatan').addEventListener('click', e => {
    const c = e.target.closest('.chip');
    if (!c) return;
    saringCatatan = c.dataset.jenis;
    $$('#saring-catatan .chip').forEach(x => x.classList.toggle('aktif', x === c));
    gambarCatatan();
  });

  /* --- pengaturan --- */
  $('#btn-simpan-toko').onclick = simpanToko;
  $('#btn-tema').onclick = () => {
    db.toko.tema = db.toko.tema === 'gelap' ? 'terang' : 'gelap';
    simpanData(); terapkanTema();
  };
  $('#btn-tambah-petugas').onclick = formPetugas;
  $('#daftar-petugas').addEventListener('click', e => {
    const ubah = e.target.closest('[data-ubah-petugas]');
    const hapus = e.target.closest('[data-hapus-petugas]');
    if (ubah) formPetugas(ubah.dataset.ubahPetugas);
    if (hapus) hapusPetugas(hapus.dataset.hapusPetugas);
  });
  $('#btn-kosongkan-barang').onclick = kosongkanDaftarBarang;
  $('#btn-panduan').onclick = panduanAwal;

  /* --- penyimpanan dan PIN --- */
  $('#btn-rapikan').onclick = async () => {
    const ya = await konfirmasi('Rapikan penyimpanan',
      `Nota yang berumur lebih dari sebulan akan diringkas jadi rekap bulanan.<br>
       Omzet, untung, dan barang terjual tetap utuh di laporan; yang dipadatkan hanya rinciannya.<br><br>
       <b>Cadangan lengkap akan diunduh lebih dulu</b>, jadi tidak ada yang benar-benar hilang.`,
      'Ya, rapikan', false);
    if (!ya) return;
    const jumlah = rapikanPenyimpanan(true);
    gambarPenyimpanan();
    pesan(jumlah ? `${angka(jumlah)} nota lama diringkas.` : 'Tidak ada nota lama untuk diringkas.',
      'sukses', 5000);
  };
  $('#btn-simpan-pin').onclick = simpanPin;
  $('#btn-hapus-pin').onclick = hapusPin;
  $('#set-pin-untuk').addEventListener('change', e => {
    db.toko.pinUntuk = e.target.value;
    catat('sistem', `PIN kini diminta untuk ${e.target.value === 'semua' ? 'semua petugas' : 'pemilik saja'}`);
    simpanData();
    pesan(e.target.value === 'semua'
      ? 'PIN kini diminta begitu kasir dibuka.'
      : 'PIN kini hanya diminta saat memilih akun Pemilik.', 'sukses', 4500);
  });
  $('#btn-lupa-pin').onclick = petunjukLupaPin;
  $$('#set-pin-lama, #set-pin, #set-pin-ulang').forEach(el => {
    el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, ''); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') simpanPin(); });
  });

  /* --- katalog pelanggan --- */
  $('#btn-tambah-promo').onclick = () => formPromo();
  $('#daftar-promo').addEventListener('click', async e => {
    const ubah = e.target.closest('[data-ubah-promo]');
    const hapus = e.target.closest('[data-hapus-promo]');
    if (ubah) formPromo(Number(ubah.dataset.ubahPromo));
    if (hapus) {
      const urut = Number(hapus.dataset.hapusPromo);
      const judul = (db.toko.promo || [])[urut]?.judul || '';
      if (await konfirmasi('Hapus spanduk', `Hapus spanduk <b>${aman(judul)}</b> dari katalog?`, 'Ya, hapus')) {
        db.toko.promo.splice(urut, 1);
        catat('sistem', `Menghapus spanduk promo "${judul}"`);
        simpanData(); gambarPromoPengaturan();
        pesan('Spanduk dihapus.', 'sukses');
      }
    }
  });
  $('#btn-terbitkan-katalog').onclick = terbitkanKatalog;
  $('#set-katalog-otomatis').addEventListener('change', e => {
    db.toko.katalogOtomatis = e.target.checked;
    simpanData();
    pesan(e.target.checked ? 'Katalog akan ikut diperbarui sendiri.' : 'Katalog hanya diperbarui saat tombol Terbitkan ditekan.', 'info', 4000);
  });
  $('#btn-buka-katalog').onclick = () => window.open(alamatKatalog(), '_blank', 'noopener');
  $('#btn-salin-alamat').onclick = async () => {
    try {
      await navigator.clipboard.writeText(alamatKatalog());
      pesan('Alamat katalog disalin. Tinggal tempel di WhatsApp.', 'sukses', 4000);
    } catch (e) {
      $('#alamat-katalog').select();
      pesan('Alamat sudah ditandai, tekan Ctrl+C untuk menyalin.', 'info', 4000);
    }
  };
  $('#set-kode-terbit').addEventListener('change', e => {
    db.toko.kodeTerbit = e.target.value.replace(/\D/g, '');
    e.target.value = db.toko.kodeTerbit;
    simpanData();
  });

  /* --- layar pelanggan --- */
  $('#btn-layar-pelanggan').onclick = bukaLayarPelanggan;
  $('#btn-tampilan-pelanggan').onclick = pintuTampilanPelanggan;
  $('#menu-tampilan-pelanggan').onclick = pintuTampilanPelanggan;
  $('#btn-cadangan').onclick = unduhCadangan;
  $('#btn-pulihkan').onclick = () => $('#berkas-pulih').click();
  $('#berkas-pulih').onchange = e => {
    if (e.target.files[0]) bacaCadangan(e.target.files[0]);
    e.target.value = '';
  };
  $('#btn-reset').onclick = resetData;

  /* --- modal --- */
  $('#modal-isi').addEventListener('click', e => {
    const t = e.target.closest('[data-pilih-gambar]');
    if (!t || !$('#f-gambar')) return;
    $('#f-gambar').value = t.dataset.pilihGambar;
    $$('#modal-isi [data-pilih-gambar]').forEach(x => x.classList.toggle('terpilih', x === t));
  });

  $('#modal-tutup').onclick = tutupModal;
  $('#latar-modal').addEventListener('click', e => { if (e.target.id === 'latar-modal') tutupModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#latar-modal').classList.contains('tersembunyi')) tutupModal();
  });

  /* --- jaring pengaman: jangan sampai keranjang hilang tanpa sengaja --- */
  window.addEventListener('beforeunload', e => {
    if (keranjang.length) { e.preventDefault(); e.returnValue = ''; }
  });
}

function mulai() {
  terapkanTema();
  document.title = 'Kasir ' + (db.toko.nama || 'Toko');
  gambarLayarMasuk();
  terapkanHakAkses();   // menu pemilik tersembunyi selama belum ada yang masuk
  pasangPendengar();
  setRentang('hari-ini');
  if (pintuDikunci()) {
    gambarLayarKunci();
    gantiLayar('layar-kunci');
  } else {
    gantiLayar('layar-masuk');
  }
  if (perluPanduanAwal) setTimeout(panduanAwal, 350);
}

mulai();
