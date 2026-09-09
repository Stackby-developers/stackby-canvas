import { NextResponse } from 'next/server';

const GIT_URL = process.env['NEXT_PUBLIC_GIT_URL'] ?? 'http://localhost:3008';

export async function GET(
  _req: Request,
  { params }: { params: { linkId: string } },
): Promise<NextResponse> {
  const res = await fetch(`${GIT_URL}/git/sync/${params.linkId}`);
  const data: unknown = await res.json();
  return NextResponse.json(data, { status: res.status });
}
