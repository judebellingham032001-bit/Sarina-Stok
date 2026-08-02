import { NextResponse } from 'next/server';

// PAKSA NEXT.JS UNTUK TIDAK MENG-CACHE API INI
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const csvUrl = process.env.NEXT_PUBLIC_SHEET_CSV_URL;

  if (!csvUrl) {
    return NextResponse.json({ error: 'CSV URL belum di-set di env' }, { status: 500 });
  }

  try {
    // Trik panggil Google Sheet pakai timestamp biar Google terpaksa ngasih data detik ini juga
    const freshUrl = `${csvUrl}${csvUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;

    const res = await fetch(freshUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!res.ok) {
      throw new Error(`Gagal fetch Google Sheet: ${res.statusText}`);
    }

    const csvText = await res.text();

    return new NextResponse(csvText, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error in API stocks:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}