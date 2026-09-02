import { NextRequest, NextResponse } from 'next/server';

const DESIGN_URL = process.env['NEXT_PUBLIC_DESIGN_URL'] ?? 'http://localhost:3007';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const res = await fetch(`${DESIGN_URL}/design-systems/${params.id}`);
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const body: unknown = await req.json();
  const res = await fetch(`${DESIGN_URL}/design-systems/${params.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
