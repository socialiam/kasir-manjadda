/* ============================================================
   PENYIMPAN LURING (service worker)

   Gunanya satu: halaman tetap terbuka walau sinyal hilang. Penting di
   jalur Duri, Pinggir, sampai Dumai yang sinyalnya naik turun.

   Aturannya sengaja "jaringan dulu, simpanan belakangan":
   selama ada sinyal, yang dipakai selalu berkas terbaru, sehingga
   pembaruan dari pemilik tidak pernah tertahan versi lama. Kalau
   jaringan diam lebih dari 1,5 detik, barulah simpanan dipakai, jadi
   di sinyal lemah halaman tetap terasa seketika.
   ============================================================ */
'use strict';

const VERSI = 'kasir-manjadda-v2';
const INTI = [
  './',
  'index.html',
  'katalog.html',
  'pelanggan.html',
  'style.css',
  'app.js',
  'ikon-barang.js',
  'manifest.json',
  'manifest-katalog.json',
  'hero.svg',
  'ikon-192.png',
  'ikon-512.png',
  'ikon-maskable.png'
];

const TUNGGU_JARINGAN = 1500;   // milidetik sebelum berpaling ke simpanan

self.addEventListener('install', peristiwa => {
  peristiwa.waitUntil(
    caches.open(VERSI)
      .then(simpanan => simpanan.addAll(INTI).catch(() => { /* satu berkas gagal tidak membatalkan semua */ }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', peristiwa => {
  peristiwa.waitUntil(
    caches.keys()
      .then(kunci => Promise.all(kunci.filter(k => k !== VERSI).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function lewatJaringanDulu(permintaan) {
  return new Promise(selesai => {
    let sudah = false;
    const pakaiSimpanan = () => {
      if (sudah) return;
      sudah = true;
      caches.match(permintaan).then(tersimpan => selesai(tersimpan || Response.error()));
    };
    const pewaktu = setTimeout(pakaiSimpanan, TUNGGU_JARINGAN);

    fetch(permintaan).then(jawaban => {
      clearTimeout(pewaktu);
      if (jawaban && jawaban.ok) {
        const salinan = jawaban.clone();
        caches.open(VERSI).then(simpanan => simpanan.put(permintaan, salinan)).catch(() => {});
      }
      if (!sudah) { sudah = true; selesai(jawaban); }
    }).catch(() => { clearTimeout(pewaktu); pakaiSimpanan(); });
  });
}

self.addEventListener('fetch', peristiwa => {
  const permintaan = peristiwa.request;

  // Pengiriman katalog dan permintaan selain GET tidak pernah disentuh.
  if (permintaan.method !== 'GET') return;

  const alamat = new URL(permintaan.url);
  if (alamat.origin !== self.location.origin) return;   // huruf Google dan lainnya biar apa adanya

  peristiwa.respondWith(lewatJaringanDulu(permintaan));
});
