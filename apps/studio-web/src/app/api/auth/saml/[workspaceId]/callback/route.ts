import { type NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceId: string } },
) {
  const apiUrl = process.env['API_URL'] ?? 'http://localhost:4000';
  const body = await req.text();

  const apiRes = await fetch(`${apiUrl}/v1/saml/${params.workspaceId}/callback`, {
    method: 'POST',
    headers: { 'Content-Type': req.headers.get('content-type') ?? 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual',
  });

  // The API responds with a 302 redirect to /connect/saml-complete
  if (apiRes.status === 302 || apiRes.status === 301) {
    const location = apiRes.headers.get('location');
    if (location) {
      return NextResponse.redirect(location, { status: 302 });
    }
  }

  const text = await apiRes.text();
  return new NextResponse(text, { status: apiRes.status, headers: { 'Content-Type': 'application/json' } });
}
