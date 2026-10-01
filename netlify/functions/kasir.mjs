/* ============================================================
   PINTU DATA TOKO

   Satu-satunya jalan menuju data toko. Browser tidak pernah memegang
   kunci penyimpanan; yang dikirimnya hanya PIN, dan PIN itu diperiksa
   DI SINI. Itulah yang membuat PIN benar-benar menjadi gerbang, bukan
   pagar hiasan seperti kalau datanya dibuka langsung dari browser.

   Yang disimpan di penyimpanan Netlify:
     toko   -> seluruh data toko, termasuk sidik PIN tiap petugas
   Sidik PIN tidak pernah ikut terkirim keluar.
   ============================================================ */
'use strict';

import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const KUNCI_DATA = 'toko';
const UMUR_TOKEN_JAM = 12;

/* Gembok yang sama bentuknya dengan yang di aplikasi: lima kali salah
   masih dimaafkan, sesudah itu jedanya berlipat dua sampai seperempat
   jam. Di sini ia dihitung di server, jadi menghapus simpanan browser
   atau berpindah perangkat tidak melepaskannya. */
const GAGAL_DIMAAFKAN = 5;
const JEDA_AWAL_DETIK = 30;
const JEDA_MAKS_DETIK = 900;

/* Daftar yang hanya pernah bertambah. Dua perangkat yang berjualan
   bersamaan tidak boleh saling menghapus nota, jadi yang ini disatukan
   menurut id, bukan ditimpa. */
const DAFTAR_TAMBAH = ['transaksi', 'barangMasuk', 'catatan', 'tutupKasir', 'tertahan'];
/* Daftar catatan yang bisa diubah dan dihapus. Disatukan menurut id juga,
   dengan isi dari pengirim yang menang bila id-nya sama. */
const DAFTAR_CATATAN = ['barang', 'petugas'];

const simpanan = () => getStore({ name: 'kasir-manjadda', consistency: 'strong' });

const KEPALA = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex'
};

const jawab = (kode, isi) => ({ statusCode: kode, headers: KEPALA, body: JSON.stringify(isi) });

/* ---------- sidik PIN ----------
   Bentuknya sengaja sama persis dengan yang dipakai aplikasi:
   v2$garam$putaran$sidik. Dengan begitu PIN yang dibuat di browser bisa
   diperiksa di sini, dan sebaliknya, tanpa penerjemahan apa pun. */
function sidikPbkdf2(pin, garamHeks, putaran) {
  const garam = Buffer.from(garamHeks, 'hex');
  return crypto.pbkdf2Sync(String(pin), garam, putaran, 32, 'sha256').toString('hex');
}

function sidikCocok(pin, tersimpan) {
  if (!tersimpan) return false;
  const bagian = String(tersimpan).split('$');
  if (bagian.length !== 4 || bagian[0] !== 'v2') return false;
  const dihitung = sidikPbkdf2(pin, bagian[1], Number(bagian[2]));
  // Dibandingkan dengan waktu tetap, supaya lamanya menjawab tidak
  // membocorkan seberapa dekat tebakan itu.
  const a = Buffer.from(dihitung, 'hex');
  const b = Buffer.from(bagian[3], 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- token giliran ----------
   Ditandatangani dengan rahasia yang hanya ada di server, jadi tidak bisa
   dibuat-buat dari browser. Isinya terbuka dan memang tidak rahasia: siapa
   dan sampai kapan. */
function rahasia() {
  const r = process.env.KASIR_RAHASIA;
  if (!r || r.length < 24) throw new Error('KASIR_RAHASIA belum dipasang di Netlify');
  return r;
}

function buatToken(petugasId, peran) {
  const sampai = Date.now() + UMUR_TOKEN_JAM * 3600 * 1000;
  const isi = `${petugasId}.${peran}.${sampai}`;
  const tanda = crypto.createHmac('sha256', rahasia()).update(isi).digest('hex');
  return `${Buffer.from(isi).toString('base64url')}.${tanda}`;
}

function bacaToken(token) {
  if (!token) return null;
  const [bagian, tanda] = String(token).split('.');
  if (!bagian || !tanda) return null;
  let isi;
  try { isi = Buffer.from(bagian, 'base64url').toString('utf8'); } catch (e) { return null; }
  const benar = crypto.createHmac('sha256', rahasia()).update(isi).digest('hex');
  const a = Buffer.from(tanda, 'hex');
  const b = Buffer.from(benar, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [petugasId, peran, sampai] = isi.split('.');
  if (Number(sampai) < Date.now()) return null;
  return { petugasId, peran };
}

/* ---------- penyatuan dua salinan ----------
   Dipanggil setiap kali ada yang menyimpan. Tanpa ini, perangkat yang
   menyimpan belakangan akan menghapus penjualan perangkat yang lain --
   kesalahan yang paling mahal dan paling sulit disadari di sebuah kasir. */
function satukanDaftar(diServer = [], dariPengirim = [], pengirimMenang) {
  const peta = new Map();
  diServer.forEach(x => { if (x && x.id) peta.set(x.id, x); });
  dariPengirim.forEach(x => {
    if (!x || !x.id) return;
    if (!peta.has(x.id) || pengirimMenang) peta.set(x.id, x);
  });
  return [...peta.values()];
}

function satukan(lama, baru) {
  if (!lama) return baru;
  const hasil = { ...lama, ...baru };
  DAFTAR_TAMBAH.forEach(k => { hasil[k] = satukanDaftar(lama[k], baru[k], false); });
  DAFTAR_CATATAN.forEach(k => { hasil[k] = satukanDaftar(lama[k], baru[k], true); });
  hasil.arsip = { ...(lama.arsip || {}), ...(baru.arsip || {}) };
  // Nomor nota tidak boleh mundur, kalau tidak dua nota bisa bernomor sama.
  hasil.nomorTerakhir = Math.max(Number(lama.nomorTerakhir) || 0, Number(baru.nomorTerakhir) || 0);
  return hasil;
}

/* ---------- muatan yang boleh keluar ----------
   Sidik PIN, hitungan gagal, dan gembok tidak pernah dikirim ke browser.
   Browser tidak membutuhkannya: pemeriksaan PIN terjadi di sini. */
function tanpaRahasia(data) {
  const salinan = { ...data };
  salinan.petugas = (data.petugas || []).map(p => ({
    id: p.id, nama: p.nama, peran: p.peran,
    adaPin: !!p.pin, pinBawaan: !!p.pinBawaan,
    /* Panjang PIN bukan rahasia -- titik-titiknya sudah terlihat di layar --
       dan perangkat baru membutuhkannya supaya PIN terkirim sendiri begitu
       panjangnya pas, bukan menunggu tombol MASUK. Sengaja TIDAK ikut di
       jawaban 'keadaan', yang terbuka tanpa PIN. */
    panjangPin: Number(p.panjangPin) || 0
  }));
  return salinan;
}

/* ---------- gembok di server ---------- */
function sisaKunci(p) {
  if (!p || !p.kunciSampai) return 0;
  return Math.max(0, Math.ceil((p.kunciSampai - Date.now()) / 1000));
}

function catatGagal(p) {
  p.gagalPin = (p.gagalPin || 0) + 1;
  const lewat = p.gagalPin - GAGAL_DIMAAFKAN;
  if (lewat > 0) {
    p.kunciSampai = Date.now() +
      Math.min(JEDA_AWAL_DETIK * Math.pow(2, lewat - 1), JEDA_MAKS_DETIK) * 1000;
  }
}

/* ============================================================ */

/** Inti pintu, terpisah dari bentuk HTTP-nya supaya bisa diuji langsung. */
export async function tangani(minta) {
  const toko = simpanan();

  try {
    /* --- apakah toko ini sudah dipasang? Tidak ada rahasia di jawabannya,
           hanya supaya aplikasi tahu harus menawarkan pemasangan atau tidak. */
    if (minta.aksi === 'keadaan') {
      const ada = await toko.get(KUNCI_DATA, { type: 'json' });
      return jawab(200, {
        terpasang: !!ada,
        petugas: ada ? (ada.petugas || []).map(p => ({
          id: p.id, nama: p.nama, peran: p.peran, adaPin: !!p.pin
        })) : []
      });
    }

    /* --- pemasangan pertama. Hanya sekali seumur hidup toko ini, dan
           menuntut kunci yang hanya ada di pengaturan Netlify. */
    if (minta.aksi === 'pasang') {
      const kunci = process.env.KASIR_KUNCI_PASANG;
      if (!kunci || kunci.length < 12) return jawab(500, { galat: 'KASIR_KUNCI_PASANG belum dipasang' });
      if (minta.kunci !== kunci) return jawab(403, { galat: 'Kunci pemasangan salah' });
      const ada = await toko.get(KUNCI_DATA, { type: 'json' });
      if (ada) return jawab(409, { galat: 'Toko ini sudah pernah dipasang' });
      if (!minta.data || !Array.isArray(minta.data.petugas)) {
        return jawab(400, { galat: 'Data awal tidak lengkap' });
      }
      const data = { ...minta.data, versi: 1, diperbaruiPada: new Date().toISOString() };
      await toko.setJSON(KUNCI_DATA, data);
      return jawab(200, { terpasang: true, versi: 1 });
    }

    /* --- masuk dengan PIN --- */
    if (minta.aksi === 'masuk') {
      const data = await toko.get(KUNCI_DATA, { type: 'json' });
      if (!data) return jawab(404, { galat: 'Toko ini belum dipasang' });

      const p = (data.petugas || []).find(x => x.id === minta.petugasId);
      if (!p) return jawab(404, { galat: 'Petugas tidak dikenal' });

      const sisa = sisaKunci(p);
      if (sisa > 0) return jawab(429, { galat: 'Terlalu banyak salah', tungguDetik: sisa });

      /* Petugas tanpa PIN tetap bisa masuk, sama seperti di aplikasi.
         Itu keputusan pemilik, bukan kelalaian: PIN karyawan diberikan
         oleh pemilik lewat Pengaturan. */
      if (p.pin && !sidikCocok(minta.pin || '', p.pin)) {
        catatGagal(p);
        await toko.setJSON(KUNCI_DATA, data);
        const baru = sisaKunci(p);
        return jawab(401, {
          galat: 'PIN salah',
          sisaPercobaan: Math.max(0, GAGAL_DIMAAFKAN - p.gagalPin),
          tungguDetik: baru
        });
      }

      if (p.gagalPin || p.kunciSampai) {
        p.gagalPin = 0; p.kunciSampai = 0;
        await toko.setJSON(KUNCI_DATA, data);
      }
      return jawab(200, {
        token: buatToken(p.id, p.peran),
        petugas: { id: p.id, nama: p.nama, peran: p.peran },
        versi: data.versi || 1
      });
    }

    /* --- semua di bawah ini menuntut token yang sah --- */
    const giliran = bacaToken(minta.token);
    if (!giliran) return jawab(401, { galat: 'Giliran sudah habis, masuk lagi dengan PIN' });

    if (minta.aksi === 'ambil') {
      const data = await toko.get(KUNCI_DATA, { type: 'json' });
      if (!data) return jawab(404, { galat: 'Toko ini belum dipasang' });
      return jawab(200, { versi: data.versi || 1, data: tanpaRahasia(data) });
    }

    if (minta.aksi === 'simpan') {
      const lama = await toko.get(KUNCI_DATA, { type: 'json' });
      if (!lama) return jawab(404, { galat: 'Toko ini belum dipasang' });
      if (!minta.data) return jawab(400, { galat: 'Tidak ada data yang dikirim' });

      /* Sidik PIN tidak pernah dikirim ke browser, jadi ia juga tidak boleh
         ikut kembali dari browser. Yang di server selalu yang dipakai. */
      const petugasAman = (minta.data.petugas || []).map(baru => {
        const di = (lama.petugas || []).find(x => x.id === baru.id);
        return di
          ? { ...baru, pin: di.pin, panjangPin: di.panjangPin, pinBawaan: di.pinBawaan,
              gagalPin: di.gagalPin, kunciSampai: di.kunciSampai }
          : { ...baru, pin: '', panjangPin: 0, pinBawaan: false, gagalPin: 0, kunciSampai: 0 };
      });

      const gabung = satukan(lama, { ...minta.data, petugas: petugasAman });
      gabung.versi = (lama.versi || 1) + 1;
      gabung.diperbaruiPada = new Date().toISOString();
      gabung.diperbaruiOleh = giliran.petugasId;
      await toko.setJSON(KUNCI_DATA, gabung);

      return jawab(200, {
        versi: gabung.versi,
        // Hasil penyatuan dikirim balik, supaya perangkat ini langsung
        // memegang gabungan dengan perangkat lain tanpa menunggu.
        data: tanpaRahasia(gabung)
      });
    }

    /* --- mengganti PIN. Hanya diri sendiri, atau pemilik untuk siapa pun. */
    if (minta.aksi === 'gantiPin') {
      const data = await toko.get(KUNCI_DATA, { type: 'json' });
      if (!data) return jawab(404, { galat: 'Toko ini belum dipasang' });
      const sasaran = (data.petugas || []).find(x => x.id === minta.petugasId);
      if (!sasaran) return jawab(404, { galat: 'Petugas tidak dikenal' });
      if (giliran.peran !== 'pemilik' && giliran.petugasId !== sasaran.id) {
        return jawab(403, { galat: 'Hanya pemilik yang boleh mengganti PIN orang lain' });
      }
      if (giliran.petugasId === sasaran.id && sasaran.pin && !sidikCocok(minta.pinLama || '', sasaran.pin)) {
        return jawab(401, { galat: 'PIN Anda sekarang salah' });
      }
      if (minta.sidikBaru && !/^v2\$[0-9a-f]+\$\d+\$[0-9a-f]+$/.test(minta.sidikBaru)) {
        return jawab(400, { galat: 'Bentuk sidik PIN tidak dikenal' });
      }
      sasaran.pin = minta.sidikBaru || '';
      sasaran.panjangPin = Number(minta.panjangBaru) || 0;
      sasaran.pinBawaan = false;
      sasaran.gagalPin = 0;
      sasaran.kunciSampai = 0;
      data.versi = (data.versi || 1) + 1;
      await toko.setJSON(KUNCI_DATA, data);
      return jawab(200, { versi: data.versi });
    }

    return jawab(400, { galat: 'Perintah tidak dikenal' });
  } catch (e) {
    return jawab(500, { galat: e.message });
  }
}

/* ---------- bungkus HTTP ----------
   Bentuk baru Netlify, yang memang bentuk inilah yang mendapat sambungan
   ke penyimpanan secara sendirinya. Bentuk lama (exports.handler) berjalan
   tetapi tidak pernah diberi sambungan itu, dan itulah sebabnya pintu ini
   semula menjawab "belum dikonfigurasi". */
export default async function (permintaan) {
  if (permintaan.method !== 'POST') {
    return new Response(JSON.stringify({ galat: 'Hanya POST' }), {
      status: 405, headers: KEPALA
    });
  }
  let minta;
  try { minta = await permintaan.json(); }
  catch (e) {
    return new Response(JSON.stringify({ galat: 'Permintaan tidak terbaca' }), {
      status: 400, headers: KEPALA
    });
  }
  const hasil = await tangani(minta);
  return new Response(hasil.body, { status: hasil.statusCode, headers: hasil.headers });
}
