import Papa from 'papaparse';

// Matikan semua bentuk cache di Vercel & Next.js secara total
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper parsing nilai sel Google Sheet
function parseStockValue(valStr: string): string | null {
  if (!valStr || valStr.trim() === '' || valStr.trim() === '-') {
    return null; // Strip (-) atau kosong total -> SEMBUNYIKAN KOTAK
  }

  let clean = valStr.trim();

  // Ambil pola angka di awal teks
  const match = clean.match(/^[\d.,]+/);
  if (!match) return null;

  let numPart = match[0].replace(/[,.]$/, '').replace(',', '.');
  const num = parseFloat(numPart);

  if (isNaN(num)) return null;

  // Jika nilainya murni 0
  if (num === 0) {
    return '0 ikat';
  }

  // Pecahan desimal cantik
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

async function getStockData(): Promise<ProductItem[]> {
  const csvUrl = process.env.NEXT_PUBLIC_SHEET_CSV_URL;
  if (!csvUrl) return [];

  try {
    // Trik panggil Google Sheet langsung dari Vercel Server dengan Timestamp unik
    const separator = csvUrl.includes('?') ? '&' : '?';
    const freshUrl = `${csvUrl}${separator}_t=${Date.now()}`;

    const res = await fetch(freshUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!res.ok) return [];

    const csvText = await res.text();

    return new Promise((resolve) => {
      Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawData = results.data;
          if (rawData.length === 0) return resolve([]);

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
                const valText = parseStockValue(row[size] || '');
                if (valText !== null) {
                  stocks.push({ size, value: valText });
                }
              });

              parsedProducts.push({ name: productName, stocks });
            }
          });

          resolve(parsedProducts);
        },
      });
    });
  } catch (error) {
    console.error('Error fetching server side stock:', error);
    return [];
  }
}

export default async function DashboardPage() {
  // Fetching dilakukan langsung di Server Vercel setiap kali halaman dimuat / direfresh
  const products = await getStockData();

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

        {/* Product Cards List */}
        {products.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 shadow-sm text-slate-500 text-sm">
            Belum ada data stok / Gagal mengambil data dari Google Sheet.
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((prod, idx) => (
              <div
                key={idx}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
              >
                {/* Nama Produk & Info Ukuran */}
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                  <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                    {prod.name}
                  </h2>
                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    {prod.stocks.length} Ukuran Ready
                  </span>
                </div>

                {/* List Stok Ukuran */}
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