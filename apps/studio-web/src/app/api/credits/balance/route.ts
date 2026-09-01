import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams.toString();
  const res = await fetch(`${API_URL}/v1/credits/balance?${params}`);
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
