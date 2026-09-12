import { type NextRequest, NextResponse } from 'next/server';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId') ?? '';
  const res = await fetch(`${API_URL}/v1/webhooks/${params.id}?workspaceId=${workspaceId}`, {
    method: 'DELETE',
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
