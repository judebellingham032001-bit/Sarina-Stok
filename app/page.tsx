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
// Merah < 3
// Kuning = 3
// Hijau > 3
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

  // Ambil satuan seperti "ikat", "pcs", "pack", dll
  const unitTxt = rawStr
    .replace(/[0-9.,-]/g, '')
    .trim();

  // Ambil angka
  const angkaBersih = rawStr
    .replace(/,/g, '.')
    .replace(/[^0-9.-]/g, '');

  const num = parseFloat(angkaBersih);

  if (isNaN(num)) {
    return {
      text: rawStr,
      colorClass: 'text-emerald-700',
    };
  }

  const utuhAwal = Math.floor(Math.abs(num));
  let utuh = utuhAwal;

  const sisa = Math.abs(num) - utuh;
  let pecahanTxt = '';

  // Konversi desimal ke pecahan Unicode
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

  // ==========================================
  // WARNA STOK
  // ==========================================
  let colorClass = 'text-emerald-700';

  if (num < 3) {
    colorClass = 'text-rose-600';
  } else if (num === 3) {
    colorClass = 'text-amber-500';
  }

  return {
    text: teksHasil,
    colorClass,
  };
}

// ==========================================
// INTERFACE
// ==========================================
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

// ==========================================
// MAIN PAGE
// ==========================================
export default function DashboardPage() {
  const [kemasanData, setKemasanData] = useState<PackagingItem[]>([]);
  const [lastUpdatePack, setLastUpdatePack] = useState('-');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

      // ==========================================
      // LAST UPDATE
      // ==========================================
      let updateTime = 'Belum Diupdate';

      if (lines.length > 1) {
        const barisKedua = splitCSV(lines[1]);

        if (
          barisKedua[12] &&
          barisKedua[12].trim() !== ''
        ) {
          updateTime = barisKedua[12].trim();
        }
      }

      setLastUpdatePack(updateTime);

      // ==========================================
      // HEADER VARIAN
      // ==========================================
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

      // ==========================================
      // PARSING DATA PRODUK
      // ==========================================
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

        for (
          let vIdx = 0;
          vIdx < packHeaders.length;
          vIdx++
        ) {
          const nilaiKolom = c[vIdx + 1];

          const valClean =
            nilaiKolom && nilaiKolom.trim() !== ''
              ? nilaiKolom.trim()
              : '-';

          const formattedData =
            formatPecahanIkat(valClean);

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
      console.error(
        'Gagal mengambil data kemasan:',
        err
      );

      setLoading(false);
    }
  };

  // ==========================================
  // LOAD PERTAMA KALI
  // ==========================================
  useEffect(() => {
    loadStockData();
  }, []);

  // ==========================================
  // SEARCH
  // ==========================================
  const filteredProducts = kemasanData.filter((p) =>
    p.nama
      .toLowerCase()
      .includes(search.toLowerCase())
  );

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
              absolute
              top-5
              right-5
              flex
              items-center
              justify-center
              gap-2
              bg-emerald-600
              hover:bg-emerald-700
              text-white
              font-semibold
              text-xs
              px-4
              py-2.5
              rounded-xl
              transition-all
              shadow-sm
              active:scale-95
              disabled:opacity-50
            "
          >
            <span
              className={
                loading ? 'animate-spin' : ''
              }
            >
              🔄
            </span>

            {loading
              ? 'Refreshing...'
              : 'Refresh Data'}
          </button>

          {/* Logo Center */}
          <div className="flex justify-center">

            <img
              src="/Sarina.png"
              alt="Sarina"
              className="
                h-16
                sm:h-20
                w-auto
                object-contain
              "
            />

          </div>

          {/* Title */}
          <div className="text-center mt-2">

            <h1 className="
              text-xl
              sm:text-2xl
              font-bold
              text-slate-900
            ">
              📦 Stok Kemasan Sarina
            </h1>

            <p className="
              text-xs
              sm:text-sm
              text-slate-500
              mt-1
            ">
              📅 Update Terakhir:{' '}
              <span className="font-semibold text-slate-700">
                {lastUpdatePack}
              </span>
            </p>

          </div>

          {/* Catatan */}
          <div className="
            mt-4
            bg-amber-50
            border
            border-amber-200
            rounded-lg
            px-3
            py-2
            max-w-2xl
            mx-auto
          ">

            <p className="
              text-[11px]
              sm:text-xs
              text-amber-800
              leading-relaxed
              font-medium
            ">
              ⚠️{' '}
              <span className="font-bold">
                Catatan:
              </span>{' '}
              Perbedaan stok fisik dan sistem dapat
              terjadi apabila terdapat data yang belum
              diinput oleh petugas packing.
            </p>

          </div>

        </div>

        {/* ======================================
            SEARCH BAR
        ====================================== */}
        <div className="relative">

          <input
            type="text"
            placeholder="🔍 Cari nama produk kemasan..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="
              w-full
              bg-white
              border
              border-slate-300
              rounded-xl
              px-4
              py-3
              text-sm
              focus:outline-none
              focus:ring-2
              focus:ring-slate-800
              shadow-sm
            "
          />

        </div>

        {/* ======================================
            LOADING
        ====================================== */}
        {loading && (
          <div className="
            bg-white
            p-8
            text-center
            rounded-2xl
            border
            border-slate-200
            shadow-sm
            text-slate-500
            text-sm
          ">
            ⏳ Memuat data kemasan langsung dari
            Google Sheet...
          </div>
        )}

        {/* ======================================
            EMPTY STATE
        ====================================== */}
        {!loading &&
          filteredProducts.length === 0 ? (

          <div className="
            bg-white
            p-8
            text-center
            rounded-2xl
            border
            border-slate-200
            shadow-sm
            text-slate-500
            text-sm
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
              filteredProducts.map(
                (pack, idx) => (

                  <div
                    key={idx}
                    className="
                      bg-white
                      p-4
                      rounded-xl
                      border
                      border-slate-200
                      shadow-sm
                      hover:border-slate-300
                      transition-all
                    "
                  >

                    {/* Product Name */}
                    <div className="
                      flex
                      justify-between
                      items-center
                      border-b
                      border-slate-100
                      pb-2
                      mb-3
                    ">

                      <h2 className="
                        font-bold
                        text-slate-900
                        text-base
                        sm:text-lg
                      ">
                        {pack.nama}
                      </h2>

                    </div>

                    {/* Variants */}
                    {pack.varian.length > 0 && (

                      <div className="
                        grid
                        grid-cols-2
                        sm:grid-cols-3
                        gap-2
                      ">

                        {pack.varian.map(
                          (v, sIdx) => (

                            <div
                              key={sIdx}
                              className="
                                bg-slate-50
                                border
                                border-slate-200
                                rounded-lg
                                p-2.5
                                flex
                                flex-col
                                justify-between
                              "
                            >

                              <span className="
                                text-xs
                                text-slate-500
                                font-semibold
                                uppercase
                                tracking-wider
                              ">
                                {v.header}
                              </span>

                              <span
                                className={`
                                  text-sm
                                  sm:text-base
                                  font-bold
                                  mt-1
                                  ${v.colorClass}
                                `}
                              >
                                {v.text}
                              </span>

                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                )
              )}

          </div>

        )}

      </div>

    </div>
  );
}
