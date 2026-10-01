/* ============================================================
   DATA BERSAMA

   Membuat satu data toko dipakai bersama oleh semua perangkat: diubah di
   komputer kasir, muncul di HP pemilik, dan sebaliknya.

   Dibuat sebagai berkas TERPISAH dengan sengaja. Kalau berkas ini gagal
   dimuat, servernya mati, atau sinyalnya hilang, kasir tetap bekerja
   persis seperti sebelumnya dengan simpanan di perangkat sendiri. Tidak
   ada satu pun jalan di sini yang boleh menghalangi orang berjualan.

   Aturan yang dipegang:
   - Simpanan di perangkat tetap yang utama saat melayani pembeli, supaya
     kasir tidak pernah menunggu jaringan di depan orang yang mau bayar.
   - Kiriman ke server menyusul di belakang, dan kalau gagal ia mengantre,
     bukan hilang.
   - PIN diperiksa di server kalau ada sinyal. Kalau tidak ada, diperiksa
     di perangkat sendiri -- sebab data yang bisa dibuka pun cuma salinan
     yang memang sudah ada di perangkat itu.
   ============================================================ */
'use strict';

const AWAN_PINTU = '/.netlify/functions/kasir';
const AWAN_JEDA_DORONG = 1500;      // menunggu sejenak, supaya ketikan beruntun jadi satu kiriman
const AWAN_JEDA_TARIK = 12000;      // seberapa sering mengintip perubahan dari perangkat lain
const AWAN_KUNCI_TOKEN = 'kasirToko.giliran';

/* ---------- menahan panduan awal ----------
   Berjalan SEKETIKA saat berkas ini dibaca, masih sebelum panduan awal
   sempat muncul, sebab app.js menjadwalkannya 350 milidetik sesudah muat.

   Kenapa harus ditahan: di perangkat yang baru, panduan itu muncul sebelum
   data dari server sempat tiba, dan ia menawarkan "pakai 8 barang contoh".
   Sekali ditekan, delapan barang karangan itu terkirim ke data bersama
   SELURUH toko. Menutupnya belakangan tidak cukup -- yang sempat terlihat
   sempat pula ditekan.

   Kalau ternyata toko ini memang belum pernah dipasang di server, atau
   servernya tidak ada sama sekali, panduannya dipanggil sendiri di bawah.
   Jadi ini penahanan, bukan penghapusan. */
let panduanDitahan = false;
let panduanSempatDiminta = false;
/* Sekali toko ini terbukti sudah berdiri di server, panduan pendiriannya
   padam untuk seterusnya dan TIDAK bisa dinyalakan lagi oleh siapa pun --
   termasuk oleh penangkap galat di bawah, yang kalau tidak begini akan
   melepaskannya setiap kali awanMulai tersandung sesudah mengenali toko. */
let panduanDipadamkan = false;

if (typeof perluPanduanAwal !== 'undefined' && perluPanduanAwal) {
  panduanDitahan = true;

  /* Yang dicegat adalah JENDELANYA, bukan penandanya. app.js sudah
     menjadwalkan panduan itu di dalam mulai(), yang berjalan sebelum berkas
     ini dibaca sama sekali -- jadi mematikan perluPanduanAwal sekarang tidak
     berpengaruh apa pun, dan mengganti panduanAwal pun tidak, sebab
     setTimeout sudah memegang fungsi yang lama.

     Menutup jendelanya sesudah terlanjur terbuka juga tidak cukup: yang
     sempat terlihat sempat pula ditekan. */
  if (typeof bukaModal === 'function') {
    const bukaAsli = bukaModal;
    bukaModal = function (pilihan) {
      if (panduanDitahan && pilihan && pilihan.judul === 'Selamat datang') {
        panduanSempatDiminta = true;
        return;
      }
      return bukaAsli(pilihan);
    };
  }
}

/** Melepaskan panduan awal yang tadi ditahan, kalau memang masih perlu. */
function awanLepaskanPanduan() {
  if (panduanDipadamkan) return;
  if (!panduanDitahan) return;
  panduanDitahan = false;
  if (!panduanSempatDiminta) return;
  panduanSempatDiminta = false;
  try { if (typeof panduanAwal === 'function') panduanAwal(); } catch (e) { /* biarkan */ }
}

const awan = {
  tersedia: false,      // pintunya menjawab dan tokonya sudah dipasang
  token: null,
  petugasId: null,
  versi: 0,
  pewaktuDorong: null,
  pewaktuTarik: null,
  adaYangBelumTerkirim: false,
  sedangDorong: false,
  terakhirSelaras: null
};

/* ---------- percakapan dengan pintu ---------- */
async function awanPanggil(isi, batasMs = 12000) {
  const batal = new AbortController();
  const pewaktu = setTimeout(() => batal.abort(), batasMs);
  try {
    const jawaban = await fetch(AWAN_PINTU, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isi),
      signal: batal.signal
    });
    const hasil = await jawaban.json().catch(() => ({}));
    return { kode: jawaban.status, isi: hasil };
  } catch (e) {
    return { kode: 0, isi: { galat: 'Tidak ada sambungan' } };
  } finally {
    clearTimeout(pewaktu);
  }
}

/* ---------- penanda di layar ----------
   Pemilik harus bisa tahu sekilas: yang dilihatnya ini data bersama, atau
   salinan perangkat ini saja. Tanpa penanda, dua hal yang sangat berbeda
   terlihat sama persis. */
function awanGambarPenanda() {
  const kotak = document.getElementById('penanda-awan');
  if (!kotak) return;
  if (!awan.tersedia) {
    kotak.className = 'penanda-awan mati';
    kotak.innerHTML = '<i></i><span class="hanya-besar">Perangkat ini saja</span>';
    kotak.title = 'Data hanya tersimpan di perangkat ini, tidak dibagi ke perangkat lain.';
    return;
  }
  if (awan.adaYangBelumTerkirim) {
    kotak.className = 'penanda-awan menunggu';
    kotak.innerHTML = '<i></i><span class="hanya-besar">Menunggu sinyal</span>';
    kotak.title = 'Penjualan tersimpan aman di perangkat ini dan akan terkirim sendiri begitu sinyal kembali.';
    return;
  }
  kotak.className = 'penanda-awan hidup';
  kotak.innerHTML = '<i></i><span class="hanya-besar">Data bersama</span>';
  kotak.title = awan.terakhirSelaras
    ? 'Selaras dengan perangkat lain pada ' + awan.terakhirSelaras
    : 'Selaras dengan perangkat lain.';
}

/* ---------- menyatukan kiriman server ke data di perangkat ----------
   Bentuknya sama dengan yang di server, dan itu disengaja: yang menang di
   kedua tempat harus sama, kalau tidak dua perangkat bisa berselisih
   selamanya. */
function awanSatukanDaftar(diSini = [], dariServer = [], serverMenang) {
  const peta = new Map();
  diSini.forEach(x => { if (x && x.id) peta.set(x.id, x); });
  dariServer.forEach(x => {
    if (!x || !x.id) return;
    if (!peta.has(x.id) || serverMenang) peta.set(x.id, x);
  });
  return [...peta.values()];
}

function awanSatukanKeDb(dariServer) {
  if (!dariServer) return;
  ['transaksi', 'barangMasuk', 'catatan', 'tutupKasir', 'tertahan'].forEach(k => {
    db[k] = awanSatukanDaftar(db[k], dariServer[k], false);
  });
  db.barang = awanSatukanDaftar(db.barang, dariServer.barang, true);

  /* Nisan dari server ikut dipakai di sini, supaya barang yang dibuang di
     perangkat lain ikut hilang dari perangkat ini. */
  db.dihapus = {
    barang: { ...((db.dihapus || {}).barang || {}), ...((dariServer.dihapus || {}).barang || {}) },
    petugas: { ...((db.dihapus || {}).petugas || {}), ...((dariServer.dihapus || {}).petugas || {}) }
  };
  db.barang = db.barang.filter(b => !db.dihapus.barang[b.id]);

  /* Petugas butuh perlakuan khusus: server tidak pernah mengirimkan sidik
     PIN, jadi yang ada di perangkat ini harus dipertahankan. Tanpa ini,
     satu kali tarik akan mengosongkan semua PIN dan membuat kasir bisa
     dibuka siapa saja. */
  const petugasServer = dariServer.petugas || [];
  const peta = new Map((db.petugas || []).map(p => [p.id, p]));
  const petugasHidup = petugasServer.filter(ps => !(db.dihapus || { petugas: {} }).petugas[ps.id]);
  db.petugas = petugasHidup.map(ps => {
    const lokal = peta.get(ps.id);
    return lokal
      ? { ...lokal, nama: ps.nama, peran: ps.peran,
          panjangPin: lokal.panjangPin || Number(ps.panjangPin) || 0 }
      : { id: ps.id, nama: ps.nama, peran: ps.peran, pin: '',
          panjangPin: Number(ps.panjangPin) || 0,
          pinBawaan: !!ps.pinBawaan, gagalPin: 0, kunciSampai: 0 };
  });

  db.toko = { ...db.toko, ...(dariServer.toko || {}) };
  db.arsip = { ...(db.arsip || {}), ...(dariServer.arsip || {}) };
  db.nomorTerakhir = Math.max(Number(db.nomorTerakhir) || 0, Number(dariServer.nomorTerakhir) || 0);
}

/** Menggambar ulang layar yang sedang terbuka, supaya perubahan dari
    perangkat lain benar-benar terlihat tanpa perlu muat ulang. */
function awanGambarUlang() {
  const aman = f => { try { if (typeof window[f] === 'function') window[f](); } catch (e) { /* layar itu sedang tidak terbuka */ } };
  aman('gambarPilihanBarang');
  aman('gambarTabelBarang');
  aman('gambarKategoriJual');
  aman('gambarPengaturan');
  aman('gambarLaporan');
  awanGambarPenanda();
}

/* ---------- menyamakan daftar petugas dengan server ----------
   Perangkat yang belum pernah menyelaraskan membuat daftar petugasnya
   sendiri, lengkap dengan id buatannya sendiri. Server tidak mengenali id
   itu, jadi PIN tidak akan pernah bisa diperiksa di sana dan perangkat ini
   diam-diam jatuh ke pemeriksaan lokal selamanya.

   Maka untuk toko yang datanya bersama, daftar petugas datang dari server.
   Yang dipertahankan dari perangkat ini hanyalah sidik PIN, dicocokkan
   menurut nama, supaya pemeriksaan lokal tetap bisa dipakai waktu sinyal
   hilang. */
function awanSelaraskanPetugas(dariServer) {
  if (!Array.isArray(dariServer) || !dariServer.length) return;
  const perNama = new Map((db.petugas || []).map(p => [p.nama, p]));
  db.petugas = dariServer.map(ps => {
    const lokal = perNama.get(ps.nama);
    return lokal
      ? { ...lokal, id: ps.id, nama: ps.nama, peran: ps.peran }
      : { id: ps.id, nama: ps.nama, peran: ps.peran, pin: '', panjangPin: 0,
          pinBawaan: !!ps.pinBawaan, gagalPin: 0, kunciSampai: 0 };
  });
  awanSimpanLokalSaja();

  /* Papan angka biasanya SUDAH terbuka sebelum daftar ini tiba, memakai
     catatan petugas buatan perangkat ini sendiri. Kalau tidak diarahkan
     ulang ke catatan dari server, id yang dikirim saat memasukkan PIN tidak
     dikenali server, dan pemeriksaan diam-diam jatuh ke perangkat sendiri --
     seolah berhasil, padahal tidak pernah tersambung. */
  if (petugasMenunggu) {
    const diServer = db.petugas.find(x => x.nama === petugasMenunggu.nama) || db.petugas[0];
    if (diServer) { petugasMenunggu = diServer; gambarLayarKunci(); gambarKeadaanKunci(); }
  }

  try { if (typeof gambarLayarMasuk === 'function') gambarLayarMasuk(); } catch (e) { /* layar belum siap */ }
}

/* ---------- menarik perubahan dari perangkat lain ---------- */
async function awanTarik(diam = true) {
  if (!awan.tersedia || !awan.token) return;
  const r = await awanPanggil({ aksi: 'ambil', token: awan.token });
  if (r.kode === 401) { awanGiliranHabis(); return; }
  if (r.kode !== 200) return;                       // diam saja; nanti dicoba lagi
  if (r.isi.versi === awan.versi) { awan.terakhirSelaras = awanJam(); awanGambarPenanda(); return; }

  awanSatukanKeDb(r.isi.data);
  awan.versi = r.isi.versi;
  awan.terakhirSelaras = awanJam();
  awanSimpanLokalSaja();
  awanGambarUlang();
  if (!diam && typeof pesan === 'function') pesan('Data diperbarui dari perangkat lain.', 'info', 3000);
}

const awanJam = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

/* ---------- mengirim perubahan ---------- */
async function awanDorongSekarang() {
  if (!awan.tersedia || !awan.token || awan.sedangDorong) return;
  awan.sedangDorong = true;
  try {
    const r = await awanPanggil({ aksi: 'simpan', token: awan.token, data: db });
    if (r.kode === 401) { awanGiliranHabis(); return; }
    if (r.kode !== 200) {
      // Gagal bukan berarti hilang: datanya sudah aman di perangkat ini,
      // dan antreannya tetap menyala sampai benar-benar terkirim.
      awan.adaYangBelumTerkirim = true;
      awanGambarPenanda();
      return;
    }
    awanSatukanKeDb(r.isi.data);     // hasil gabungan dengan perangkat lain
    awan.versi = r.isi.versi;
    awan.adaYangBelumTerkirim = false;
    awan.terakhirSelaras = awanJam();
    awanSimpanLokalSaja();
    awanGambarUlang();
  } finally {
    awan.sedangDorong = false;
  }
}

function awanJadwalkanDorong() {
  if (!awan.tersedia) return;
  awan.adaYangBelumTerkirim = true;
  awanGambarPenanda();
  clearTimeout(awan.pewaktuDorong);
  awan.pewaktuDorong = setTimeout(awanDorongSekarang, AWAN_JEDA_DORONG);
}

function awanGiliranHabis() {
  awan.token = null;
  try { localStorage.removeItem(AWAN_KUNCI_TOKEN); } catch (e) { /* tidak apa-apa */ }
  awanGambarPenanda();
  if (typeof pesan === 'function') {
    pesan('Giliran di server sudah habis. Masuk lagi dengan PIN untuk menyelaraskan.', 'peringatan', 6000);
  }
}

/* ---------- menyimpan ke perangkat tanpa ikut mengirim ---------- */
let awanSimpanLokalSaja = () => {};

/* ---------- masuk lewat server ----------
   Dipanggil oleh layar kunci. Jawabannya tiga macam, dan ketiganya harus
   ditangani berbeda:
     true   PIN benar menurut server
     false  PIN salah menurut server
     null   server tidak terjangkau; silakan periksa di perangkat sendiri */
async function awanMasuk(petugas, pin) {
  if (!awan.tersedia) return null;
  const r = await awanPanggil({ aksi: 'masuk', petugasId: petugas.id, pin });
  if (r.kode === 0) return null;                       // tidak ada sinyal
  if (r.kode === 200) {
    awan.token = r.isi.token;
    awan.petugasId = petugas.id;
    try { localStorage.setItem(AWAN_KUNCI_TOKEN, r.isi.token); } catch (e) { /* tidak apa-apa */ }
    await awanTarik();
    awanMulaiPengintip();
    return true;
  }
  if (r.kode === 429) {
    return { terkunci: true, tungguDetik: r.isi.tungguDetik || 0 };
  }
  if (r.kode === 401) {
    return { salah: true, tungguDetik: r.isi.tungguDetik || 0, sisaPercobaan: r.isi.sisaPercobaan };
  }
  return null;                                          // keadaan lain: jangan menghalangi
}

/* ---------- mengganti PIN di server ----------
   Server sengaja mengabaikan sidik PIN yang datang lewat penyimpanan biasa,
   supaya browser tidak bisa menyetir PIN siapa pun. Maka penggantian PIN
   punya pintunya sendiri.

   Jawabannya:
     true   tersimpan di server
     false  server menolak
     null   server tidak terjangkau; PIN baru berlaku di perangkat ini saja */
async function awanGantiPin(petugas, pinLama, sidikBaru, panjangBaru) {
  if (!awan.tersedia || !awan.token) return null;
  const r = await awanPanggil({
    aksi: 'gantiPin', token: awan.token, petugasId: petugas.id,
    pinLama, sidikBaru, panjangBaru
  });
  if (r.kode === 0) return null;
  if (r.kode === 200) { awan.versi = r.isi.versi; return true; }
  if (r.kode === 401 && /giliran/i.test(r.isi.galat || '')) { awanGiliranHabis(); return null; }
  return false;
}

/* ---------- pengintip berkala ---------- */
function awanMulaiPengintip() {
  clearInterval(awan.pewaktuTarik);
  awan.pewaktuTarik = setInterval(() => {
    if (document.hidden) return;        // layar tidak dilihat, jangan buang sinyal
    awanTarik();
  }, AWAN_JEDA_TARIK);
}

/* ---------- pemasangan awal ----------
   Hanya sekali seumur hidup toko, dan menuntut kunci yang hanya ada di
   pengaturan Netlify. Sesudahnya pintu ini menolak selamanya. */
async function awanPasang(kunci) {
  const r = await awanPanggil({ aksi: 'pasang', kunci, data: db }, 30000);
  return r;
}

/* ---------- penyalaan ---------- */
async function awanMulai() {
  // Membungkus simpanData yang asli. Yang asli tetap dipanggil lebih dulu
  // dan tetap menyimpan ke perangkat, jadi kalau bagian awan gagal pun
  // tidak ada satu pun penjualan yang hilang.
  const simpanAsli = simpanData;
  awanSimpanLokalSaja = (data = db) => simpanAsli(data);
  simpanData = function (data = db) {
    simpanAsli(data);
    awanJadwalkanDorong();
  };

  const r = await awanPanggil({ aksi: 'keadaan' }, 8000);
  awan.tersedia = r.kode === 200 && r.isi.terpasang === true;
  awanGambarPenanda();
  if (!awan.tersedia) { awanLepaskanPanduan(); return; }

  // Harus sebelum siapa pun menekan namanya di layar masuk, sebab id dari
  // server itulah yang nanti dipakai memeriksa PIN.
  awanSelaraskanPetugas(r.isi.petugas);

  /* Toko ini sudah berdiri, jadi panduan pendiriannya dipadamkan untuk
     SETERUSNYA -- penahanannya sengaja TIDAK dilepas.

     Kalau di sini panduanDitahan dijadikan false, pencegatnya ikut terbuka,
     dan panduan yang dijadwalkan app.js pada 350 milidetik lolos begitu saja
     setiap kali jawaban server datang lebih cepat dari itu. Di jaringan
     cepat, itu hampir selalu. */
  panduanDipadamkan = true;
  panduanSempatDiminta = false;

  // Giliran yang belum habis boleh dipakai lagi, supaya membuka kasir di
  // pagi hari tidak selalu menuntut PIN dua kali.
  try {
    const tersimpan = localStorage.getItem(AWAN_KUNCI_TOKEN);
    if (tersimpan) {
      awan.token = tersimpan;
      await awanTarik();
      if (awan.token) awanMulaiPengintip();
    }
  } catch (e) { /* tidak apa-apa */ }

  // Begitu sinyal kembali, antrean yang tertahan dikirim sendiri.
  window.addEventListener('online', () => {
    if (awan.adaYangBelumTerkirim) awanDorongSekarang();
    else awanTarik();
  });
  // Kembali melihat layar sesudah ditinggal: periksa perubahan sekali.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) awanTarik(); });
}

window.addEventListener('load', () => {
  // Panduan yang tadi ditahan WAJIB dilepaskan juga kalau bagian awan gagal,
  // kalau tidak pemasangan baru yang luring tidak pernah dipandu sama sekali.
  awanMulai().catch(() => { awanLepaskanPanduan(); });
});
