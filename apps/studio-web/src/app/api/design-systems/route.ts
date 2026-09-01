import { NextRequest, NextResponse } from 'next/server';

const DESIGN_URL = process.env['NEXT_PUBLIC_DESIGN_URL'] ?? 'http://localhost:3007';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const wid = req.nextUrl.searchParams.get('workspaceId') ?? 'dev-workspace';
  const res = await fetch(`${DESIGN_URL}/design-systems?workspaceId=${encodeURIComponent(wid)}`);
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body: unknown = await req.json();
  const res = await fetch(`${DESIGN_URL}/design-systems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
