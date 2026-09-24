/* ============================================================
   IKON BARANG - dipakai bersama oleh tiga halaman:
   index.html (kasir), pelanggan.html (layar pembeli), katalog.html.

   Gambar digambar sendiri sebagai SVG, bukan foto. Alasannya: foto milik
   orang lain tidak boleh dipakai, dan satu foto memakan jatah penyimpanan
   browser yang sama dengan data penjualan. Satu ikon hanya beberapa ratus
   huruf, tajam di layar apa pun, dan jalan tanpa internet.
   ============================================================ */
'use strict';

const bingkaiSvg = isi => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${isi}</svg>`;
const isiLembut = 'fill="currentColor" opacity=".15" stroke="none"';

const GAMBAR_BARANG = {
  gelas: `<path d="M16 10h16l-2 26a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z" ${isiLembut}/>
    <path d="M16 10h16l-2 26a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z"/><path d="M15.4 20h17.2"/>`,
  piring: `<ellipse cx="24" cy="24" rx="18" ry="12" ${isiLembut}/>
    <ellipse cx="24" cy="24" rx="18" ry="12"/><ellipse cx="24" cy="24" rx="9" ry="6"/>`,
  mangkuk: `<path d="M7 21c0 9 7.6 16 17 16s17-7 17-16z" ${isiLembut}/>
    <path d="M7 21c0 9 7.6 16 17 16s17-7 17-16z"/><path d="M4 21h40"/>`,
  sendok: `<ellipse cx="24" cy="14" rx="7" ry="9" ${isiLembut}/>
    <ellipse cx="24" cy="14" rx="7" ry="9"/><path d="M24 23v19"/>`,
  garpu: `<path d="M18 6v10M24 6v10M30 6v10"/>
    <path d="M18 16c0 4 2 6 6 6s6-2 6-6"/><path d="M24 22v20"/>`,
  pisau: `<path d="M40 6c-4 9-10 15-16 21l-4-4C26 17 32 11 40 6z" ${isiLembut}/>
    <path d="M40 6c-4 9-10 15-16 21l-4-4C26 17 32 11 40 6z"/><path d="m20 27-12 12" stroke-width="4"/>`,
  panci: `<rect x="10" y="16" width="28" height="22" rx="3" ${isiLembut}/>
    <rect x="10" y="16" width="28" height="22" rx="3"/><path d="M6 21h4M38 21h4"/>
    <path d="M10 12h28"/><path d="M24 12V8"/>`,
  wajan: `<path d="M6 20h28c0 8-6 14-14 14S6 28 6 20z" ${isiLembut}/>
    <path d="M6 20h28c0 8-6 14-14 14S6 28 6 20z"/><path d="M34 20h10"/>`,
  kompor: `<rect x="4" y="14" width="40" height="22" rx="3" ${isiLembut}/>
    <rect x="4" y="14" width="40" height="22" rx="3"/>
    <circle cx="15" cy="23" r="6"/><circle cx="33" cy="23" r="6"/><path d="M10 33h28"/>`,
  lemari: `<rect x="10" y="5" width="28" height="38" rx="3" ${isiLembut}/>
    <rect x="10" y="5" width="28" height="38" rx="3"/><path d="M10 18h28M10 31h28"/>
    <path d="M22 12h4M22 25h4M22 38h4"/>`,
  'rak-piring': `<path d="M6 16h36v18H6z" ${isiLembut}/><path d="M6 16h36v18H6z"/>
    <path d="M15 16v18M24 16v18M33 16v18"/><path d="M10 34v6M38 34v6"/>`,
  ember: `<path d="M10 17h28l-3 24H13z" ${isiLembut}/><path d="M10 17h28l-3 24H13z"/>
    <path d="M14 17c0-8 20-8 20 0"/>`,
  baskom: `<path d="M4 18h40l-6 15H10z" ${isiLembut}/><path d="M4 18h40l-6 15H10z"/><path d="M4 18h40"/>`,
  gayung: `<path d="M8 18h22v8a9 9 0 0 1-18 0z" ${isiLembut}/>
    <path d="M8 18h22v8a9 9 0 0 1-18 0z"/><path d="M6 18h26"/><path d="M32 18h6v16"/>`,
  toples: `<rect x="12" y="15" width="24" height="26" rx="4" ${isiLembut}/>
    <rect x="12" y="15" width="24" height="26" rx="4"/><rect x="10" y="8" width="28" height="7" rx="2"/>`,
  teko: `<path d="M12 18h20v14a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z" ${isiLembut}/>
    <path d="M12 18h20v14a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z"/>
    <path d="M32 22h6l4 7"/><path d="M12 22c-5 2-5 8 0 10"/><path d="M18 18v-4h8v4"/>`,
  termos: `<rect x="16" y="12" width="16" height="30" rx="3" ${isiLembut}/>
    <rect x="16" y="12" width="16" height="30" rx="3"/>
    <rect x="18" y="6" width="12" height="6" rx="2"/><path d="M16 25h16"/>`,
  galon: `<path d="M16 16h16v22a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4z" ${isiLembut}/>
    <path d="M16 16h16v22a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4z"/>
    <path d="M20 16v-6h8v6"/><path d="M19 6h10"/>`,
  sapu: `<path d="M14 27h20l4 15H10z" ${isiLembut}/><path d="M24 5v22"/>
    <path d="M14 27h20l4 15H10z"/><path d="M18 31v11M24 31v11M30 31v11"/>`,
  pel: `<path d="M12 22h24l-2 8H14z" ${isiLembut}/><path d="M24 4v18"/>
    <path d="M12 22h24l-2 8H14z"/><path d="M16 30v12M22 30v12M28 30v12M34 30v10"/>`,
  spons: `<rect x="6" y="16" width="36" height="18" rx="6" ${isiLembut}/>
    <rect x="6" y="16" width="36" height="18" rx="6"/><path d="M6 25h36"/>
    <circle cx="16" cy="21" r="1.4"/><circle cx="25" cy="21" r="1.4"/><circle cx="34" cy="21" r="1.4"/>`,
  keranjang: `<path d="M8 18h32l-4 22H12z" ${isiLembut}/><path d="M8 18h32l-4 22H12z"/>
    <path d="M18 18v22M30 18v22M10 29h28"/><path d="M16 18a8 8 0 0 1 16 0"/>`,
  sampah: `<path d="M12 16h24l-2 26H14z" ${isiLembut}/><path d="M12 16h24l-2 26H14z"/>
    <path d="M8 12h32"/><path d="M20 8h8"/><path d="M20 23v13M28 23v13"/>`,
  kardus: `<path d="M8 16h32v24H8z" ${isiLembut}/><path d="M8 16h32v24H8z"/>
    <path d="M8 16 12 8h24l4 8"/><path d="M24 16v24"/>`
};

const NAMA_GAMBAR = {
  gelas: 'Gelas', piring: 'Piring', mangkuk: 'Mangkuk', sendok: 'Sendok', garpu: 'Garpu',
  pisau: 'Pisau', panci: 'Panci', wajan: 'Wajan', kompor: 'Kompor', lemari: 'Lemari',
  'rak-piring': 'Rak piring', ember: 'Ember', baskom: 'Baskom', gayung: 'Gayung',
  toples: 'Toples', teko: 'Teko', termos: 'Termos', galon: 'Galon', sapu: 'Sapu',
  pel: 'Alat pel', spons: 'Spons', keranjang: 'Keranjang', sampah: 'Tempat sampah',
  kardus: 'Lain-lain'
};

/* Tebakan otomatis dari nama barang. Urutannya penting: kata yang lebih
   panjang diperiksa lebih dulu, supaya "rak piring" tidak jadi "piring". */
const TEBAKAN_GAMBAR = [
  ['rak-piring', ['rak piring', 'rak pinggan', 'rak gelas', 'rak dapur']],
  ['spons', ['sabut', 'spons', 'busa cuci', 'cuci piring', 'sikat']],
  ['lemari', ['lemari', 'laci', 'bufet', 'buffet', 'rak baju', 'rak pakaian']],
  ['kompor', ['kompor', 'tungku', 'anglo']],
  ['gelas', ['gelas', 'cangkir', 'mug']],
  ['piring', ['piring', 'lepek', 'pinggan']],
  ['mangkuk', ['mangkuk', 'mangkok']],
  ['sendok', ['sendok', 'centong']],
  ['garpu', ['garpu']],
  ['pisau', ['pisau', 'golok']],
  ['panci', ['panci', 'dandang', 'langseng', 'soblok', 'kukusan']],
  ['wajan', ['wajan', 'kuali', 'penggorengan', 'teflon']],
  ['ember', ['ember', 'timba']],
  ['baskom', ['baskom', 'waskom', 'loyang', 'nampan', 'tampah', 'talenan']],
  ['gayung', ['gayung']],
  ['toples', ['toples', 'stoples']],
  ['teko', ['teko', 'ceret', 'cerek', 'poci']],
  ['termos', ['termos', 'tumbler', 'botol minum']],
  ['galon', ['galon', 'jerigen', 'jeriken', 'derigen']],
  ['sapu', ['sapu', 'sulak', 'kemoceng']],
  ['pel', ['pel ', 'alat pel', 'kain pel']],
  ['keranjang', ['keranjang', 'bakul', 'rinjing']],
  ['sampah', ['sampah']]
];

function tebakGambar(nama) {
  const n = String(nama || '').toLowerCase();
  for (const [ikon, kata] of TEBAKAN_GAMBAR) if (kata.some(k => n.includes(k))) return ikon;
  return 'kardus';
}

/** Ikon barang: pilihan pemilik kalau ada, kalau tidak ditebak dari namanya. */
function ikonBarang(barang, kelasTambahan = '') {
  const kunci = barang?.gambar || tebakGambar(barang?.nama);
  return `<span class="ikon-barang ${kelasTambahan}">${bingkaiSvg(GAMBAR_BARANG[kunci] || GAMBAR_BARANG.kardus)}</span>`;
}
