import { type NextRequest, NextResponse } from 'next/server';

const API_URL = process.env['API_URL'] ?? 'http://localhost:4000';

export async function POST(req: NextRequest) {
  const body = await req.json() as unknown;
  const res = await fetch(`${API_URL}/v1/saml/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
