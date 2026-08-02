import Papa from 'papaparse';

// Revalidate data tiap 10 detik agar tampilan tetap up-to-date
export const revalidate = 10;

async function getSheetData() {
  const csvUrl = process.env.NEXT_PUBLIC_SHEET_CSV_URL;

  if (!csvUrl) {
    console.error("URL CSV Google Sheet belum diatur di .env.local!");
    return [];
  }

  try {
    const res = await fetch(csvUrl, { next: { revalidate: 10 } });
    if (!res.ok) throw new Error('Gagal mengambil data dari Google Sheets');

    const csvText = await res.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err),
      });
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
}

export default async function DashboardPage() {
  const data = await getSheetData();
  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 text-slate-800">
      <div className="max-w-6xl mx-auto">
        {/* Header Dashboard */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4 border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Live Google Sheet</h1>
            <p className="text-sm text-slate-500 mt-1">Data otomatis ditarik langsung dari CSV Google Sheets</p>
          </div>
          <div className="text-xs bg-emerald-100 text-emerald-800 font-medium px-3 py-1.5 rounded-full w-fit">
            ● Live Connected
          </div>
        </div>

        {/* Tabel Data */}
        {data.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-lg border border-slate-200 shadow-sm text-slate-500">
            Belum ada data atau gagal memuat URL CSV Google Sheet. Pastikan .env.local sudah diisi dengan benar.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase text-xs font-semibold">
                    {headers.map((header) => (
                      <th key={header} className="px-4 py-3">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      {headers.map((header) => (
                        <td key={header} className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {row[header] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-right">
              Total Data: <span className="font-semibold text-slate-700">{data.length}</span> Baris
            </div>
          </div>
        )}
      </div>
    </div>
  );
}