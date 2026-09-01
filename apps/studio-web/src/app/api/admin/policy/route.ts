import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams.toString();
  const res = await fetch(`${API_URL}/v1/admin/policy?${params}`);
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const body: unknown = await req.json();
  const res = await fetch(`${API_URL}/v1/admin/policy`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
