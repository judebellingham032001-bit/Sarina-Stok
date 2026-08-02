import { NextResponse } from 'next/server';

export const revalidate = 0; // Matikan cache Next.js sepenuhnya

export async function GET() {
  const csvUrl = process.env.NEXT_PUBLIC_SHEET_CSV_URL;

  if (!csvUrl) {
    return NextResponse.json({ error: 'CSV URL not configured' }, { status: 500 });
  }

  try {
    // Tambahkan timestamp unik di query string agar Google & Server terpaksa membaca file terbaru
    const timestamp = Date.now();
    const separator = csvUrl.includes('?') ? '&' : '?';
    const targetUrl = `${csvUrl}${separator}_t=${timestamp}`;

    const res = await fetch(targetUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch CSV: ${res.statusText}`);
    }

    const csvText = await res.text();

    return new NextResponse(csvText, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error fetching sheet CSV:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}