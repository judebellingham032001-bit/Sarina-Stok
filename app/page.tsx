'use client';

import { useState, useEffect } from 'react';

// HELPER PARSE NILAI STOK
function parseStockValue(valStr: any): string | null {
  if (valStr === null || valStr === undefined) return null;
  
  let clean = String(valStr).trim();
  if (clean === '' || clean === '-') return null; // Strip/Kosong -> SEMBUNYIKAN KOTAK

  // Ambil pola angka
  const match = clean.match(/^[\d.,]+/);
  if (!match) return null;

  let numPart = match[0].replace(/[,.]$/, '').replace(',', '.');
  const num = parseFloat(numPart);

  if (isNaN(num)) return null;

  // Jika 0 murni
  if (num === 0) {
    return '0 ikat';
  }

  // Desimal cantik (½, ¼, ¾)
  const whole = Math.floor(num);
  const decimal = Math.round((num - whole) * 100) / 100;

  let fractionStr = '';
  if (Math.abs(decimal - 0.25) < 0.05) fractionStr = '¼';
  else if (Math.abs(decimal - 0.5) < 0.05) fractionStr = '½';
  else if (Math.abs(decimal - 0.75) < 0.05) fractionStr = '¾';

  let finalValue = '';
  if (fractionStr) {
    finalValue = whole > 0 ? `${whole} ${fractionStr}` : fractionStr;
  } else {
    finalValue = String(num).replace('.', ',');
  }

  return `${finalValue} ikat`;
}

// Helper untuk mengekstrak Spreadsheet ID dari URL apapun
function getSpreadsheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

interface ProductItem {
  name: string;
  stocks: { size: string; value: string }[];
}

export default function DashboardPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStockData = async () => {
    setLoading(true);
    const rawUrl = process.env.NEXT_PUBLIC_SHEET_CSV_URL || '';
    const sheetId = getSpreadsheetId(rawUrl);

    if (!sheetId) {
      console.error('Spreadsheet ID tidak ditemukan dari ENV!');
      setLoading(false);
      return;
    }

    try {
      // PANGGIL GVIZ API (Tembak langsung ke Live Memory Google Sheet, Bypass CDN Cache 100%)
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&_t=${Date.now()}`;
      
      const response = await fetch(gvizUrl, { cache: 'no-store' });
      const textData = await response.text();

      // Parse JSONP bawaan Google GViz
      const jsonString = textData.substring(47, textData.length - 2);
      const json = JSON.parse(jsonString);

      const table = json.table;
      if (!table || !table.rows || table.rows.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Ambil Header (Ukuran: 50 GRAM, 70 GRAM, dll)
      const headers: string[] = table.cols.map((col: any) => col.label || '');
      const parsedProducts: ProductItem[] = [];

      // Ambil Data Baris
      table.rows.forEach((row: any) => {
        const cells = row.c;
        if (!cells || cells.length === 0) return;

        const productName = cells[0]?.v ? String(cells[0].v).trim() : '';

        if (
          productName &&
          productName !== '-' &&
          !productName.toLowerCase().includes('table otomatis')
        ) {
          const stocks: { size: string; value: string }[] = [];

          for (let colIdx = 1; colIdx < headers.length; colIdx++) {
            const sizeName = headers[colIdx]?.trim();
            if (!sizeName || sizeName.startsWith('_')) continue;

            const rawVal = cells[colIdx]?.v ?? cells[colIdx]?.f ?? null;
            const parsedVal = parseStockValue(rawVal);

            if (parsedVal !== null) {
              stocks.push({ size: sizeName, value: parsedVal });
            }
          }

          parsedProducts.push({ name: productName, stocks });
        }
      });

      setProducts(parsedProducts);
      setLoading(false);
    } catch (err) {
      console.error('Gagal mengambil data dari Google Sheet GViz:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Header Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              📦 Dashboard Stok Sarina
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Tampilan list stok khusus staff
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
            placeholder="🔍 Cari nama produk (contoh: Almond)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 shadow-sm"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 shadow-sm text-slate-500 text-sm">
            ⏳ Memuat data langsung dari memori Google Sheet...
          </div>
        )}

        {/* Product Cards List */}
        {!loading && filteredProducts.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 shadow-sm text-slate-500 text-sm">
            {search ? 'Produk tidak ditemukan.' : 'Belum ada data stok.'}
          </div>
        ) : (
          <div className="space-y-3">
            {!loading &&
              filteredProducts.map((prod, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                      {prod.name}
                    </h2>
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      {prod.stocks.length} Ukuran Ready
                    </span>
                  </div>

                  {prod.stocks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Belum ada ukuran aktif untuk produk ini
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {prod.stocks.map((stk, sIdx) => (
                        <div
                          key={sIdx}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between"
                        >
                          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                            {stk.size}
                          </span>
                          <span
                            className={`text-sm sm:text-base font-bold mt-1 ${
                              stk.value === '0 ikat'
                                ? 'text-rose-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {stk.value}
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