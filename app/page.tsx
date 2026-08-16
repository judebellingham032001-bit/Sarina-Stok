'use client';

import { useState, useEffect } from 'react';

// ==========================================
// HELPER SPLIT CSV
// ==========================================
function splitCSV(line: string) {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;

  if (!line) return [];

  for (let char of line) {
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === ',' && !inQuote) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }

  result.push(cur.trim());
  return result;
}

// ==========================================
// HELPER PARSE PECAHAN & WARNA STOK KEMASAN
// ==========================================
function formatPecahanIkat(val: string) {
  if (
    !val ||
    val === '-' ||
    val.trim() === '' ||
    val.trim() === '0'
  ) {
    return null;
  }

  const rawStr = val.toString().trim();

  const unitTxt = rawStr
    .replace(/[0-9.,-]/g, '')
    .trim();

  const angkaBersih = rawStr
    .replace(/,/g, '.')
    .replace(/[^0-9.-]/g, '');

  const num = parseFloat(angkaBersih);

  if (isNaN(num)) {
    return {
      text: rawStr,
      colorClass: 'text-emerald-700',
      numericValue: null as number | null,
    };
  }

  const utuhAwal = Math.floor(Math.abs(num));
  let utuh = utuhAwal;
  const sisa = Math.abs(num) - utuh;
  let pecahanTxt = '';

  if (Math.abs(sisa - 0.25) < 0.05) {
    pecahanTxt = '¼';
  } else if (Math.abs(sisa - 0.5) < 0.05) {
    pecahanTxt = '½';
  } else if (Math.abs(sisa - 0.75) < 0.05) {
    pecahanTxt = '¾';
  } else if (Math.abs(sisa - 0.33) < 0.05) {
    pecahanTxt = '⅓';
  } else if (Math.abs(sisa - 0.66) < 0.05) {
    pecahanTxt = '⅔';
  } else if (sisa >= 0.95) {
    utuh += 1;
    pecahanTxt = '';
  }

  const prefix = num < 0 ? '-' : '';

  let hasilAngka = '';
  if (utuh === 0 && pecahanTxt !== '') {
    hasilAngka = prefix + pecahanTxt;
  } else if (pecahanTxt !== '') {
    hasilAngka = prefix + utuh + ' ' + pecahanTxt;
  } else {
    hasilAngka = prefix + utuh;
  }

  const teksHasil =
    hasilAngka + (unitTxt ? ' ' + unitTxt : ' ikat');

  let colorClass = 'text-emerald-700';
  if (num < 3) {
    colorClass = 'text-rose-600';
  } else if (num === 3) {
    colorClass = 'text-amber-500';
  }

  return {
    text: teksHasil,
    colorClass,
    numericValue: num,
  };
}

// ==========================================
// INTERFACE
// ==========================================
interface VarianItem {
  header: string;
  text: string;
  colorClass: string;
  numericValue: number | null;
}

interface PackagingItem {
  nama: string;
  gramasi: string;
  varian: VarianItem[];
}

interface LowStockItem {
  nama: string;
  header: string;
  text: string;
  numericValue: number | null;
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function DashboardPage() {
  const [kemasanData, setKemasanData] = useState<PackagingItem[]>([]);
  const [lastUpdatePack, setLastUpdatePack] = useState('-');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [lowStockCollapsed, setLowStockCollapsed] = useState(false);

  // ==========================================
  // LOAD DATA GOOGLE SHEETS
  // ==========================================
  const loadStockData = async () => {
    setLoading(true);

    const timestamp = Date.now();

    const csvUrl =
      `https://docs.google.com/spreadsheets/d/1CmfqkuK2w9GDuohbFIandJGLnlZMrwR-19m5hMA7E4E/export?format=csv&gid=0&_cb=${timestamp}`;

    try {
      const response = await fetch(csvUrl, {
        cache: 'no-store',
      });

      const csvText = await response.text();

      const lines = csvText
        .split(/\r?\n/)
        .filter((line) => line.trim() !== '');

      if (lines.length === 0) {
        setKemasanData([]);
        setLoading(false);
        return;
      }

      // LAST UPDATE
      let updateTime = 'Belum Diupdate';
      if (lines.length > 1) {
        const barisKedua = splitCSV(lines[1]);
        if (barisKedua[12] && barisKedua[12].trim() !== '') {
          updateTime = barisKedua[12].trim();
        }
      }
      setLastUpdatePack(updateTime);

      // HEADER VARIAN
      const packHeaders: string[] = [];
      const barisPertama = splitCSV(lines[0]);
      for (let h = 1; h < barisPertama.length; h++) {
        const headName = barisPertama[h]
          ? barisPertama[h].trim()
          : '';
        if (
          !headName ||
          h >= 12 ||
          headName.toLowerCase().includes('update')
        ) {
          break;
        }
        packHeaders.push(headName.toUpperCase());
      }

      // PARSING DATA PRODUK
      const parsedPackaging: PackagingItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const c = splitCSV(lines[i]);
        if (
          !c[0] ||
          c[0].trim() === '' ||
          c[0].toLowerCase() === 'product'
        ) {
          continue;
        }

        const listVarian: VarianItem[] = [];
        for (let vIdx = 0; vIdx < packHeaders.length; vIdx++) {
          const nilaiKolom = c[vIdx + 1];
          const valClean =
            nilaiKolom && nilaiKolom.trim() !== ''
              ? nilaiKolom.trim()
              : '-';
          const formattedData = formatPecahanIkat(valClean);
          if (formattedData !== null) {
            listVarian.push({
              header: packHeaders[vIdx],
              ...formattedData,
            });
          }
        }

        parsedPackaging.push({
          nama: c[0].trim(),
          gramasi: c[1] || '-',
          varian: listVarian,
        });
      }

      setKemasanData(parsedPackaging);
      setLoading(false);
    } catch (err) {
      console.error('Gagal mengambil data kemasan:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  // ==========================================
  // COMPUTE LOW STOCK ITEMS (≤ 3)
  // ==========================================
  const lowStockItems: LowStockItem[] = [];
  for (const pack of kemasanData) {
    for (const v of pack.varian) {
      if (
        v.numericValue !== null &&
        v.numericValue <= 3
      ) {
        lowStockItems.push({
          nama: pack.nama,
          header: v.header,
          text: v.text,
          numericValue: v.numericValue,
        });
      }
    }
  }

  // Sort: abjad nama produk, lalu header
  lowStockItems.sort((a, b) => {
    const nameComp = a.nama.localeCompare(b.nama);
    if (nameComp !== 0) return nameComp;
    return a.header.localeCompare(b.header);
  });

  // ==========================================
  // SPLIT LOW STOCK JADI 2 KOLOM: A–M (kiri) & N–Z (kanan)
  // ==========================================
  const lowStockLeft: LowStockItem[] = [];
  const lowStockRight: LowStockItem[] = [];
  for (const item of lowStockItems) {
    const hurufAwal = item.nama.trim().charAt(0).toUpperCase();
    if (hurufAwal >= 'A' && hurufAwal <= 'M') {
      lowStockLeft.push(item);
    } else {
      lowStockRight.push(item);
    }
  }

  // ==========================================
  // SEARCH
  // ==========================================
  const filteredProducts = kemasanData.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase())
  );

  // ==========================================
  // RENDER CHIP STOK MENIPIS (dipakai di 2 kolom)
  // ==========================================
  const renderLowStockChip = (item: LowStockItem, idx: number) => {
    const isKritis = item.numericValue !== null && item.numericValue < 3;
    return (
      <div
        key={idx}
        className={`
          rounded-md border
          flex items-center gap-1.5
          px-2 py-1
          ${isKritis
            ? 'bg-rose-50 border-rose-200'
            : 'bg-amber-50 border-amber-200'}
        `}
      >
        {/* dot */}
        <span className="text-[9px] leading-none">{isKritis ? '🔴' : '🟡'}</span>

        {/* nama · ukuran */}
        <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
          {item.nama}
        </span>
        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
          {item.header}
        </span>

        {/* divider */}
        <span className="text-slate-300 text-[10px]">·</span>

        {/* stok */}
        <span className={`text-[11px] font-bold whitespace-nowrap ${isKritis ? 'text-rose-600' : 'text-amber-500'}`}>
          {item.text}
        </span>
      </div>
    );
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* ======================================
            HEADER
        ====================================== */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative">

          {/* Refresh Button */}
          <button
            onClick={loadStockData}
            disabled={loading}
            className="
              absolute top-5 right-5
              flex items-center justify-center gap-2
              bg-emerald-600 hover:bg-emerald-700
              text-white font-semibold text-xs
              px-4 py-2.5 rounded-xl
              transition-all shadow-sm active:scale-95
              disabled:opacity-50
            "
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>

          {/* Logo */}
          <div className="flex justify-center">
            <img
              src="/Sarina.png"
              alt="Sarina"
              className="h-16 sm:h-20 w-auto object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center mt-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              📦 Stok Kemasan Sarina
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              📅 Update Terakhir:{' '}
              <span className="font-semibold text-slate-700">
                {lastUpdatePack}
              </span>
            </p>
          </div>

          {/* Catatan */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-2xl mx-auto">
            <p className="text-[11px] sm:text-xs text-amber-800 leading-relaxed font-medium">
              ⚠️{' '}
              <span className="font-bold">Catatan:</span>{' '}
              Perbedaan stok fisik dan sistem dapat terjadi apabila
              terdapat data yang belum diinput oleh petugas packing.
            </p>
          </div>

        </div>

        {/* ======================================
            LOW STOCK SECTION — 2 kolom (A–M kiri, N–Z kanan)
        ====================================== */}
        {!loading && lowStockItems.length > 0 && (
          <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border-b border-rose-100">
              <span className="text-sm">🚨</span>
              <span className="font-bold text-rose-700 text-xs">Stok Menipis</span>
              <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {lowStockItems.length}
              </span>
            </div>

            {/* 2 kolom: kiri A-M, kanan N-Z */}
            <div className="grid grid-cols-2 divide-x divide-rose-100">

              {/* KOLOM KIRI: A–M */}
              <div className="p-2.5">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
                  A – M
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lowStockLeft.length === 0 ? (
                    <span className="text-[10px] text-slate-300 italic px-0.5">-</span>
                  ) : (
                    lowStockLeft.map((item, idx) => renderLowStockChip(item, idx))
                  )}
                </div>
              </div>

              {/* KOLOM KANAN: N–Z */}
              <div className="p-2.5">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
                  N – Z
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lowStockRight.length === 0 ? (
                    <span className="text-[10px] text-slate-300 italic px-0.5">-</span>
                  ) : (
                    lowStockRight.map((item, idx) => renderLowStockChip(item, idx))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ======================================
            SEARCH BAR
        ====================================== */}
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Cari nama produk kemasan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
              w-full bg-white border border-slate-300
              rounded-xl px-4 py-3 text-sm
              focus:outline-none focus:ring-2 focus:ring-slate-800
              shadow-sm
            "
          />
        </div>

        {/* ======================================
            LOADING
        ====================================== */}
        {loading && (
          <div className="
            bg-white p-8 text-center rounded-2xl
            border border-slate-200 shadow-sm
            text-slate-500 text-sm
          ">
            ⏳ Memuat data kemasan langsung dari Google Sheet...
          </div>
        )}

        {/* ======================================
            EMPTY STATE
        ====================================== */}
        {!loading && filteredProducts.length === 0 ? (
          <div className="
            bg-white p-8 text-center rounded-2xl
            border border-slate-200 shadow-sm
            text-slate-500 text-sm
          ">
            {search
              ? 'Produk kemasan tidak ditemukan.'
              : 'Belum ada data kemasan.'}
          </div>
        ) : (

          /* ====================================
             PRODUCT LIST
          ==================================== */
          <div className="space-y-3">
            {!loading &&
              filteredProducts.map((pack, idx) => (
                <div
                  key={idx}
                  className="
                    bg-white p-4 rounded-xl
                    border border-slate-200 shadow-sm
                    hover:border-slate-300 transition-all
                  "
                >
                  {/* Product Name */}
                  <div className="
                    flex justify-between items-center
                    border-b border-slate-100 pb-2 mb-3
                  ">
                    <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                      {pack.nama}
                    </h2>
                  </div>

                  {/* Variants */}
                  {pack.varian.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {pack.varian.map((v, sIdx) => (
                        <div
                          key={sIdx}
                          className={`
                            border rounded-lg p-2.5
                            flex flex-col justify-between
                            ${
                              v.numericValue !== null && v.numericValue <= 3
                                ? 'bg-rose-50/60 border-rose-200'
                                : 'bg-slate-50 border-slate-200'
                            }
                          `}
                        >
                          <span className="
                            text-xs text-slate-500 font-semibold
                            uppercase tracking-wider
                          ">
                            {v.header}
                          </span>
                          <span className={`text-sm sm:text-base font-bold mt-1 ${v.colorClass}`}>
                            {v.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

      </div>
    </div>
  );
}
