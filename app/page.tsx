'use client';

import { useState, useEffect } from 'react';

// HELPER SPLIT CSV
function splitCSV(line: string) {
  const result = [];
  let cur = '';
  let inQuote = false;
  if (!line) return [];
  for (let char of line) {
    if (char === '"') inQuote = !inQuote;
    else if (char === ',' && !inQuote) {
      result.push(cur.trim());
      cur = '';
    } else cur += char;
  }
  result.push(cur.trim());
  return result;
}

// HELPER PARSE PECAHAN & WARNA STOK KEMASAN (Merah < 3, Kuning = 3, Hijau > 3)
function formatPecahanIkat(val: string) {
  if (!val || val === "-" || val.trim() === "" || val.trim() === "0") {
    return null; 
  }
  
  let rawStr = val.toString().trim();
  let unitTxt = rawStr.replace(/[0-9.,-]/g, '').trim();
  let angkaBersih = rawStr.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
  let num = parseFloat(angkaBersih);

  if (isNaN(num)) return { text: rawStr, colorClass: 'text-emerald-700' };

  let utuh = Math.floor(Math.abs(num));
  let sisa = Math.abs(num) - utuh;
  let pecahanTxt = "";

  if (Math.abs(sisa - 0.25) < 0.05) pecahanTxt = "¼";
  else if (Math.abs(sisa - 0.5) < 0.05) pecahanTxt = "½";
  else if (Math.abs(sisa - 0.75) < 0.05) pecahanTxt = "¾";
  else if (Math.abs(sisa - 0.33) < 0.05) pecahanTxt = "⅓";
  else if (Math.abs(sisa - 0.66) < 0.05) pecahanTxt = "⅔";
  else if (sisa >= 0.95) { utuh += 1; pecahanTxt = ""; }

  let prefix = num < 0 ? "-" : "";
  let hasilAngka = "";

  if (utuh === 0 && pecahanTxt !== "") {
    hasilAngka = prefix + pecahanTxt;
  } else if (pecahanTxt !== "") {
    hasilAngka = prefix + utuh + " " + pecahanTxt;
  } else {
    hasilAngka = prefix + utuh;
  }

  let teksHasil = hasilAngka + (unitTxt ? " " + unitTxt : " ikat");

  // Tentukan Warna Berdasarkan Angka
  let colorClass = 'text-emerald-700'; // Hijau (> 3)
  if (num < 3) {
    colorClass = 'text-rose-600';     // Merah (< 3)
  } else if (num === 3) {
    colorClass = 'text-amber-500';    // Kuning (= 3)
  }

  return { text: teksHasil, colorClass };
}

interface VarianItem {
  header: string;
  text: string;
  colorClass: string;
}

interface PackagingItem {
  nama: string;
  gramasi: string;
  varian: VarianItem[];
}

export default function DashboardPage() {
  const [kemasanData, setKemasanData] = useState<PackagingItem[]>([]);
  const [lastUpdatePack, setLastUpdatePack] = useState('-');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStockData = async () => {
    setLoading(true);

    const timestamp = Date.now();
    const csvUrl = https://docs.google.com/spreadsheets/d/1CmfqkuK2w9GDuohbFIandJGLnlZMrwR-19m5hMA7E4E/export?format=csv&gid=0&_cb=${timestamp};

    try {
      const response = await fetch(csvUrl, { cache: 'no-store' });
      const csvText = await response.text();

      const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length === 0) {
        setKemasanData([]);
        setLoading(false);
        return;
      }

      let updateTime = "Belum Diupdate";
      if (lines.length > 1) {
        const barisKedua = splitCSV(lines[1]);
        if (barisKedua[12] && barisKedua[12].trim() !== "") {
          updateTime = barisKedua[12].trim();
        }
      }
      setLastUpdatePack(updateTime);

      const packHeaders: string[] = [];
      const barisPertama = splitCSV(lines[0]);
      for (let h = 1; h < barisPertama.length; h++) {
        let headName = barisPertama[h] ? barisPertama[h].trim() : "";
        if (!headName || h >= 12 || headName.toLowerCase().includes("update")) break;
        packHeaders.push(headName.toUpperCase());
      }

      const parsedPackaging: PackagingItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const c = splitCSV(lines[i]);
        if (!c[0] || c[0].trim() === "" || c[0].toLowerCase() === "product") continue;

        let listVarian: VarianItem[] = [];
        for (let vIdx = 0; vIdx < packHeaders.length; vIdx++) {
          let nilaiKolom = c[vIdx + 1];
          let valClean = (nilaiKolom && nilaiKolom.trim() !== "") ? nilaiKolom.trim() : "-";
          
          let formattedData = formatPecahanIkat(valClean);
          if (formattedData !== null) {
            listVarian.push({ header: packHeaders[vIdx], ...formattedData });
          }
        }

        parsedPackaging.push({
          nama: c[0].trim(),
          gramasi: c[1] || "-",
          varian: listVarian
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

  const filteredProducts = kemasanData.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Header Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              📦 Stok Kemasan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              📅 Update Terakhir: <span className="font-semibold text-slate-700">{lastUpdatePack}</span>
            </p>
          </div>
          
          <button
            onClick={loadStockData}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Cari nama produk kemasan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 shadow-sm"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 shadow-sm text-slate-500 text-sm">
            ⏳ Memuat data kemasan langsung dari Google Sheet...
          </div>
        )}

        {/* Product Cards List */}
        {!loading && filteredProducts.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 shadow-sm text-slate-500 text-sm">
            {search ? 'Produk kemasan tidak ditemukan.' : 'Belum ada data kemasan.'}
          </div>
        ) : (
          <div className="space-y-3">
            {!loading &&
              filteredProducts.map((pack, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                      {pack.nama}
                    </h2>
                  </div>

                  {pack.varian.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {pack.varian.map((v, sIdx) => (
                        <div
                          key={sIdx}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between"
                        >
                          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                            {v.header}
                          </span>
                          <span
                            className={text-sm sm:text-base font-bold mt-1 ${v.colorClass}}
                          >
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
