import { type NextRequest, NextResponse } from 'next/server';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? '';
  const res = await fetch(`${API_URL}/v1/webhooks/${params.id}/deliveries?workspaceId=${workspaceId}`);
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
