import { type NextRequest, NextResponse } from 'next/server';

const PUBLISH_URL = process.env['NEXT_PUBLIC_PUBLISH_URL'] ?? 'http://localhost:3006';

export async function POST(
  req: NextRequest,
  { params }: { params: { deploymentId: string } },
): Promise<NextResponse> {
  const body: unknown = await req.json();
  const res = await fetch(`${PUBLISH_URL}/publish/${params.deploymentId}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
