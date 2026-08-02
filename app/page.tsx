'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';

// Helper super tangguh untuk membaca segala bentuk format dari Google Sheets
function formatStockValue(valStr: string): string {
  if (!valStr || valStr === '-' || valStr.trim() === '') return '';

  let clean = valStr.trim();

  // 1. Ambil bagian angka pertama yang ditemukan (termasuk koma/titik desimal)
  // Contoh: "122, ikat" -> "122,", "2,5 ikat" -> "2,5"
  const match = clean.match(/^[\d.,]+/);
  if (!match) return '';

  let numPart = match[0];

  // Jika ada koma nyangkut di paling akhir angka (misal "122," atau "2,"), buang komanya
  numPart = numPart.replace(/[,.]$/, '');

  // Ubah koma desimal Indonesia menjadi titik desimal standar
  numPart = numPart.replace(',', '.');

  const num = parseFloat(numPart);
  if (isNaN(num) || num === 0) return '';

  // 2. Format Pecahan Cantik (misal 2.5 -> 2 ½)
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

interface ProductItem {
  name: string;
  stocks: { size: string; value: string }[];
}

export default function DashboardPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const csvUrl = process.env.NEXT_PUBLIC_SHEET_CSV_URL;
      if (!csvUrl) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(csvUrl, { cache: 'no-store' });
        const csvText = await res.text();

        Papa.parse<Record<string, string>>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const rawData = results.data;
            if (rawData.length === 0) {
              setLoading(false);
              return;
            }

            const rawHeaders = Object.keys(rawData[0]);
            const productKey = rawHeaders[0];
            const sizeHeaders = rawHeaders.slice(1).filter(
              (h) => h && !h.startsWith('_') && h.trim() !== ''
            );

            const parsedProducts: ProductItem[] = [];

            rawData.forEach((row) => {
              const productName = row[productKey]?.trim();
              if (
                productName &&
                productName !== '-' &&
                !productName.toLowerCase().includes('table otomatis')
              ) {
                const stocks: { size: string; value: string }[] = [];

                sizeHeaders.forEach((size) => {
                  const val = formatStockValue(row[size] || '');
                  if (val) {
                    stocks.push({ size, value: val });
                  }
                });

                parsedProducts.push({ name: productName, stocks });
              }
            });

            setProducts(parsedProducts);
            setLoading(false);
          },
        });
      } catch (err) {
        console.error('Error fetching CSV:', err);
        setLoading(false);
      }
    }

    fetchData();
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
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 font-medium text-xs px-3 py-1.5 rounded-full border border-emerald-200 w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Auto-Sync
          </div>
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
            Memuat data stok terbaru...
          </div>
        )}

        {/* Product Cards List */}
        {!loading && filteredProducts.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 shadow-sm text-slate-500 text-sm">
            {search ? 'Produk tidak ditemukan.' : 'Belum ada data stok.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((prod, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
              >
                {/* Nama Produk */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                  <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                    {prod.name}
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    {prod.stocks.length} Ukuran Ready
                  </span>
                </div>

                {/* List Stok Ukuran */}
                {prod.stocks.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    Stok kemasan kosong / habis
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {prod.stocks.map((stk, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex flex-col justify-between"
                      >
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                          {stk.size}
                        </span>
                        <span className="text-sm sm:text-base font-bold text-emerald-700 mt-1">
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