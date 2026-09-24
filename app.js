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
const VERSI_APLIKASI = '24 September 2026 - pembaruan 6 (katalog ikut otomatis)';

/** Isi awal saat aplikasi pertama kali dibuka. Semua bisa diubah dari dalam aplikasi. */
function dataAwal() {
  const brg = (kode, nama, beli, jual, stok, satuan = 'pcs') =>
    ({ id: idBaru(), kode, nama, satuan, hargaBeli: beli, hargaJual: jual, stok, stokMinimum: 5 });
  return {
    versi: 1,
    toko: {
      nama: 'Toko Manjadda Wajada Kubu', jenis: 'Toko Pecah Belah', alamat: '', telepon: '',
      catatanStruk: 'Terima kasih sudah berbelanja', tema: 'terang', urutBarang: 'nama-az', jamBuka: '', katalogOtomatis: true
    },
    petugas: [
      { id: idBaru(), nama: 'Bapak', peran: 'pemilik' },
      { id: idBaru(), nama: 'Siti', peran: 'karyawan' },
      { id: idBaru(), nama: 'Ujang', peran: 'karyawan' }
    ],
    barang: [
      brg('B01', 'Kuali besar', 45000, 65000, 8),
      brg('B02', 'Kompor 2 tungku', 110000, 145000, 4),
      brg('B03', 'Baskom besar', 12000, 18000, 15),
      brg('B04', 'Baskom kecil', 5000, 8000, 22),
      brg('B05', 'Sendok makan plastik', 800, 1500, 98),
      brg('B06', 'Sabut cuci piring', 300, 1000, 150),
      brg('B07', 'Sikat gosok lantai', 2500, 5000, 35),
      brg('B08', 'Sapu lidi', 3000, 6000, 28)
    ],
    transaksi: [],
    barangMasuk: [],
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
  ['petugas', 'barang', 'transaksi', 'barangMasuk', 'catatan', 'tutupKasir'].forEach(k => {
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
    b.stokMinimum ??= 5;
    b.stok = Number(b.stok) || 0;
    b.hargaBeli = Number(b.hargaBeli) || 0;
    b.hargaJual = Number(b.hargaJual) || 0;
  });
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
    gambarPilihanBarang(); gambarKeranjang();
    setTimeout(() => $('#cari-barang-jual').focus(), 80);
  },
  'layar-barang': () => gambarTabelBarang(),
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
  $('#bilah-atas').classList.toggle('tersembunyi', idLayar === 'layar-masuk');
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

function masukSebagai(p) {
  petugasSekarang = p;
  $('#bilah-nama-toko').textContent = db.toko.nama || 'Kasir Toko';
  $('#bilah-petugas').textContent = p.nama + ' - ' + labelPeran(p);
  $('#bilah-tanggal').textContent = tanggalPanjang(new Date());
  terapkanHakAkses();
  gantiLayar('layar-beranda');
  pesan('Selamat bekerja, ' + p.nama + '!', 'sukses');
}

/** Menyembunyikan menu dan tombol yang hanya boleh dipakai pemilik. */
function terapkanHakAkses() {
  const pemilik = bolehPemilik();
  $$('[data-peran="pemilik"]').forEach(el => el.classList.toggle('tersembunyi', !pemilik));
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

function siarkanKePelanggan() {
  const subtotal = keranjang.reduce((j, i) => j + i.hargaJual * i.jumlah, 0);
  const diskon = Math.min(nilaiAngka($('#diskon')), subtotal);
  const total = subtotal - diskon;
  const bayar = nilaiAngka($('#bayar'));
  kirimKePelanggan({
    status: keranjang.length ? 'belanja' : 'kosong',
    toko: { nama: db.toko.nama, jenis: db.toko.jenis, catatanStruk: db.toko.catatanStruk },
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
    toko: { nama: db.toko.nama, jenis: db.toko.jenis, catatanStruk: db.toko.catatanStruk },
    petugas: trx.petugas, nomor: trx.nomor,
    item: trx.item.map(i => ({ nama: i.nama, jumlah: i.jumlah, hargaJual: i.hargaJual, gambar: '' })),
    subtotal: trx.subtotal, diskon: trx.diskon, total: trx.total,
    bayar: trx.bayar, kembalian: trx.kembalian
  });
}

/* ========== 5. LAYAR JUAL ========== */

function stokTersedia(barang) {
  const diKeranjang = keranjang.filter(i => i.idBarang === barang.id).reduce((j, i) => j + i.jumlah, 0);
  return barang.stok - diKeranjang;
}

function gambarPilihanBarang() {
  const cari = $('#cari-barang-jual').value.trim().toLowerCase();
  const daftar = db.barang
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
      <span class="stok ${kelas}">${sisa <= 0 ? 'Stok habis' : 'Sisa ' + angka(sisa) + ' ' + aman(b.satuan)}</span>
    </button>`;
  }).join('');
}

function tambahKeKeranjang(idBarang, jumlah = 1) {
  const barang = cariBarang(idBarang);
  if (!barang) return;
  if (stokTersedia(barang) < jumlah) {
    pesan(`Stok ${barang.nama} tinggal ${barang.stok}.`, 'peringatan');
    return;
  }
  const adaDiKeranjang = keranjang.find(i => i.idBarang === idBarang);
  if (adaDiKeranjang) adaDiKeranjang.jumlah += jumlah;
  else keranjang.push({
    idBarang, kode: barang.kode, nama: barang.nama, satuan: barang.satuan,
    hargaJual: barang.hargaJual, hargaBeli: barang.hargaBeli, jumlah
  });
  gambarKeranjang();
  gambarPilihanBarang();
}

function ubahJumlah(indeks, jumlahBaru) {
  const item = keranjang[indeks];
  if (!item) return;
  const barang = cariBarang(item.idBarang);
  const batas = barang ? barang.stok : item.jumlah;
  if (jumlahBaru <= 0) { keranjang.splice(indeks, 1); }
  else if (jumlahBaru > batas) {
    item.jumlah = batas;
    pesan(`Stok ${item.nama} hanya ${batas}.`, 'peringatan');
  } else item.jumlah = jumlahBaru;
  gambarKeranjang();
  gambarPilihanBarang();
}

function gambarKeranjang() {
  const tbody = $('#tabel-keranjang tbody');
  tbody.innerHTML = keranjang.map((item, i) => `
    <tr>
      <td><b>${aman(item.nama)}</b><br><span class="lemah kecil">${aman(item.kode || '')}</span></td>
      <td class="kanan">${angka(item.hargaJual)}</td>
      <td>
        <div class="sel-jumlah">
          <button data-kurang="${i}" title="Kurangi">&minus;</button>
          <input type="text" inputmode="numeric" value="${item.jumlah}" data-jumlah="${i}">
          <button data-tambah-satu="${i}" title="Tambah">+</button>
        </div>
      </td>
      <td class="kanan"><b>${angka(item.hargaJual * item.jumlah)}</b></td>
      <td class="tengah"><button class="tombol-ikon" data-hapus="${i}" title="Hapus">&times;</button></td>
    </tr>`).join('');

  $('#keranjang-kosong').classList.toggle('tersembunyi', keranjang.length > 0);
  $('#tabel-keranjang').classList.toggle('tersembunyi', keranjang.length === 0);
  hitungTotal();
}

function hitungTotal() {
  const subtotal = keranjang.reduce((j, i) => j + i.hargaJual * i.jumlah, 0);
  let diskon = nilaiAngka($('#diskon'));
  // Diskon tidak boleh melebihi belanjaan. Isian hanya ditulis ulang bila ada
  // belanjaan, supaya angka yang sedang diketik tidak tiba-tiba terhapus.
  if (diskon > subtotal) {
    diskon = subtotal;
    if (subtotal > 0) isiUang($('#diskon'), diskon);
  }
  const total = subtotal - diskon;
  const bayar = nilaiAngka($('#bayar'));
  const kembalian = bayar - total;

  $('#teks-subtotal').textContent = rupiah(subtotal);
  $('#teks-total').textContent = rupiah(total);
  $('#teks-kembalian').textContent = (bayar === 0 && total > 0) ? 'Rp 0' : rupiah(kembalian);
  $('#teks-kembalian').style.color = kembalian < 0 ? 'var(--bahaya)' : '';
  siarkanKePelanggan();
  return { subtotal, diskon, total, bayar, kembalian };
}

function kosongkanKeranjang() {
  keranjang = [];
  $('#diskon').value = '';
  $('#bayar').value = '';
  gambarKeranjang();
  gambarPilihanBarang();
}

function nomorTransaksiBaru() {
  db.nomorTerakhir += 1;
  return 'TRX' + kunciTanggal().replace(/-/g, '') + '-' + String(db.nomorTerakhir).padStart(4, '0');
}

function selesaikanTransaksi() {
  if (!keranjang.length) { pesan('Keranjang masih kosong.', 'peringatan'); return; }

  // Stok dicek ulang, siapa tahu sudah berubah sejak barang dimasukkan keranjang.
  for (const item of keranjang) {
    const barang = cariBarang(item.idBarang);
    if (!barang) { pesan(`Barang ${item.nama} sudah tidak ada di daftar.`, 'bahaya'); return; }
    if (barang.stok < item.jumlah) {
      pesan(`Stok ${barang.nama} tinggal ${barang.stok}, kurangi dulu jumlahnya.`, 'bahaya', 4000);
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
    subtotal, diskon, total, bayar, kembalian, batal: false
  };

  keranjang.forEach(i => { const b = cariBarang(i.idBarang); if (b) b.stok -= i.jumlah; });
  db.transaksi.push(trx);
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
    <tr><td>${angka(i.jumlah)} x ${angka(i.hargaJual)}</td><td class="kanan">${angka(i.hargaJual * i.jumlah)}</td></tr>`).join('');
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
      <td class="kanan"><b>${angka(b.hargaJual)}</b></td>
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
      <p class="lemah kecil" style="margin-top:12px">Untung per barang dihitung sendiri dari harga jual dikurangi harga beli.</p>
      <p style="margin-top:14px"><b>Gambar barang</b>
        <span class="lemah kecil">— kalau dibiarkan Otomatis, gambar dipilih sendiri dari nama barang</span></p>
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
    gambar: $('#f-gambar').value || ''
  };
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
        placeholder="Contoh — hapus tulisan ini, lalu tulis daftar Bapak sendiri:&#10;Lemari pakaian Plastik ; 450000 ; 380000 ; 3&#10;Lemari plastik TwinnPan ; 520000 ; 440000 ; 2&#10;Lemari Plastik BESTPLAST ; 610000 ; 520000 ; 2&#10;Rak piring Aluminium Master ; 185000 ; 150000 ; 6&#10;Ember plastik besar ; 35000 ; 27000 ; 12"></textarea>
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
  unduhBerkas(`daftar-barang-${slugToko()}-${kunciTanggal()}.csv`, '﻿' + baris.join('\r\n'), 'text/csv;charset=utf-8');
  pesan('Daftar barang diunduh. Bisa dibuka dengan Excel.', 'sukses');
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
  const jumlahBarang = sah.reduce((j, t) => j + t.item.reduce((k, i) => k + i.jumlah, 0), 0);
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
  $('#transaksi-kosong').textContent = semua.length ? '' : 'Tidak ada transaksi pada rentang tanggal ini.';
  $('#tabel-transaksi').classList.toggle('tersembunyi', semua.length === 0);
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
  t.item.forEach(i => { const b = cariBarang(i.idBarang); if (b) b.stok += i.jumlah; });
  t.batal = true;
  t.waktuBatal = new Date().toISOString();
  t.alasanBatal = 'Dibatalkan oleh ' + (petugasSekarang?.nama || '-');
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
    '﻿' + baris.join('\r\n'), 'text/csv;charset=utf-8');
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

function gambarPengaturan() {
  $('#set-nama').value = db.toko.nama || '';
  $('#set-jenis').value = db.toko.jenis || '';
  $('#set-telepon').value = db.toko.telepon || '';
  $('#set-alamat').value = db.toko.alamat || '';
  $('#set-jam-buka').value = db.toko.jamBuka || '';
  $('#set-catatan').value = db.toko.catatanStruk || '';

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
  gambarKatalogPengaturan();
  $('#info-cadangan').innerHTML = db.terakhirCadangan
    ? `Cadangan terakhir diunduh: <b>${waktuSingkat(db.terakhirCadangan)}</b>.`
    : '<b>Belum pernah mengunduh cadangan.</b>';
}

function simpanToko() {
  db.toko.nama = $('#set-nama').value.trim() || 'Toko';
  db.toko.jenis = $('#set-jenis').value.trim();
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
    judul: p ? 'Ubah Petugas' : 'Tambah Petugas',
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
          pesan(p ? 'Data petugas diperbarui.' : 'Petugas ditambahkan.', 'sukses');
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

function unduhCadangan() {
  db.terakhirCadangan = new Date().toISOString();
  simpanData();
  unduhBerkas(`cadangan-${slugToko()}-${kunciTanggal()}.json`, JSON.stringify(db, null, 2), 'application/json');
  gambarPengaturan();
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
        <span class="lemah kecil">— enak untuk mencoba, boleh dihapus kapan saja</span></span></label>
      <label class="pilihan-radio"><input type="radio" name="w-isi" value="kosong">
        <span><b>Kosongkan</b>, saya isi sendiri barang toko saya
        <span class="lemah kecil">— daftar barang mulai dari nol</span></span></label>`,
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
      nama: db.toko.nama, jenis: db.toko.jenis,
      alamat: db.toko.alamat, telepon: db.toko.telepon, jamBuka: db.toko.jamBuka || ''
    },
    barang: db.barang.map(b => ({
      nama: b.nama, kode: b.kode || '', satuan: b.satuan || 'pcs',
      hargaJual: b.hargaJual, gambar: b.gambar || '', tersedia: b.stok > 0
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
    petugasSekarang = null;
    gambarLayarMasuk();
    gantiLayar('layar-masuk');
  };

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

  $('#tabel-keranjang').addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.hapus !== undefined) ubahJumlah(+t.dataset.hapus, 0);
    else if (t.dataset.kurang !== undefined) ubahJumlah(+t.dataset.kurang, keranjang[+t.dataset.kurang].jumlah - 1);
    else if (t.dataset.tambahSatu !== undefined) ubahJumlah(+t.dataset.tambahSatu, keranjang[+t.dataset.tambahSatu].jumlah + 1);
  });
  $('#tabel-keranjang').addEventListener('change', e => {
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

  $('#btn-selesai').onclick = selesaikanTransaksi;
  $('#btn-kosongkan').onclick = async () => {
    if (!keranjang.length) return;
    if (await konfirmasi('Kosongkan keranjang', 'Semua barang di keranjang akan dibuang.', 'Ya, kosongkan')) {
      kosongkanKeranjang();
      pesan('Keranjang dikosongkan.', 'info');
    }
  };

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

  /* --- katalog pelanggan --- */
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
  $('#btn-layar-pelanggan').onclick = () => {
    const jendela = window.open('pelanggan.html', 'layarPelanggan',
      'width=1100,height=760,menubar=no,toolbar=no');
    if (!jendela) { pesan('Browser menghalangi jendela baru. Izinkan pop-up untuk alamat ini.', 'peringatan', 6000); return; }
    siarkanKePelanggan();
    pesan('Geser jendela itu ke monitor kedua, lalu tekan F11 agar penuh layar.', 'info', 6000);
  };
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
  gantiLayar('layar-masuk');
  if (perluPanduanAwal) setTimeout(panduanAwal, 350);
}

mulai();
