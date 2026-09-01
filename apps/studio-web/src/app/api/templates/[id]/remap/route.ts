import { NextRequest, NextResponse } from 'next/server';

const ORCHESTRATOR_URL = process.env['NEXT_PUBLIC_ORCHESTRATOR_URL'] ?? 'http://localhost:3004';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const body: unknown = await req.json();
  const res = await fetch(`${ORCHESTRATOR_URL}/templates/${params.id}/remap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
