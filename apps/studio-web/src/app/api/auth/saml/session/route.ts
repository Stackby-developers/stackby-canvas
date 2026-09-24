import { type NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const apiUrl = process.env['API_URL'] ?? 'http://localhost:4000';
  const samlToken = req.nextUrl.searchParams.get('saml_token');
  if (!samlToken) {
    return NextResponse.json({ error: 'Missing saml_token' }, { status: 400 });
  }
  const res = await fetch(`${apiUrl}/v1/saml/session?saml_token=${encodeURIComponent(samlToken)}`);
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
