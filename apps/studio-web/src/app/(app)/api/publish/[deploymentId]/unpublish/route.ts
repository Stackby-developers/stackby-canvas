import { type NextRequest, NextResponse } from 'next/server';

const PUBLISH_URL = process.env['NEXT_PUBLIC_PUBLISH_URL'] ?? 'http://localhost:3006';

export async function POST(
  _req: NextRequest,
  { params }: { params: { deploymentId: string } },
): Promise<NextResponse> {
  const res = await fetch(`${PUBLISH_URL}/publish/${params.deploymentId}/unpublish`, {
    method: 'POST',
  });
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
