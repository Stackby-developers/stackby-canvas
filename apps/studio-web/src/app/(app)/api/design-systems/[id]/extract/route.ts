import { NextRequest, NextResponse } from 'next/server';

const DESIGN_URL = process.env['NEXT_PUBLIC_DESIGN_URL'] ?? 'http://localhost:3007';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const res = await fetch(`${DESIGN_URL}/design-systems/${params.id}/extract`, {
    method: 'POST',
  });
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
