import Papa from 'papaparse';

export const revalidate = 10;

// Fungsi helper untuk mengubah angka desimal menjadi bentuk pecahan cantik
function formatToFraction(valStr: string): string {
  if (!valStr || valStr === '-' || valStr.trim() === '') return '-';

  // Ambil hanya angka dan koma/titik dari string (misal "2,5 ikat" -> "2.5")
  const cleanedStr = valStr.replace(',', '.').replace(/[^0-9.]/g, '');
  const num = parseFloat(cleanedStr);

  if (isNaN(num) || num === 0) return '-';

  const whole = Math.floor(num);
  const decimal = Math.round((num - whole) * 100) / 100;

  let fractionStr = '';
  if (Math.abs(decimal - 0.25) < 0.05) fractionStr = '¼';
  else if (Math.abs(decimal - 0.5) < 0.05) fractionStr = '½';
  else if (Math.abs(decimal - 0.75) < 0.05) fractionStr = '¾';

  if (fractionStr) {
    return whole > 0 ? `${whole} ${fractionStr}` : fractionStr;
  }

  // Jika bukan kelipatan 0.25, tampilkan angka aslinya
  return String(num).replace('.', ',');
}

async function getSheetData(): Promise<Record<string, string>[]> {
  const csvUrl = process.env.NEXT_PUBLIC_SHEET_CSV_URL;

  if (!csvUrl) {
    console.error("URL CSV Google Sheet belum diatur!");
    return [];
  }

  try {
    const res = await fetch(csvUrl, { next: { revalidate: 10 } });
    if (!res.ok) throw new Error('Gagal mengambil data');

    const csvText = await res.text();

    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err: Error) => reject(err),
      });
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
}

export default async function DashboardPage() {
  const rawData = await getSheetData();

  // 1. Ambil nama header/kolom pertama (yang represents "Product")
  const rawHeaders = rawData.length > 0 ? Object.keys(rawData[0]) : [];
  const productKey = rawHeaders[0] || 'Product';

  // 2. Ambil kolom ukuran (mulai dari kolom kedua ke kanan)
  // Abaikan jika header diawali "_" atau kosong
  const sizeHeaders = rawHeaders.slice(1).filter(
    (header) => header && !header.startsWith('_') && header.trim() !== ''
  );

  // 3. Filter baris data: Ambil hanya baris yang kolom "Product"-nya ada isinya
  const validRows = rawData.filter((row) => {
    const productName = row[productKey]?.trim();
    return productName && productName !== '-' && !productName.toLowerCase().includes('table otomatis');
  });

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Dashboard */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Stok Sarina</h1>
            <p className="text-sm text-slate-500 mt-1">Data dikoneksikan secara realtime dari Google Sheets</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 font-medium text-xs px-3 py-1.5 rounded-full border border-emerald-200 w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Auto-Sync
          </div>
        </div>

        {/* Tabel Data */}
        {validRows.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm text-slate-500">
            Gagal memuat data. Pastikan Environment Variable <code className="bg-slate-100 px-2 py-1 rounded text-slate-800 font-mono text-xs">NEXT_PUBLIC_SHEET_CSV_URL</code> sudah diisi di Vercel.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white uppercase text-xs tracking-wider">
                    {/* Header Produk (Kolom A) */}
                    <th className="px-5 py-4 font-semibold border-b border-slate-700 sticky left-0 bg-slate-800 z-10">
                      Product
                    </th>
                    {/* Header Ukuran (50 gram, 70 gram, dst...) */}
                    {sizeHeaders.map((header) => (
                      <th key={header} className="px-4 py-4 font-semibold border-b border-slate-700 text-center whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {validRows.map((row, idx) => {
                    const productName = row[productKey]?.trim();

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        {/* Kolom Nama Produk */}
                        <td className="px-5 py-3.5 font-semibold text-slate-900 whitespace-nowrap sticky left-0 bg-white hover:bg-slate-50 border-r border-slate-100">
                          {productName}
                        </td>

                        {/* Kolom Isi Stok (Dengan Pecahan Cantik) */}
                        {sizeHeaders.map((header) => {
                          const rawVal = row[header] || '';
                          const formattedVal = formatToFraction(rawVal);
                          const isHasStock = formattedVal !== '-';

                          return (
                            <td key={header} className="px-4 py-3.5 text-center whitespace-nowrap">
                              {isHasStock ? (
                                <span className="inline-block font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
                                  {formattedVal}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
              <span>Menampilkan daftar produk & ukuran otomatis</span>
              <span>Total Produk: <strong className="text-slate-800">{validRows.length}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}